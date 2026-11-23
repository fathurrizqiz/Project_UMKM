import type {
  CartItem,
  CategoryFilter,
  Order,
  OrderReview,
  PaymentMethod,
  Product,
  Review,
  SortOption,
  StoreSettings,
} from '../types/store';

export const ORDER_HISTORY_STORAGE_KEY = 'dapur_hangat_order_history_v1';
export const THEME_STORAGE_KEY = 'dapur_hangat_theme_v1';

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rp ${safe.toLocaleString('id-ID')}`;
}

export function normalizeWhatsappNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

export function filterAndSortProducts(
  products: Product[],
  options: {
    category: CategoryFilter;
    searchQuery: string;
    sortBy: SortOption;
    includeInactive?: boolean;
  },
): Product[] {
  const query = options.searchQuery.trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (!options.includeInactive && !product.active) {
      return false;
    }
    if (options.category !== 'Semua' && product.category !== options.category) {
      return false;
    }
    if (query) {
      const haystack = `${product.name} ${product.category} ${product.description} ${product.unitLabel}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  if (options.sortBy === 'cheapest') {
    return [...filtered].sort((a, b) => a.price - b.price);
  }
  if (options.sortBy === 'expensive') {
    return [...filtered].sort((a, b) => b.price - a.price);
  }
  return filtered;
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function upsertCartItem(
  cart: CartItem[],
  product: Product,
  deltaQuantity: number,
): CartItem[] {
  if (product.stock <= 0 || !product.active) {
    return cart.filter((item) => item.productId !== product.id);
  }

  const existing = cart.find((item) => item.productId === product.id);
  if (!existing) {
    if (deltaQuantity <= 0) return cart;
    const clampedQty = Math.min(deltaQuantity, product.stock);
    return [
      ...cart,
      {
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: clampedQty,
        unitLabel: product.unitLabel,
        imageUrl: product.imageUrl,
        maxStock: product.stock,
      },
    ];
  }

  const nextQty = existing.quantity + deltaQuantity;
  if (nextQty <= 0) {
    return cart.filter((item) => item.productId !== product.id);
  }

  return cart.map((item) =>
    item.productId === product.id
      ? {
          ...item,
          quantity: Math.min(nextQty, product.stock),
          price: product.price,
          maxStock: product.stock,
        }
      : item,
  );
}

export function generateOrderCode(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DH-${yy}${mm}${dd}-${rand}`;
}

export function buildCustomerOrderWhatsappMessage(params: {
  orderCode: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: { name: string; quantity: number; price: number; unitLabel: string }[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentAccountSummary?: string;
  hasPaymentProof: boolean;
}): string {
  const itemLines = params.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name} (${item.unitLabel}) x${item.quantity} = ${formatRupiah(
          item.price * item.quantity,
        )}`,
    )
    .join('\n');

  const proofNotice = params.hasPaymentProof
    ? 'Status Bukti Pembayaran: SUDAH DIUNGGAH (tangkapan layar terlampir pada sistem pesanan, siap dicek Admin).'
    : params.paymentMethod === 'COD'
      ? 'Status Pembayaran: Bayar di Tempat (COD) saat pesanan tiba.'
      : 'Status Bukti Pembayaran: Belum dilampirkan — mohon kirim tangkapan layar transfer di chat ini.';

  const accountLine = params.paymentAccountSummary
    ? `Tujuan Pembayaran: ${params.paymentAccountSummary}\n`
    : '';

  const notesLine = params.notes?.trim() ? `Catatan: ${params.notes.trim()}\n` : '';

  return [
    `*NOTIFIKASI PESANAN BARU - ${params.storeName.toUpperCase()}*`,
    `Kode Pesanan: *${params.orderCode}*`,
    '',
    '*Detail Pelanggan:*',
    `Nama: ${params.customerName}`,
    `No. WhatsApp: ${params.customerPhone}`,
    `Alamat: ${params.customerAddress}`,
    notesLine.trimEnd(),
    '',
    '*Daftar Pesanan:*',
    itemLines,
    '',
    `*Total Tagihan: ${formatRupiah(params.totalAmount)}*`,
    `Metode Pembayaran: ${params.paymentMethod}`,
    accountLine.trimEnd(),
    proofNotice,
    '',
    'Mohon konfirmasi pesanannya ya Admin. Terima kasih!',
  ]
    .filter((line, index, arr) => {
      if (line !== '') return true;
      return arr[index - 1] !== '';
    })
    .join('\n');
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const normalized = normalizeWhatsappNumber(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

export function buildAdminConfirmationWhatsappUrl(order: Order, settings: StoreSettings): string {
  const message = [
    `Halo Kak *${order.customerName}*, terima kasih sudah memesan di *${settings.storeName}*!`,
    '',
    `Kode Pesanan: *${order.orderCode}*`,
    `Total: *${formatRupiah(order.totalAmount)}* (${order.paymentMethod})`,
    `Status Terbaru: *${order.status}*`,
    '',
    order.paymentProofDataUrl
      ? 'Bukti pembayaran Kakak sudah kami terima. Pesanan sedang kami siapkan dengan hangat!'
      : 'Pesanan Kakak sedang kami proses. Kabari kami bila ada kebutuhan tambahan.',
  ].join('\n');

  return buildWhatsappUrl(order.customerPhone, message);
}

export function readOrderHistoryFromStorage(): Order[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrderToHistoryStorage(order: Order): Order[] {
  const existing = readOrderHistoryFromStorage();
  const deduped = [order, ...existing.filter((item) => item.orderCode !== order.orderCode)].slice(0, 30);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(deduped));
  }
  return deduped;
}

export function syncOrderHistoryStatuses(localOrders: Order[], serverOrders: Order[]): Order[] {
  if (!serverOrders.length) return localOrders;
  const serverMap = new Map(serverOrders.map((o) => [o.orderCode, o]));
  const updated = localOrders.map((localOrder) => {
    const fresh = serverMap.get(localOrder.orderCode);
    return fresh ? { ...localOrder, status: fresh.status } : localOrder;
  });
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function markOrderReviewedInHistory(
  orderCode: string,
  review: OrderReview,
): Order[] {
  const existing = readOrderHistoryFromStorage();
  const updated = existing.map((order) =>
    order.orderCode === orderCode ? { ...order, review } : order,
  );
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function calculateReviewSummary(reviews: Review[]): ReviewSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!reviews.length) {
    return {
      averageRating: 0,
      totalCount: 0,
      distribution,
    };
  }

  let sum = 0;
  for (const review of reviews) {
    const clamped = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[clamped] += 1;
    sum += clamped;
  }

  return {
    averageRating: Math.round((sum / reviews.length) * 10) / 10,
    totalCount: reviews.length,
    distribution,
  };
}

export function getHeroFavoriteProducts(products: Product[]): Product[] {
  const activeProducts = products.filter((p) => p.active);
  const featured = activeProducts.filter((p) => Boolean(p.featured));
  return featured.length > 0 ? featured : activeProducts;
}

export function buildProductShareLinks(product: Product, pageUrl: string) {
  const shareText = `Cobain ${product.name} (${product.unitLabel}) cuma ${formatRupiah(
    product.price,
  )} di Dapur Hangat! Pesan langsung via WhatsApp tanpa ribet:`;
  const encodedText = encodeURIComponent(`${shareText} ${pageUrl}`);
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedSummary = encodeURIComponent(shareText);

  return {
    shareText,
    whatsapp: `https://wa.me/?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedSummary}&url=${encodedUrl}`,
  };
}
