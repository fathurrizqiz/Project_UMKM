import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bell,
  Check,
  Eye,
  ImagePlus,
  Lock,
  LogOut,
  MessageCircle,
  Minus,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  AdminNotification,
  BankAccount,
  EWalletAccount,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  StoreSettings,
} from '../types/store';
import {
  buildAdminConfirmationWhatsappUrl,
  formatRupiah,
} from '../utils/storeLogic';
import { SafeImage } from './SafeImage';

interface AdminDashboardProps {
  onBackToStore: () => void;
  onDataUpdated: () => void;
}

type AdminTab = 'products' | 'orders' | 'settings';

const ADMIN_TOKEN_KEY = 'dapur_hangat_admin_token_v1';

const ORDER_STATUSES: OrderStatus[] = [
  'Menunggu Pembayaran',
  'Menunggu Verifikasi',
  'Diproses',
  'Dikirim',
  'Selesai',
  'Dibatalkan',
];

export function AdminDashboard({ onBackToStore, onDataUpdated }: AdminDashboardProps) {
  const [token, setToken] = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) || '' : '',
  );
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // New Product form state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Dimsum');
  const [newPrice, setNewPrice] = useState('28000');
  const [newStock, setNewStock] = useState('15');
  const [newUnit, setNewUnit] = useState('8 pcs');
  const [newDesc, setNewDesc] = useState('');
  const [newImageDataUrl, setNewImageDataUrl] = useState('');
  const [newImageName, setNewImageName] = useState('');
  const [newFeatured, setNewFeatured] = useState(true);
  const [productFormError, setProductFormError] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Inline edits map for products
  const [draftEdits, setDraftEdits] = useState<Record<string, { price: string; stock: string }>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Payment proof preview modal
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Settings form state
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [newBankNumber, setNewBankNumber] = useState('');
  const [newBankHolder, setNewBankHolder] = useState('');
  const [newEwProvider, setNewEwProvider] = useState('');
  const [newEwNumber, setNewEwNumber] = useState('');
  const [newEwHolder, setNewEwHolder] = useState('');

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3200);
  };

  const fetchDashboard = useCallback(async (authToken: string) => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken('');
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setOrders(data.orders || []);
      setNotifications(data.notifications || []);
      setSettings(data.settings || null);
      setSettingsDraft(data.settings || null);

      const drafts: Record<string, { price: string; stock: string }> = {};
      for (const p of data.products || []) {
        drafts[p.id] = { price: String(p.price), stock: String(p.stock) };
      }
      setDraftEdits(drafts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchDashboard(token);
    }
  }, [token, fetchDashboard]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Gagal masuk.');
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setPassword('');
    } catch {
      setLoginError('Gagal menghubungi server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken('');
  };

  const handleAdjustStock = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stock: nextStock }),
    });
    if (res.ok) {
      await fetchDashboard(token);
      onDataUpdated();
      showToast(`Stok ${product.name} diperbarui menjadi ${nextStock}.`);
    }
  };

  const handleSaveProductDraft = async (productId: string) => {
    const draft = draftEdits[productId];
    if (!draft) return;
    const price = Math.max(0, Math.round(Number(draft.price) || 0));
    const stock = Math.max(0, Math.round(Number(draft.stock) || 0));

    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ price, stock }),
    });
    if (res.ok) {
      await fetchDashboard(token);
      onDataUpdated();
      showToast('Harga dan stok produk berhasil disimpan.');
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: !product.active }),
    });
    if (res.ok) {
      await fetchDashboard(token);
      onDataUpdated();
      showToast(`${product.name} ${!product.active ? 'diaktifkan' : 'dinonaktifkan'}.`);
    }
  };

  const handleToggleProductFeatured = async (product: Product) => {
    const nextFeatured = !product.featured;
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ featured: nextFeatured }),
    });
    if (res.ok) {
      await fetchDashboard(token);
      onDataUpdated();
      showToast(
        nextFeatured
          ? `${product.name} ditampilkan di Menu Favorit homepage.`
          : `${product.name} dihapus dari Menu Favorit homepage.`,
      );
    }
  };

  const handleNewProductImageChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProductFormError('File gambar harus berformat PNG, JPG, WEBP, atau GIF.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setProductFormError('Ukuran gambar maksimal 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewImageDataUrl(reader.result);
        setNewImageName(file.name);
        setProductFormError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReplaceProductImage = (product: Product, file: File | null) => {
    if (!file || !file.type.startsWith('image/') || file.size > 4 * 1024 * 1024) {
      showToast('Pilih file gambar maksimal 4 MB (PNG/JPG/WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageDataUrl: reader.result }),
      });
      if (res.ok) {
        await fetchDashboard(token);
        onDataUpdated();
        showToast(`Foto ${product.name} disimpan ke /assets/img.`);
      } else {
        showToast('Gagal memperbarui foto produk.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProduct = async (productId: string) => {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      await fetchDashboard(token);
      onDataUpdated();
      showToast('Produk berhasil dihapus.');
    }
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    setProductFormError('');
    setIsSavingProduct(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          category: newCategory,
          price: Number(newPrice),
          stock: Number(newStock),
          unitLabel: newUnit,
          description: newDesc,
          imageDataUrl: newImageDataUrl || undefined,
          featured: newFeatured,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setProductFormError(payload.error || 'Gagal menyimpan produk baru.');
        return;
      }
      setNewName('');
      setNewDesc('');
      setNewImageDataUrl('');
      setNewImageName('');
      setNewFeatured(true);
      setShowAddProduct(false);
      await fetchDashboard(token);
      onDataUpdated();
      showToast(
        newImageDataUrl
          ? 'Produk baru & fotonya berhasil disimpan ke /assets/img.'
          : 'Produk baru berhasil ditambahkan ke katalog.',
      );
    } catch {
      setProductFormError('Terjadi gangguan saat menyimpan produk.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchDashboard(token);
      onDataUpdated();
      showToast(`Status pesanan diubah menjadi "${status}".`);
    }
  };

  const handleMarkNotificationsRead = async () => {
    const res = await fetch('/api/admin/notifications/read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await fetchDashboard(token);
    }
  };

  const handleQrisUpload = (file: File | null) => {
    if (!file || !settingsDraft) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettingsDraft({ ...settingsDraft, qrisImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddBankAccount = () => {
    if (!settingsDraft || !newBankName.trim() || !newBankNumber.trim() || !newBankHolder.trim()) {
      return;
    }
    const nextBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankName.trim().toUpperCase(),
      accountNumber: newBankNumber.trim(),
      accountHolder: newBankHolder.trim(),
    };
    setSettingsDraft({
      ...settingsDraft,
      bankAccounts: [...settingsDraft.bankAccounts, nextBank],
    });
    setNewBankName('');
    setNewBankNumber('');
    setNewBankHolder('');
  };

  const handleAddEWallet = () => {
    if (!settingsDraft || !newEwProvider.trim() || !newEwNumber.trim() || !newEwHolder.trim()) {
      return;
    }
    const nextEw: EWalletAccount = {
      id: `ew-${Date.now()}`,
      provider: newEwProvider.trim(),
      number: newEwNumber.trim(),
      accountHolder: newEwHolder.trim(),
    };
    setSettingsDraft({
      ...settingsDraft,
      eWallets: [...settingsDraft.eWallets, nextEw],
    });
    setNewEwProvider('');
    setNewEwNumber('');
    setNewEwHolder('');
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!settingsDraft) return;
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settingsDraft),
    });
    if (res.ok) {
      await fetchDashboard(token);
      onDataUpdated();
      showToast('Pengaturan pembayaran, QRIS, dan WhatsApp Admin berhasil disimpan.');
    }
  };

  if (!token) {
    return (
      <section className="max-w-md mx-auto px-4 py-14">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-7 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#9A521C]/12 dark:bg-[#D98A43]/20 text-[#9A521C] dark:text-[#E59D5B] inline-flex items-center justify-center">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B584C] dark:text-[#BBA798] hover:text-[#231914] dark:hover:text-[#FAF2E8] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kembali ke Toko</span>
            </button>
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-[#231914] dark:text-[#FAF2E8]">
              Masuk Panel Admin
            </h1>
            <p className="text-sm text-[#6B584C] dark:text-[#BBA798] mt-1">
              Kelola stok &amp; foto menu Dimsum &amp; Kripik Pisang Coklat, atur Menu Favorit
              homepage, verifikasi bukti bayar, serta kelola QRIS toko.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1"
              >
                Kata Sandi Admin
              </label>
              <input
                id="admin-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi admin"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30"
              />
              
            </div>

            {loginError && (
              <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {isLoggingIn ? 'Memeriksa...' : 'Masuk Dashboard Admin'}
            </button>
          </form>
        </motion.div>
      </section>
    );
  }

  const totalRevenue = orders
    .filter((o) => o.status !== 'Dibatalkan')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingOrders = orders.filter(
    (o) => o.status === 'Menunggu Verifikasi' || o.status === 'Menunggu Pembayaran',
  ).length;
  const lowStockCount = products.filter((p) => p.active && p.stock <= 5).length;
  const featuredCount = products.filter((p) => p.active && p.featured).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E6DAC8] dark:border-[#332820]">
        <div>
          <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
            Admin / Kelola Usaha {settings?.storeName || 'Dapur Hangat'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#231914] dark:text-[#FAF2E8] mt-0.5">
            Panel Stok, Pesanan &amp; Pembayaran
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-xs sm:text-sm font-medium text-[#2B1F18] dark:text-[#FAF2E8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Lihat Toko</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-xs sm:text-sm font-medium text-[#5C4B40] dark:text-[#D5C3B3] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="status"
            className="px-4 py-3 rounded-xl border border-[#9A521C]/35 dark:border-[#D98A43]/40 bg-[#9A521C]/8 dark:bg-[#D98A43]/15 text-xs sm:text-sm font-medium text-[#7D4013] dark:text-[#F6DFC7] flex items-center gap-2"
          >
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Hairline-Divided Metric Strip */}
      <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E6DAC8] dark:divide-[#332820]">
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">Total Omzet Pesanan</p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#231914] dark:text-[#FAF2E8] mt-1">
            {formatRupiah(totalRevenue)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">Perlu Verifikasi Bayar</p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#B45309] dark:text-[#F5B06C] mt-1">
            {pendingOrders} pesanan
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">Menu Favorit Homepage</p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#9A521C] dark:text-[#F0B57D] mt-1">
            {featuredCount} / {products.length} menu
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">Stok Menipis (&le; 5)</p>
          <p
            className={`font-mono tabular-nums text-xl font-bold mt-1 ${
              lowStockCount > 0
                ? 'text-red-700 dark:text-red-400'
                : 'text-[#9A521C] dark:text-[#E59D5B]'
            }`}
          >
            {lowStockCount} item
          </p>
        </div>
      </div>

      {/* Animated Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Bagian panel admin"
        className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F3ECE1] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921]"
      >
        {(
          [
            { id: 'products', label: 'Kelola Stok, Foto & Favorit' },
            { id: 'orders', label: 'Pesanan & Notifikasi WA', badge: unreadNotifs },
            { id: 'settings', label: 'QRIS, Rekening & WhatsApp' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-2 ${
                active
                  ? 'text-[#231914] dark:text-[#FAF2E8]'
                  : 'text-[#6B584C] dark:text-[#BBA798] hover:text-[#231914] dark:hover:text-[#FAF2E8]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-tab-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-[#FFFDF9] dark:bg-[#2E241D] shadow-xs"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              {'badge' in tab && tab.badge > 0 && (
                <span className="relative z-10 font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded bg-[#9A521C] dark:bg-[#D98A43] text-white dark:text-[#1A110B]">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-8 text-center text-sm text-[#6B584C] dark:text-[#BBA798]">
          Memuat data panel admin...
        </div>
      ) : activeTab === 'products' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#231914] dark:text-[#FAF2E8]">
                Daftar Stok, Foto Menu &amp; Menu Favorit Homepage
              </h2>
              <p className="text-xs text-[#6B584C] dark:text-[#BBA798] mt-0.5">
                Tandai menu dengan ikon bintang agar tampil bergantian di sisi kanan homepage. Foto
                yang diunggah disimpan otomatis ke folder <span className="font-mono">/assets/img</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddProduct((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{showAddProduct ? 'Tutup Form' : 'Tambah Produk Baru'}</span>
            </button>
          </div>

          {showAddProduct && (
            <form
              onSubmit={handleAddProduct}
              className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Dimsum Keju Lumer"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                  Kategori *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8]"
                >
                  <option value="Dimsum">Dimsum</option>
                  <option value="Kripik Pisang Coklat">Kripik Pisang Coklat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                  Kemasan / Satuan *
                </label>
                <input
                  type="text"
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Contoh: 8 pcs / Pouch 200g"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                  Harga (Rp) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm font-mono text-[#231914] dark:text-[#FAF2E8]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                  Stok Awal *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm font-mono text-[#231914] dark:text-[#FAF2E8]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Penjelasan singkat rasa atau isi"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8]"
                />
              </div>

              {/* Product Image Upload (Saves to /assets/img) */}
              <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t border-[#E6DAC8] dark:border-[#332820] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#F3ECE1] dark:bg-[#14100D] overflow-hidden shrink-0 flex items-center justify-center">
                    {newImageDataUrl ? (
                      <img
                        src={newImageDataUrl}
                        alt="Pratinjau foto menu baru"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-[#8A7363]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="new-product-image-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8C5AF] dark:border-[#44352B] bg-[#FAF6F0] dark:bg-[#14100D] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-xs font-medium text-[#2B1F18] dark:text-[#FAF2E8] cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{newImageDataUrl ? 'Ganti Gambar Menu' : 'Unggah Gambar Menu'}</span>
                      </label>
                      <input
                        id="new-product-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleNewProductImageChange(e.target.files?.[0] || null)}
                        className="sr-only"
                      />
                      {newImageDataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewImageDataUrl('');
                            setNewImageName('');
                          }}
                          className="text-xs text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B584C] dark:text-[#BBA798]">
                      {newImageName
                        ? `Dipilih: ${newImageName} · akan disimpan ke /assets/img`
                        : 'Gambar diunggah akan otomatis masuk ke folder /assets/img dan tampil di menu ini.'}
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#3B2C24] dark:text-[#EFE4D8] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newFeatured}
                    onChange={(e) => setNewFeatured(e.target.checked)}
                    className="w-4 h-4 accent-[#9A521C] rounded"
                  />
                  <span>Tampilkan di Menu Favorit Homepage</span>
                </label>
              </div>

              {productFormError && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                    {productFormError}
                  </p>
                </div>
              )}

              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2.5 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] text-white dark:text-[#1A110B] disabled:opacity-60 text-sm font-semibold cursor-pointer"
                >
                  {isSavingProduct ? 'Menyimpan...' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E6DAC8] dark:border-[#332820] text-xs text-[#6B584C] dark:text-[#BBA798]">
                  <th className="py-3 px-4 font-medium">Produk &amp; Foto</th>
                  <th className="py-3 px-4 font-medium">Kategori</th>
                  <th className="py-3 px-4 font-medium">Harga (Rp)</th>
                  <th className="py-3 px-4 font-medium">Stok Cepat</th>
                  <th className="py-3 px-4 font-medium">Favorit Homepage</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DAC8]/80 dark:divide-[#332820]">
                {products.map((product) => {
                  const draft = draftEdits[product.id] || {
                    price: String(product.price),
                    stock: String(product.stock),
                  };
                  const hasChanges =
                    draft.price !== String(product.price) || draft.stock !== String(product.stock);
                  const photoInputId = `replace-photo-${product.id}`;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-[#FAF6F0]/70 dark:hover:bg-[#261E19]/50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[230px]">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F3ECE1] dark:bg-[#14100D] shrink-0">
                            <SafeImage
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#231914] dark:text-[#FAF2E8] truncate">
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-[#6B584C] dark:text-[#BBA798]">
                              <span>{product.unitLabel}</span>
                              <span aria-hidden="true">·</span>
                              <label
                                htmlFor={photoInputId}
                                className="text-[#9A521C] dark:text-[#E59D5B] hover:underline cursor-pointer font-medium"
                              >
                                Ganti Foto
                              </label>
                              <input
                                id={photoInputId}
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleReplaceProductImage(product, e.target.files?.[0] || null)
                                }
                                className="sr-only"
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#5C4B40] dark:text-[#CBB8A9] whitespace-nowrap">
                        {product.category}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          aria-label={`Harga ${product.name}`}
                          value={draft.price}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [product.id]: { ...draft, price: e.target.value },
                            }))
                          }
                          className="w-28 px-2.5 py-1.5 rounded border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] font-mono tabular-nums text-xs text-[#231914] dark:text-[#FAF2E8]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product, -1)}
                            aria-label={`Kurangi stok ${product.name}`}
                            className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#E2D4C3] dark:border-[#342921] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" aria-hidden="true" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            aria-label={`Stok ${product.name}`}
                            value={draft.stock}
                            onChange={(e) =>
                              setDraftEdits((prev) => ({
                                ...prev,
                                [product.id]: { ...draft, stock: e.target.value },
                              }))
                            }
                            className="w-16 text-center px-2 py-1 rounded border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] font-mono tabular-nums text-xs text-[#231914] dark:text-[#FAF2E8]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product, 1)}
                            aria-label={`Tambah stok ${product.name}`}
                            className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#E2D4C3] dark:border-[#342921] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleProductFeatured(product)}
                          aria-pressed={Boolean(product.featured)}
                          aria-label={`Toggle Menu Favorit homepage untuk ${product.name}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            product.featured
                              ? 'border-[#D98A43]/50 bg-[#D98A43]/15 text-[#9A521C] dark:text-[#F0B57D]'
                              : 'border-[#E2D4C3] dark:border-[#342921] text-[#6B584C] dark:text-[#BBA798] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19]'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              product.featured
                                ? 'fill-[#D98A43] text-[#D98A43]'
                                : 'text-[#A38F80]'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{product.featured ? 'Tampil di Hero' : 'Jadikan Favorit'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleProductActive(product)}
                          className={`text-xs font-semibold cursor-pointer ${
                            product.active
                              ? 'text-[#9A521C] dark:text-[#E59D5B]'
                              : 'text-[#8A7363] dark:text-[#9C8778]'
                          }`}
                        >
                          {product.active ? 'Aktif di Toko' : 'Disembunyikan'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {hasChanges && (
                            <button
                              type="button"
                              onClick={() => handleSaveProductDraft(product.id)}
                              className="px-2.5 py-1.5 rounded bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:text-[#1A110B] text-white text-xs font-medium cursor-pointer"
                            >
                              Simpan
                            </button>
                          )}
                          {confirmDeleteId === product.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-2 py-1 rounded bg-red-700 text-white text-xs font-medium cursor-pointer"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded border border-[#DECBB7] dark:border-[#3A2E25] text-xs cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(product.id)}
                              aria-label={`Hapus ${product.name}`}
                              className="p-1.5 rounded text-[#8A7363] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'orders' ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#9A521C] dark:text-[#E59D5B]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#231914] dark:text-[#FAF2E8]">
                  Log Notifikasi WhatsApp Otomatis &amp; Bukti Bayar Masuk
                </h2>
              </div>
              {unreadNotifs > 0 && (
                <button
                  type="button"
                  onClick={handleMarkNotificationsRead}
                  className="text-xs font-medium text-[#9A521C] dark:text-[#E59D5B] hover:underline cursor-pointer"
                >
                  Tandai Semua Dibaca
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                Belum ada notifikasi pesanan masuk.
              </p>
            ) : (
              <ul className="divide-y divide-[#E6DAC8]/80 dark:divide-[#332820] max-h-52 overflow-y-auto">
                {notifications.slice(0, 8).map((notif) => (
                  <li key={notif.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="text-[#2B1F18] dark:text-[#EFE4D8] font-medium">
                        {!notif.read && (
                          <span className="text-[#9A521C] dark:text-[#E59D5B] font-bold mr-1.5">
                            [Baru]
                          </span>
                        )}
                        {notif.messagePreview}
                      </p>
                      <p className="text-[#6B584C] dark:text-[#BBA798] mt-0.5">
                        {new Date(notif.createdAt).toLocaleString('id-ID')} · WA: {notif.customerPhone}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-[#4C3B31] dark:text-[#EADCCF] shrink-0">
                      {notif.hasPaymentProof ? 'Ada Bukti Bayar' : notif.paymentMethod}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[#231914] dark:text-[#FAF2E8]">
              Daftar Pesanan Pelanggan ({orders.length})
            </h2>

            {orders.length === 0 ? (
              <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-8 text-center text-sm text-[#6B584C] dark:text-[#BBA798]">
                Belum ada pesanan yang masuk.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B584C] dark:text-[#BBA798]">
                          <span className="font-mono font-bold text-[#231914] dark:text-[#FAF2E8]">
                            {order.orderCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(order.createdAt).toLocaleString('id-ID')}</span>
                          <span aria-hidden="true">·</span>
                          <span>{order.paymentMethod}</span>
                        </div>
                        <p className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8] mt-1">
                          {order.customerName}{' '}
                          <span className="font-mono text-xs font-normal text-[#6B584C] dark:text-[#BBA798]">
                            ({order.customerPhone})
                          </span>
                        </p>
                        <p className="text-xs text-[#5C4B40] dark:text-[#CBB8A9] mt-0.5">
                          Alamat: {order.customerAddress}
                          {order.notes ? ` · Catatan: ${order.notes}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <span className="font-mono tabular-nums text-base font-bold text-[#9A521C] dark:text-[#F0B57D]">
                          {formatRupiah(order.totalAmount)}
                        </span>
                        <select
                          aria-label={`Ubah status pesanan ${order.orderCode}`}
                          value={order.status}
                          onChange={(e) =>
                            handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                          }
                          className="px-3 py-1.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-xs font-medium text-[#231914] dark:text-[#FAF2E8] cursor-pointer"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="text-xs text-[#4C3B31] dark:text-[#EADCCF] border-t border-[#E6DAC8] dark:border-[#332820] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p>
                        Item: {order.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')}
                        {order.paymentAccountSummary
                          ? ` · Tujuan: ${order.paymentAccountSummary}`
                          : ''}
                      </p>

                      <div className="flex items-center gap-2 shrink-0">
                        {order.paymentProofDataUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DECBB7] dark:border-[#3A2E25] bg-[#FAF6F0] dark:bg-[#14100D] text-[#231914] dark:text-[#FAF2E8] text-xs font-medium cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Lihat Bukti Bayar</span>
                          </button>
                        ) : (
                          <span className="text-xs text-[#8A7363]">Belum ada tangkapan layar</span>
                        )}

                        {settings && (
                          <a
                            href={buildAdminConfirmationWhatsappUrl(order, settings)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-xs font-medium"
                          >
                            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Konfirmasi WA Pelanggan</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        settingsDraft && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-5 space-y-4">
                <h2 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8]">
                  Identitas Toko &amp; Nomor WhatsApp Admin
                </h2>
                <div>
                  <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                    Nama Usaha
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDraft.storeName}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, storeName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                    Nomor WhatsApp Admin (Tujuan Notifikasi Pesanan)
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDraft.adminWhatsapp}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, adminWhatsapp: e.target.value })
                    }
                    placeholder="Contoh: 6281234567890"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm font-mono text-[#231914] dark:text-[#FAF2E8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                    Catatan Pembayaran COD
                  </label>
                  <input
                    type="text"
                    value={settingsDraft.codNote}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, codNote: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8]"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-5 space-y-4">
                <h2 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8]">
                  Pengaturan Gambar QRIS Toko
                </h2>
                <div>
                  <label className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1">
                    Nama Merchant QRIS
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsDraft.qrisMerchantName}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, qrisMerchantName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-sm text-[#231914] dark:text-[#FAF2E8]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-32 h-36 rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-white p-1.5 overflow-hidden shrink-0">
                    <SafeImage
                      src={settingsDraft.qrisImageUrl}
                      alt="Pratinjau QRIS Toko"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                      Unggah foto / gambar kode QRIS Anda agar langsung tampil saat pembeli memilih
                      metode QRIS.
                    </p>
                    <label
                      htmlFor="admin-qris-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D8C5AF] dark:border-[#44352B] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-xs font-medium cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Unggah Gambar QRIS</span>
                    </label>
                    <input
                      id="admin-qris-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQrisUpload(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-5 space-y-4">
              <h2 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8]">
                Nomor Rekening Transfer Bank
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {settingsDraft.bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0]/80 dark:bg-[#14100D]"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#231914] dark:text-[#FAF2E8]">
                        Bank {bank.bankName}
                      </p>
                      <p className="font-mono tabular-nums text-sm font-semibold text-[#9A521C] dark:text-[#F0B57D]">
                        {bank.accountNumber}
                      </p>
                      <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                        a.n. {bank.accountHolder}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          bankAccounts: settingsDraft.bankAccounts.filter((b) => b.id !== bank.id),
                        })
                      }
                      aria-label={`Hapus rekening ${bank.bankName}`}
                      className="p-1.5 text-[#8A7363] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Nama Bank (cth: Mandiri)"
                  className="px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-xs"
                />
                <input
                  type="text"
                  value={newBankNumber}
                  onChange={(e) => setNewBankNumber(e.target.value)}
                  placeholder="Nomor Rekening"
                  className="px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-xs font-mono"
                />
                <input
                  type="text"
                  value={newBankHolder}
                  onChange={(e) => setNewBankHolder(e.target.value)}
                  placeholder="Atas Nama"
                  className="px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddBankAccount}
                  className="px-3 py-2 rounded-lg border border-[#DECBB7] dark:border-[#3A2E25] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-xs font-semibold cursor-pointer"
                >
                  + Tambah Rekening
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-5 space-y-4">
              <h2 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8]">
                Nomor E-Wallet (DANA / GoPay / OVO / ShopeePay)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {settingsDraft.eWallets.map((ew) => (
                  <div
                    key={ew.id}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0]/80 dark:bg-[#14100D]"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#231914] dark:text-[#FAF2E8]">
                        {ew.provider}
                      </p>
                      <p className="font-mono tabular-nums text-sm font-semibold text-[#9A521C] dark:text-[#F0B57D]">
                        {ew.number}
                      </p>
                      <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                        a.n. {ew.accountHolder}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          eWallets: settingsDraft.eWallets.filter((w) => w.id !== ew.id),
                        })
                      }
                      aria-label={`Hapus e-wallet ${ew.provider}`}
                      className="p-1.5 text-[#8A7363] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
                <input
                  type="text"
                  value={newEwProvider}
                  onChange={(e) => setNewEwProvider(e.target.value)}
                  placeholder="Nama E-Wallet (cth: ShopeePay)"
                  className="px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-xs"
                />
                <input
                  type="text"
                  value={newEwNumber}
                  onChange={(e) => setNewEwNumber(e.target.value)}
                  placeholder="Nomor HP E-Wallet"
                  className="px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-xs font-mono"
                />
                <input
                  type="text"
                  value={newEwHolder}
                  onChange={(e) => setNewEwHolder(e.target.value)}
                  placeholder="Atas Nama"
                  className="px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddEWallet}
                  className="px-3 py-2 rounded-lg border border-[#DECBB7] dark:border-[#3A2E25] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-xs font-semibold cursor-pointer"
                >
                  + Tambah E-Wallet
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Simpan Semua Pengaturan
              </button>
            </div>
          </form>
        )
      )}

      {/* Payment Proof Modal */}
      <AnimatePresence>
        {previewOrder && previewOrder.paymentProofDataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="proof-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-[#FFFDF9] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    id="proof-modal-title"
                    className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8]"
                  >
                    Bukti Pembayaran · {previewOrder.orderCode}
                  </h3>
                  <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                    {previewOrder.customerName} · {formatRupiah(previewOrder.totalAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOrder(null)}
                  aria-label="Tutup pratinjau bukti"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D]">
                <img
                  src={previewOrder.paymentProofDataUrl}
                  alt={`Bukti pembayaran pesanan ${previewOrder.orderCode}`}
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
