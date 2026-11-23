import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpDown, Plus, Search, Share2, X } from 'lucide-react';
import type { CategoryFilter, Product, SortOption } from '../types/store';
import { formatRupiah } from '../utils/storeLogic';
import { SafeImage } from './SafeImage';

interface ProductCatalogProps {
  products: Product[];
  totalCatalogCount: number;
  category: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onAddToCart: (product: Product) => void;
  onOpenDetail: (product: Product) => void;
  onShareProduct: (product: Product) => void;
  isLoading: boolean;
}

const CATEGORIES: CategoryFilter[] = ['Semua', 'Dimsum', 'Kripik Pisang Coklat'];

export function ProductCatalog({
  products,
  totalCatalogCount,
  category,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onAddToCart,
  onOpenDetail,
  onShareProduct,
  isLoading,
}: ProductCatalogProps) {
  return (
    <section
      id="katalog-menu"
      className="scroll-mt-16 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 border-t border-[#E6DAC8] dark:border-[#332820]"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#231914] dark:text-[#FAF2E8]">
            Menu Pilihan Hari Ini
          </h2>
          <p className="text-sm text-[#6B584C] dark:text-[#BBA798] mt-1">
            Menampilkan{' '}
            <span className="font-mono tabular-nums font-semibold text-[#231914] dark:text-[#FAF2E8]">
              {products.length}
            </span>{' '}
            dari <span className="font-mono tabular-nums">{totalCatalogCount}</span> varian tersedia
          </p>
        </div>
      </div>

      {/* Category Filter, Live Search & Price Sort Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-9 pb-5 border-b border-[#E6DAC8] dark:border-[#332820]">
        <div
          role="group"
          aria-label="Filter kategori produk"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F3ECE1] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921] self-start"
        >
          {CATEGORIES.map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onCategoryChange(item)}
                aria-pressed={active}
                className={`relative px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-[#231914] dark:text-[#FAF2E8]'
                    : 'text-[#6B584C] dark:text-[#BBA798] hover:text-[#231914] dark:hover:text-[#FAF2E8]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="catalog-category-indicator"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg bg-[#FFFDF9] dark:bg-[#2E241D] shadow-xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">{item}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <label htmlFor="product-search-input" className="sr-only">
              Cari menu dimsum atau kripik pisang coklat
            </label>
            <Search
              className="w-4 h-4 text-[#8A7363] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="product-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari dimsum atau kripik..."
              className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-sm text-[#231914] dark:text-[#FAF2E8] placeholder:text-[#9A8475] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30 dark:focus:ring-[#D98A43]/35"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded text-[#8A7363] hover:text-[#231914] dark:hover:text-[#FAF2E8] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <label htmlFor="product-sort-select" className="sr-only">
              Urutkan harga produk
            </label>
            <ArrowUpDown
              className="w-4 h-4 text-[#8A7363] absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <select
              id="product-sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full sm:w-auto pl-9 pr-8 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-sm text-[#2B1F18] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30 dark:focus:ring-[#D98A43]/35 cursor-pointer"
            >
              <option value="default">Urutan Rekomendasi</option>
              <option value="cheapest">Harga Termurah</option>
              <option value="expensive">Harga Termahal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Open Editorial 3-Column Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-3 animate-pulse">
              <div className="aspect-[4/3] rounded-xl bg-[#EFE4D5] dark:bg-[#261E19]" />
              <div className="h-3 w-1/2 bg-[#EFE4D5] dark:bg-[#261E19] rounded" />
              <div className="h-5 w-3/4 bg-[#EFE4D5] dark:bg-[#261E19] rounded" />
              <div className="h-4 w-full bg-[#EFE4D5] dark:bg-[#261E19] rounded" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] p-10 text-center">
          <p className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8] mb-1">
            Menu tidak ditemukan
          </p>
          <p className="text-sm text-[#6B584C] dark:text-[#BBA798] mb-4">
            Tidak ada produk yang cocok dengan kata kunci atau kategori yang dipilih.
          </p>
          <button
            type="button"
            onClick={() => {
              onCategoryChange('Semua');
              onSearchChange('');
              onSortChange('default');
            }}
            className="px-4 py-2 rounded-lg bg-[#9A521C] dark:bg-[#D98A43] text-white dark:text-[#1A110B] text-sm font-medium cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div
          data-testid="product-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10"
        >
          <AnimatePresence mode="popLayout">
            {products.map((product) => {
              const outOfStock = product.stock <= 0;
              const lowStock = product.stock > 0 && product.stock <= 5;
              return (
                <motion.article
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="group flex flex-col justify-between"
                >
                  <div>
                    {/* 4:3 Gallery Image Frame */}
                    <button
                      type="button"
                      onClick={() => onOpenDetail(product)}
                      className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#F3ECE1] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#9A521C] mb-4"
                      aria-label={`Lihat detail ${product.name}`}
                    >
                      <SafeImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                        fallbackTitle={product.name}
                      />
                    </button>

                    {/* Clean Unboxed Metadata */}
                    <div className="flex items-center justify-between gap-2 text-xs text-[#6B584C] dark:text-[#BBA798] mb-1.5">
                      <span className="truncate">
                        {product.category} <span aria-hidden="true">·</span> {product.unitLabel}
                      </span>
                      <span
                        className={`font-mono tabular-nums shrink-0 font-medium ${
                          outOfStock
                            ? 'text-red-700 dark:text-red-400'
                            : lowStock
                              ? 'text-[#B45309] dark:text-[#F5B06C]'
                              : 'text-[#6B584C] dark:text-[#BBA798]'
                        }`}
                      >
                        {outOfStock ? 'Stok Habis' : `Stok ${product.stock}`}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8] leading-snug">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(product)}
                          className="text-left hover:text-[#9A521C] dark:hover:text-[#E59D5B] transition-colors cursor-pointer"
                        >
                          {product.name}
                        </button>
                      </h3>
                      <span className="font-mono tabular-nums text-[15px] font-semibold text-[#9A521C] dark:text-[#F0B57D] whitespace-nowrap shrink-0">
                        {formatRupiah(product.price)}
                      </span>
                    </div>

                    <p className="text-sm text-[#5C4B40] dark:text-[#CBB8A9] line-clamp-2 leading-relaxed mb-4">
                      {product.description}
                    </p>
                  </div>

                  {/* Minimal Hairline Action Footer */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[#E6DAC8] dark:border-[#332820]">
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => onAddToCart(product)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] disabled:bg-[#E6DAC8] dark:disabled:bg-[#2A201A] disabled:text-[#8A7363] text-white text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>{outOfStock ? 'Stok Habis' : 'Tambah'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDetail(product)}
                      className="px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-[#3B2C24] dark:text-[#EFE4D8] text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Detail
                    </button>

                    <button
                      type="button"
                      onClick={() => onShareProduct(product)}
                      aria-label={`Bagikan ${product.name} ke media sosial`}
                      title="Bagikan ke media sosial"
                      className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-[#5C4B40] dark:text-[#D5C3B3] transition-colors shrink-0 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
