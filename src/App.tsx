import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AdminDashboard } from './components/AdminDashboard';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { HeroSection } from './components/HeroSection';
import { HowToOrderSection } from './components/HowToOrderSection';
import { Navbar, type ActivePage } from './components/Navbar';
import { OrderHistoryDrawer } from './components/OrderHistoryDrawer';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ReviewsSection } from './components/ReviewsSection';
import { ShareModal } from './components/ShareModal';
import type {
  CartItem,
  CategoryFilter,
  Order,
  OrderReview,
  Product,
  Review,
  SortOption,
  StoreSettings,
} from './types/store';
import {
  calculateCartCount,
  filterAndSortProducts,
  getHeroFavoriteProducts,
  markOrderReviewedInHistory,
  ORDER_HISTORY_STORAGE_KEY,
  readOrderHistoryFromStorage,
  saveOrderToHistoryStorage,
  syncOrderHistoryStatuses,
  THEME_STORAGE_KEY,
  upsertCartItem,
} from './utils/storeLogic';

const FALLBACK_SETTINGS: StoreSettings = {
  storeName: 'VAMPIRE STAND',
  adminWhatsapp: '62895384223639',
  qrisImageUrl: '',
  qrisMerchantName: 'VAMPIRE STAND',
  bankAccounts: [],
  eWallets: [],
  codNote: 'Bayar tunai saat pesanan tiba.',
};

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(FALLBACK_SETTINGS);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  const [category, setCategory] = useState<CategoryFilter>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>(() => readOrderHistoryFromStorage());

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDark]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2400);
  };

  const fetchStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products || []);
      setReviews(data.reviews || []);
      if (data.settings) {
        setSettings(data.settings);
      }
    } finally {
      setIsLoadingStore(false);
    }
  }, []);

  const syncHistoryStatuses = useCallback(async () => {
    const localOrders = readOrderHistoryFromStorage();
    if (!localOrders.length) return;
    const codes = localOrders.map((o) => o.orderCode).join(',');
    try {
      const res = await fetch(`/api/orders/statuses?codes=${encodeURIComponent(codes)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.statuses)) {
        const merged = syncOrderHistoryStatuses(localOrders, data.statuses as Order[]);
        setOrderHistory(merged);
      }
    } catch {
      // keep existing localStorage history if offline
    }
  }, []);

  useEffect(() => {
    fetchStorefront();
    syncHistoryStatuses();
  }, [fetchStorefront, syncHistoryStatuses]);

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        category,
        searchQuery,
        sortBy,
      }),
    [products, category, searchQuery, sortBy],
  );

  const favoriteProducts = useMemo(
    () => getHeroFavoriteProducts(products),
    [products],
  );

  const handleAddToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) return;
    setCart((prev) => upsertCartItem(prev, product, quantity));
    showToast(`${product.name} ditambahkan ke keranjang.`);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) => upsertCartItem(prev, product, delta));
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleOrderSuccess = (order: Order) => {
    const nextHistory = saveOrderToHistoryStorage(order);
    setOrderHistory(nextHistory);
    setCart([]);
    fetchStorefront();
  };

  const handleReviewSubmitted = (
    orderCode: string,
    orderReview: OrderReview,
    createdReview: Review,
  ) => {
    setReviews((prev) => [createdReview, ...prev.filter((r) => r.orderCode !== orderCode)]);
    const nextHistory = markOrderReviewedInHistory(orderCode, orderReview);
    setOrderHistory(nextHistory);
    showToast('Terima kasih! Ulasan Anda kini tampil di halaman utama.');
  };

  const handleReorder = (order: Order) => {
    let nextCart = [...cart];
    let addedCount = 0;
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.productId && p.active && p.stock > 0);
      if (product) {
        nextCart = upsertCartItem(nextCart, product, item.quantity);
        addedCount += 1;
      }
    }
    setCart(nextCart);
    setIsHistoryOpen(false);
    setIsCartOpen(true);
    if (addedCount === 0) {
      showToast('Produk pada pesanan ini sedang habis stoknya.');
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem(ORDER_HISTORY_STORAGE_KEY);
    setOrderHistory([]);
  };

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cartCount = calculateCartCount(cart);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-[#FAF6F0] text-[#231914] dark:bg-[#14100D] dark:text-[#FAF2E8] transition-colors duration-200">
        <Navbar
          storeName={settings.storeName}
          activePage={activePage}
          onNavigatePage={setActivePage}
          onScrollToSection={handleScrollToSection}
          onOpenHistory={() => {
            setToastMessage('');
            syncHistoryStatuses();
            setIsHistoryOpen(true);
          }}
          onOpenCart={() => {
            setToastMessage('');
            setIsCartOpen(true);
          }}
          cartCount={cartCount}
          historyCount={orderHistory.length}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
        />

        <main className="flex-1">
          {activePage === 'admin' ? (
            <AdminDashboard
              onBackToStore={() => {
                setActivePage('store');
                fetchStorefront();
              }}
              onDataUpdated={fetchStorefront}
            />
          ) : (
            <>
              <HeroSection
                favoriteProducts={favoriteProducts}
                onExploreMenu={() => handleScrollToSection('katalog-menu')}
                onOpenHistory={() => {
                  setToastMessage('');
                  syncHistoryStatuses();
                  setIsHistoryOpen(true);
                }}
                onSelectFavorite={(product) => setDetailProduct(product)}
              />

              <ProductCatalog
                products={filteredProducts}
                totalCatalogCount={products.length}
                category={category}
                onCategoryChange={setCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onAddToCart={(product) => handleAddToCart(product, 1)}
                onOpenDetail={(product) => setDetailProduct(product)}
                onShareProduct={(product) => setShareProduct(product)}
                isLoading={isLoadingStore}
              />

              <ReviewsSection
                reviews={reviews}
                onExploreMenu={() => handleScrollToSection('katalog-menu')}
              />

              <HowToOrderSection
                settings={settings}
                onOpenAdmin={() => setActivePage('admin')}
              />
            </>
          )}
        </main>

        {/* Smooth Toast Confirmation */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#231914] dark:bg-[#D98A43] text-[#FAF6F0] dark:text-[#1A110B] text-xs sm:text-sm font-medium shadow-lg whitespace-nowrap"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAddToCart={handleAddToCart}
          onShare={(product) => setShareProduct(product)}
        />

        <ShareModal product={shareProduct} onClose={() => setShareProduct(null)} />

        <CartCheckoutDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          settings={settings}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onOrderSuccess={handleOrderSuccess}
          onReviewSubmitted={handleReviewSubmitted}
        />

        <OrderHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          orders={orderHistory}
          settings={settings}
          onReorder={handleReorder}
          onClearHistory={handleClearHistory}
          onReviewSubmitted={handleReviewSubmitted}
        />
      </div>
    </MotionConfig>
  );
}
