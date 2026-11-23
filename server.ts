import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  ASSETS_IMG_DIR,
  saveBase64ImageToAssetsImg,
} from './server/imageStorage';
import {
  isValidOrderStatus,
  loadDatabase,
  saveDatabase,
} from './server/storeData';
import {
  buildCustomerOrderWhatsappMessage,
  buildWhatsappUrl,
  formatRupiah,
  generateOrderCode,
} from './src/utils/storeLogic';
import type {
  AdminNotification,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  Review,
  StoreSettings,
} from './src/types/store';

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin44225566';
const adminSessions = new Set<string>();

function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau sudah berakhir.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  // Ensure initial store.json and /assets/img exist on boot
  loadDatabase();
  if (!fs.existsSync(ASSETS_IMG_DIR)) {
    fs.mkdirSync(ASSETS_IMG_DIR, { recursive: true });
  }
  app.use('/assets/img', express.static(ASSETS_IMG_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public Storefront endpoint (no login required for customers)
  app.get('/api/storefront', (_req, res) => {
    const db = loadDatabase();
    res.json({
      products: db.products.filter((p) => p.active),
      settings: db.settings,
      reviews: db.reviews || [],
    });
  });

  // Submit customer rating & review after placing an order
  app.post('/api/reviews', (req, res) => {
    const {
      orderCode,
      customerName,
      itemsSummary,
      rating,
      comment,
    } = req.body as {
      orderCode?: string;
      customerName?: string;
      itemsSummary?: string;
      rating?: number;
      comment?: string;
    };

    const parsedRating = Math.round(Number(rating));
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      res.status(400).json({ error: 'Pilih rating antara 1 sampai 5 bintang.' });
      return;
    }

    if (!orderCode?.trim() || !customerName?.trim()) {
      res.status(400).json({ error: 'Data pesanan untuk ulasan tidak lengkap.' });
      return;
    }

    const cleanComment = (comment || '').trim();
    if (cleanComment.length < 4) {
      res.status(400).json({ error: 'Tuliskan ulasan singkat minimal 4 karakter.' });
      return;
    }

    const db = loadDatabase();
    const alreadyReviewed = db.reviews.some((r) => r.orderCode === orderCode.trim());
    if (alreadyReviewed) {
      res.status(409).json({ error: 'Pesanan ini sudah pernah diberikan ulasan.' });
      return;
    }

    const matchedOrder = db.orders.find((o) => o.orderCode === orderCode.trim());
    const resolvedItemsSummary =
      itemsSummary?.trim() ||
      (matchedOrder ? matchedOrder.items.map((i) => i.name).join(', ') : 'Menu Dapur Hangat');

    const now = new Date().toISOString();
    const newReview: Review = {
      id: `rev-${crypto.randomBytes(4).toString('hex')}`,
      orderCode: orderCode.trim(),
      customerName: customerName.trim(),
      itemsSummary: resolvedItemsSummary,
      rating: parsedRating,
      comment: cleanComment,
      createdAt: now,
    };

    if (matchedOrder) {
      matchedOrder.review = {
        rating: parsedRating,
        comment: cleanComment,
        createdAt: now,
      };
    }

    db.reviews.unshift(newReview);
    saveDatabase(db);

    res.status(201).json({ review: newReview });
  });

  // Sync live status for customer's localStorage order history by orderCode
  app.get('/api/orders/statuses', (req, res) => {
    const rawCodes = typeof req.query.codes === 'string' ? req.query.codes : '';
    const codes = rawCodes
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (!codes.length) {
      res.json({ statuses: [] });
      return;
    }
    const db = loadDatabase();
    const statuses = db.orders
      .filter((order) => codes.includes(order.orderCode))
      .map((order) => ({
        orderCode: order.orderCode,
        status: order.status,
      }));
    res.json({ statuses });
  });

  // Create customer order, decrement stock atomically, and trigger Admin WhatsApp notification record
  app.post('/api/orders', (req, res) => {
    const {
      customerName,
      customerPhone,
      customerAddress,
      notes = '',
      items,
      paymentMethod,
      selectedBankId,
      selectedEWalletId,
      paymentProofDataUrl,
      paymentProofName,
    } = req.body as {
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      notes?: string;
      items?: { productId: string; quantity: number }[];
      paymentMethod?: PaymentMethod;
      selectedBankId?: string;
      selectedEWalletId?: string;
      paymentProofDataUrl?: string;
      paymentProofName?: string;
    };

    if (!customerName?.trim() || !customerPhone?.trim() || !customerAddress?.trim()) {
      res.status(400).json({
        error: 'Nama lengkap, nomor WhatsApp, dan alamat pengiriman wajib diisi.',
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Keranjang belanja masih kosong.' });
      return;
    }

    const allowedMethods: PaymentMethod[] = ['QRIS', 'Transfer Bank', 'E-Wallet', 'COD'];
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
      res.status(400).json({ error: 'Pilih metode pembayaran yang valid.' });
      return;
    }

    const db = loadDatabase();
    const resolvedItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const requested of items) {
      const product = db.products.find((p) => p.id === requested.productId);
      if (!product || !product.active) {
        res.status(400).json({ error: 'Salah satu produk tidak lagi tersedia.' });
        return;
      }
      const qty = Math.floor(Number(requested.quantity));
      if (!Number.isFinite(qty) || qty <= 0) {
        res.status(400).json({ error: `Jumlah pesanan untuk ${product.name} tidak valid.` });
        return;
      }
      if (product.stock < qty) {
        res.status(409).json({
          error: `Stok ${product.name} tersisa ${product.stock}, tidak cukup untuk ${qty} item.`,
        });
        return;
      }
      resolvedItems.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: qty,
        unitLabel: product.unitLabel,
      });
      totalAmount += product.price * qty;
    }

    // Decrement product stocks
    for (const item of resolvedItems) {
      const target = db.products.find((p) => p.id === item.productId);
      if (target) {
        target.stock = Math.max(0, target.stock - item.quantity);
      }
    }

    let paymentAccountSummary = '';
    if (paymentMethod === 'QRIS') {
      paymentAccountSummary = `QRIS ${db.settings.qrisMerchantName}`;
    } else if (paymentMethod === 'Transfer Bank') {
      const bank =
        db.settings.bankAccounts.find((b) => b.id === selectedBankId) ||
        db.settings.bankAccounts[0];
      paymentAccountSummary = bank
        ? `${bank.bankName} ${bank.accountNumber} a.n. ${bank.accountHolder}`
        : 'Transfer Bank Toko';
    } else if (paymentMethod === 'E-Wallet') {
      const ew =
        db.settings.eWallets.find((w) => w.id === selectedEWalletId) ||
        db.settings.eWallets[0];
      paymentAccountSummary = ew
        ? `${ew.provider} ${ew.number} a.n. ${ew.accountHolder}`
        : 'E-Wallet Toko';
    } else {
      paymentAccountSummary = 'Bayar di Tempat (COD)';
    }

    const hasPaymentProof = Boolean(paymentProofDataUrl && paymentProofDataUrl.startsWith('data:image/'));
    const orderCode = generateOrderCode();
    const orderId = crypto.randomUUID();

    const whatsappMessage = buildCustomerOrderWhatsappMessage({
      orderCode,
      storeName: db.settings.storeName,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      notes: notes.trim(),
      items: resolvedItems,
      totalAmount,
      paymentMethod,
      paymentAccountSummary,
      hasPaymentProof,
    });

    const initialStatus: OrderStatus = hasPaymentProof
      ? 'Menunggu Verifikasi'
      : paymentMethod === 'COD'
        ? 'Diproses'
        : 'Menunggu Pembayaran';

    const newOrder: Order = {
      id: orderId,
      orderCode,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      notes: notes.trim(),
      items: resolvedItems,
      totalAmount,
      paymentMethod,
      selectedBankId,
      selectedEWalletId,
      paymentAccountSummary,
      paymentProofDataUrl: hasPaymentProof ? paymentProofDataUrl : undefined,
      paymentProofName: hasPaymentProof ? paymentProofName || 'bukti-pembayaran.png' : undefined,
      status: initialStatus,
      whatsappNotificationSent: true,
      whatsappMessage,
    };

    const notification: AdminNotification = {
      id: crypto.randomUUID(),
      orderId,
      orderCode,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      paymentMethod,
      totalAmount,
      hasPaymentProof,
      messagePreview: hasPaymentProof
        ? `Notifikasi WA otomatis: ${newOrder.customerName} mengirim tangkapan layar bukti bayar ${paymentMethod} (${formatRupiah(totalAmount)}).`
        : `Pesanan baru ${orderCode} dari ${newOrder.customerName} (${formatRupiah(totalAmount)}) via ${paymentMethod}.`,
      createdAt: newOrder.createdAt,
      read: false,
    };

    db.orders.unshift(newOrder);
    db.notifications.unshift(notification);
    db.notifications = db.notifications.slice(0, 50);
    saveDatabase(db);

    const whatsappUrl = buildWhatsappUrl(db.settings.adminWhatsapp, whatsappMessage);

    res.status(201).json({
      order: newOrder,
      whatsappUrl,
      notification,
    });
  });

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body as { password?: string };
    if (!password || password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Kata sandi admin salah.' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    adminSessions.add(token);
    res.json({ token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) adminSessions.delete(token);
    res.json({ ok: true });
  });

  // Admin Dashboard Data
  app.get('/api/admin/dashboard', requireAdminAuth, (_req, res) => {
    const db = loadDatabase();
    res.json(db);
  });

  // Admin: Create Product (with optional uploaded image saved into /assets/img)
  app.post('/api/admin/products', requireAdminAuth, (req, res) => {
    const {
      name,
      category,
      price,
      stock,
      unitLabel,
      description,
      imageUrl,
      imageDataUrl,
      featured,
    } = req.body as Partial<Product> & { imageDataUrl?: string };
    if (!name?.trim() || !category || price == null || stock == null) {
      res.status(400).json({ error: 'Nama, kategori, harga, dan stok produk wajib diisi.' });
      return;
    }
    if (category !== 'Dimsum' && category !== 'Kripik Pisang Coklat') {
      res.status(400).json({ error: 'Kategori harus Dimsum atau Kripik Pisang Coklat.' });
      return;
    }

    let resolvedImageUrl = imageUrl?.trim() || '';
    if (typeof imageDataUrl === 'string' && imageDataUrl.trim()) {
      const savedPath = saveBase64ImageToAssetsImg(imageDataUrl, name.trim());
      if (!savedPath) {
        res.status(400).json({ error: 'Format gambar tidak valid. Gunakan PNG, JPG, atau WEBP.' });
        return;
      }
      resolvedImageUrl = savedPath;
    }

    const db = loadDatabase();
    const defaultImg =
      category === 'Dimsum'
        ? '/src/assets/images/dimsum_ayam_original_1795090633232.jpg'
        : '/src/assets/images/kripik_coklat_lumer_1795090641883.jpg';

    const newProduct: Product = {
      id: `prod-${crypto.randomBytes(4).toString('hex')}`,
      name: name.trim(),
      category,
      price: Math.max(0, Math.round(Number(price))),
      stock: Math.max(0, Math.round(Number(stock))),
      unitLabel: unitLabel?.trim() || '1 Paket',
      description: description?.trim() || 'Produk olahan segar Dapur Hangat.',
      imageUrl: resolvedImageUrl || defaultImg,
      featured: Boolean(featured),
      active: true,
    };

    db.products.unshift(newProduct);
    saveDatabase(db);
    res.status(201).json({ product: newProduct });
  });

  // Admin: Update Product (stock, price, active, featured, image, details)
  app.patch('/api/admin/products/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const product = db.products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }

    const updates = req.body as Partial<Product> & { imageDataUrl?: string };
    if (typeof updates.name === 'string' && updates.name.trim()) {
      product.name = updates.name.trim();
    }
    if (updates.category === 'Dimsum' || updates.category === 'Kripik Pisang Coklat') {
      product.category = updates.category;
    }
    if (typeof updates.price === 'number' && Number.isFinite(updates.price)) {
      product.price = Math.max(0, Math.round(updates.price));
    }
    if (typeof updates.stock === 'number' && Number.isFinite(updates.stock)) {
      product.stock = Math.max(0, Math.round(updates.stock));
    }
    if (typeof updates.unitLabel === 'string' && updates.unitLabel.trim()) {
      product.unitLabel = updates.unitLabel.trim();
    }
    if (typeof updates.description === 'string') {
      product.description = updates.description.trim();
    }
    if (typeof updates.imageDataUrl === 'string' && updates.imageDataUrl.trim()) {
      const savedPath = saveBase64ImageToAssetsImg(updates.imageDataUrl, product.name);
      if (!savedPath) {
        res.status(400).json({ error: 'Format gambar tidak valid. Gunakan PNG, JPG, atau WEBP.' });
        return;
      }
      product.imageUrl = savedPath;
    } else if (typeof updates.imageUrl === 'string' && updates.imageUrl.trim()) {
      product.imageUrl = updates.imageUrl.trim();
    }
    if (typeof updates.featured === 'boolean') {
      product.featured = updates.featured;
    }
    if (typeof updates.active === 'boolean') {
      product.active = updates.active;
    }

    saveDatabase(db);
    res.json({ product });
  });

  // Admin: Delete Product
  app.delete('/api/admin/products/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = loadDatabase();
    const before = db.products.length;
    db.products = db.products.filter((p) => p.id !== id);
    if (db.products.length === before) {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Admin: Update Order Status
  app.patch('/api/admin/orders/:id/status', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };
    if (!status || !isValidOrderStatus(status)) {
      res.status(400).json({ error: 'Status pesanan tidak valid.' });
      return;
    }

    const db = loadDatabase();
    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }

    const previousStatus = order.status;
    // Restore stock if cancelling an active order
    if (previousStatus !== 'Dibatalkan' && status === 'Dibatalkan') {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          product.stock += item.quantity;
        }
      }
    }

    order.status = status;
    saveDatabase(db);
    res.json({ order });
  });

  // Admin: Mark Notifications Read
  app.patch('/api/admin/notifications/read', requireAdminAuth, (_req, res) => {
    const db = loadDatabase();
    db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Admin: Update Store & Payment Settings (WA, QRIS Image, Bank Accounts, E-Wallets)
  app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
    const incoming = req.body as Partial<StoreSettings>;
    const db = loadDatabase();

    if (typeof incoming.storeName === 'string' && incoming.storeName.trim()) {
      db.settings.storeName = incoming.storeName.trim();
    }
    if (typeof incoming.adminWhatsapp === 'string' && incoming.adminWhatsapp.trim()) {
      db.settings.adminWhatsapp = incoming.adminWhatsapp.trim();
    }
    if (typeof incoming.qrisImageUrl === 'string' && incoming.qrisImageUrl.trim()) {
      db.settings.qrisImageUrl = incoming.qrisImageUrl.trim();
    }
    if (typeof incoming.qrisMerchantName === 'string' && incoming.qrisMerchantName.trim()) {
      db.settings.qrisMerchantName = incoming.qrisMerchantName.trim();
    }
    if (Array.isArray(incoming.bankAccounts)) {
      db.settings.bankAccounts = incoming.bankAccounts.filter(
        (b) => b.bankName?.trim() && b.accountNumber?.trim() && b.accountHolder?.trim(),
      );
    }
    if (Array.isArray(incoming.eWallets)) {
      db.settings.eWallets = incoming.eWallets.filter(
        (w) => w.provider?.trim() && w.number?.trim() && w.accountHolder?.trim(),
      );
    }
    if (typeof incoming.codNote === 'string') {
      db.settings.codNote = incoming.codNote.trim();
    }

    saveDatabase(db);
    res.json({ settings: db.settings });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
