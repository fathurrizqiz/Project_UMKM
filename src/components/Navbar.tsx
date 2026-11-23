import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, Moon, ShoppingBag, Sun, X } from 'lucide-react';

export type ActivePage = 'store' | 'admin';

interface NavbarProps {
  storeName: string;
  activePage: ActivePage;
  onNavigatePage: (page: ActivePage) => void;
  onScrollToSection: (sectionId: string) => void;
  onOpenHistory: () => void;
  onOpenCart: () => void;
  cartCount: number;
  historyCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Navbar({
  storeName,
  activePage,
  onNavigatePage,
  onScrollToSection,
  onOpenHistory,
  onOpenCart,
  cartCount,
  historyCount,
  isDark,
  onToggleTheme,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateStoreSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigatePage('store');
    setTimeout(() => onScrollToSection(sectionId), 40);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E6DAC8]/90 dark:border-[#332820]/90 bg-[#FAF6F0]/92 dark:bg-[#14100D]/92 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 md:gap-8">
        {/* Zone 1: Single-line Editorial Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onNavigatePage('store');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg sm:text-xl font-bold tracking-[-0.02em] text-[#231914] dark:text-[#FAF2E8] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9A521C]"
        >
          {storeName}
        </button>

        {/* Zone 2: Clean Typographic Nav Links */}
        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B584C] dark:text-[#BBA798]"
        >
          <button
            type="button"
            onClick={() => navigateStoreSection('katalog-menu')}
            className={`relative py-1 hover:text-[#231914] dark:hover:text-[#FAF2E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'store'
                ? 'text-[#231914] dark:text-[#FAF2E8] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-[#9A521C] dark:after:bg-[#D98A43]'
                : ''
            }`}
          >
            Menu
          </button>
          <button
            type="button"
            onClick={() => navigateStoreSection('ulasan-pembeli')}
            className="py-1 hover:text-[#231914] dark:hover:text-[#FAF2E8] hover:underline hover:underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ulasan
          </button>
          <button
            type="button"
            onClick={() => navigateStoreSection('cara-pesan')}
            className="py-1 hover:text-[#231914] dark:hover:text-[#FAF2E8] hover:underline hover:underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Cara Pesan
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="py-1 hover:text-[#231914] dark:hover:text-[#FAF2E8] hover:underline hover:underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            Riwayat{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('admin')}
            className={`relative py-1 hover:text-[#231914] dark:hover:text-[#FAF2E8] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'admin'
                ? 'text-[#9A521C] dark:text-[#E59D5B] font-semibold after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-[#9A521C] dark:after:bg-[#D98A43]'
                : ''
            }`}
          >
            Panel Admin
          </button>
        </nav>

        {/* Zone 3: Theme Toggle & Primary Cart CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
            title={isDark ? 'Mode Terang' : 'Mode Malam'}
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-[#4C3B31] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] transition-colors active:scale-[0.96] cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#9A521C]"
          >
            {isDark ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenCart();
            }}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-sm font-semibold transition-colors active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A521C]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Keranjang</span>
            <span className="font-mono tabular-nums text-xs bg-black/15 dark:bg-black/15 px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label="Buka menu navigasi"
            className="md:hidden w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-[#4C3B31] dark:text-[#EFE4D8] cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Menu className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Smooth Collapsible Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Navigasi seluler"
            className="md:hidden border-t border-[#E6DAC8] dark:border-[#332820] bg-[#FAF6F0] dark:bg-[#14100D] px-4 py-3 flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              onClick={() => navigateStoreSection('katalog-menu')}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#4C3B31] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] whitespace-nowrap cursor-pointer"
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => navigateStoreSection('ulasan-pembeli')}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#4C3B31] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] whitespace-nowrap cursor-pointer"
            >
              Ulasan
            </button>
            <button
              type="button"
              onClick={() => navigateStoreSection('cara-pesan')}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#4C3B31] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] whitespace-nowrap cursor-pointer"
            >
              Cara Pesan
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenHistory();
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#4C3B31] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] whitespace-nowrap cursor-pointer"
            >
              Riwayat{historyCount > 0 ? ` (${historyCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigatePage('admin');
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-[#9A521C] dark:text-[#E59D5B] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] whitespace-nowrap cursor-pointer"
            >
              Panel Admin
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
