import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, History } from 'lucide-react';
import type { Product } from '../types/store';
import { formatRupiah } from '../utils/storeLogic';
import { SafeImage } from './SafeImage';

interface HeroSectionProps {
  favoriteProducts: Product[];
  onExploreMenu: () => void;
  onOpenHistory: () => void;
  onSelectFavorite: (product: Product) => void;
}

export function HeroSection({
  favoriteProducts,
  onExploreMenu,
  onOpenHistory,
  onSelectFavorite,
}: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const count = favoriteProducts.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const currentFavorite = count > 0 ? favoriteProducts[safeIndex] : null;

  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, 4500);
    return () => clearInterval(timer);
  }, [count, isPaused]);

  const handlePrev = () => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev - 1 + count) % count);
  };

  const handleNext = () => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev + 1) % count);
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-10 sm:pt-12 sm:pb-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 flex flex-col justify-between py-1"
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-[#9A521C] dark:text-[#E59D5B] mb-3.5">
              Dapur Rumahan · Kukus Segar &amp; Coklat Lumer
            </p>
            <h1
              className="font-display text-3xl sm:text-4xl lg:text-[3rem] font-bold leading-[1.08] tracking-[-0.025em] text-[#231914] dark:text-[#FAF2E8] mb-5"
              style={{ textWrap: 'balance' }}
            >
              Dimsum Hangat &amp; Kripik Pisang Coklat Lumer
            </h1>
            <p className="text-[15px] sm:text-base leading-relaxed text-[#5C4B40] dark:text-[#CBB8A9] max-w-lg mb-8">
              Pesan langsung tanpa perlu daftar akun. Pilih varian favorit Anda, selesaikan
              pembayaran lewat QRIS atau Transfer Bank, lalu kirim notifikasi bukti bayar otomatis
              ke WhatsApp kami.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreMenu}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-sm font-semibold transition-colors active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A521C]"
              >
                <span>Jelajahi Menu</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onOpenHistory}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-[#DECBB7] dark:border-[#3A2E25] bg-[#FFFDF9] dark:bg-[#1D1713] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-[#2B1F18] dark:text-[#F5EBE0] text-sm font-medium transition-colors active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <History className="w-4 h-4" aria-hidden="true" />
                <span>Riwayat Pemesanan</span>
              </button>
            </div>
          </div>

          {/* Integrated Editorial Hairline Ledger */}
          <div className="mt-10 pt-5 border-t border-[#E6DAC8] dark:border-[#332820] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="font-semibold text-[#231914] dark:text-[#FAF2E8]">
                Pesan Tanpa Login
              </p>
              <p className="text-[#6B584C] dark:text-[#BBA798] mt-1 leading-relaxed">
                Riwayat tersimpan rapi di perangkat Anda.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#231914] dark:text-[#FAF2E8]">
                Pembayaran Digital
              </p>
              <p className="text-[#6B584C] dark:text-[#BBA798] mt-1 leading-relaxed">
                QRIS, Transfer Bank, E-Wallet, dan COD.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#231914] dark:text-[#FAF2E8]">
                Notifikasi WhatsApp
              </p>
              <p className="text-[#6B584C] dark:text-[#BBA798] mt-1 leading-relaxed">
                Bukti bayar otomatis tercatat untuk Admin.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Admin-Managed Rotating Favorite Menu Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
        >
          <div
            data-testid="hero-favorite-showcase"
            className="relative h-full min-h-[300px] sm:min-h-[400px] rounded-2xl overflow-hidden border border-[#E2D4C3] dark:border-[#342921] bg-[#F3ECE1] dark:bg-[#1D1713]"
          >
            {currentFavorite ? (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFavorite.id}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full lg:absolute lg:inset-0"
                  >
                    <SafeImage
                      src={currentFavorite.imageUrl}
                      alt={`Menu favorit: ${currentFavorite.name}`}
                      className="w-full h-full min-h-[300px] sm:min-h-[400px] object-cover"
                      fallbackTitle={currentFavorite.name}
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Measured Gradient Scrim for Legible Editorial Overlay */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#1A110B]/90 via-[#1A110B]/45 to-transparent"
                  aria-hidden="true"
                />

                {/* Top Slide Controls when multiple favorites exist */}
                {count > 1 && (
                  <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2 z-10">
                    <div className="flex items-center gap-1.5" role="tablist" aria-label="Pilih foto menu favorit">
                      {favoriteProducts.map((item, idx) => {
                        const isCurrent = idx === safeIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={isCurrent}
                            aria-label={`Tampilkan menu favorit ${item.name}`}
                            onClick={() => setActiveIndex(idx)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              isCurrent
                                ? 'w-7 bg-[#FAF6F0]'
                                : 'w-2 bg-[#FAF6F0]/45 hover:bg-[#FAF6F0]/75'
                            }`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrev}
                        aria-label="Menu favorit sebelumnya"
                        className="w-8 h-8 rounded-lg bg-[#1A110B]/55 hover:bg-[#1A110B]/80 text-[#FAF6F0] backdrop-blur-xs inline-flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Menu favorit berikutnya"
                        className="w-8 h-8 rounded-lg bg-[#1A110B]/55 hover:bg-[#1A110B]/80 text-[#FAF6F0] backdrop-blur-xs inline-flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Editorial Metadata & Direct Quick-View */}
                <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between gap-4 z-10">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-wide text-[#F3D3B3]">
                      Menu Favorit <span aria-hidden="true">·</span> {currentFavorite.category}
                    </p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[#FAF6F0] leading-tight truncate mt-0.5">
                      {currentFavorite.name}
                    </h2>
                    <p className="font-mono tabular-nums text-xs sm:text-sm font-semibold text-[#F6DFC7] mt-1">
                      {formatRupiah(currentFavorite.price)}{' '}
                      <span className="font-sans font-normal text-[#E7D5C3]">
                        · {currentFavorite.unitLabel}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectFavorite(currentFavorite)}
                    className="px-3.5 py-2 rounded-lg bg-[#FAF6F0] hover:bg-[#F3ECE1] text-[#231914] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    Lihat Menu
                  </button>
                </div>
              </>
            ) : (
              <SafeImage
                src="/src/assets/images/hero_artisan_snacks_1795090633547.jpg"
                alt="Dimsum kukus dalam klakat bambu dan kripik pisang coklat lumer"
                className="w-full h-full object-cover lg:absolute lg:inset-0"
                fallbackTitle="Dimsum & Kripik Pisang Coklat Dapur Hangat"
              />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
