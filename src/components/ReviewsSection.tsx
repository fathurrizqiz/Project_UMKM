import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import type { Review } from '../types/store';
import { calculateReviewSummary } from '../utils/storeLogic';

interface ReviewsSectionProps {
  reviews: Review[];
  onExploreMenu: () => void;
}

export function ReviewsSection({ reviews, onExploreMenu }: ReviewsSectionProps) {
  const [selectedStar, setSelectedStar] = useState<number | 'all'>('all');

  const summary = useMemo(() => calculateReviewSummary(reviews), [reviews]);

  const filteredReviews = useMemo(() => {
    if (selectedStar === 'all') return reviews;
    return reviews.filter((r) => Math.round(r.rating) === selectedStar);
  }, [reviews, selectedStar]);

  return (
    <section
      id="ulasan-pembeli"
      className="scroll-mt-16 border-t border-[#E6DAC8] dark:border-[#332820] bg-[#FAF6F0] dark:bg-[#14100D]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Editorial Header & Rating Ledger */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-[#E6DAC8] dark:border-[#332820]">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#231914] dark:text-[#FAF2E8]">
              Ulasan Pelanggan
            </h2>
            <p className="text-sm text-[#6B584C] dark:text-[#BBA798] mt-1.5 leading-relaxed">
              Evaluasi dan rating jujur dari pembeli setelah memesan Dimsum &amp; Kripik Pisang
              Coklat di dapur kami.
            </p>
          </div>

          {/* Summary Score + Compact Distribution */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-bold tracking-tight text-[#231914] dark:text-[#FAF2E8] tabular-nums">
                {summary.totalCount > 0 ? summary.averageRating.toFixed(1) : '0.0'}
              </span>
              <div>
                <div className="flex items-center gap-0.5 text-[#D98A43]" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(summary.averageRating)
                          ? 'fill-[#D98A43] text-[#D98A43]'
                          : 'text-[#DDD0BE] dark:text-[#3A2E25]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[#6B584C] dark:text-[#BBA798] mt-1 tabular-nums">
                  {summary.totalCount} ulasan terverifikasi pesanan
                </p>
              </div>
            </div>

            {summary.totalCount > 0 && (
              <div className="hidden sm:grid grid-cols-1 gap-1 min-w-[170px]">
                {([5, 4, 3] as const).map((star) => {
                  const count = summary.distribution[star];
                  const pct = summary.totalCount ? Math.round((count / summary.totalCount) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-[11px] tabular-nums">
                      <span className="w-6 font-mono text-[#6B584C] dark:text-[#BBA798]">
                        {star}★
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-[#E6DAC8] dark:bg-[#2B221B] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#9A521C] dark:bg-[#D98A43] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-5 text-right font-mono text-[#6B584C] dark:text-[#BBA798]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Clean Rating Filter Controls */}
        {reviews.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 pb-8">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter bintang ulasan">
              <button
                type="button"
                onClick={() => setSelectedStar('all')}
                aria-pressed={selectedStar === 'all'}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedStar === 'all'
                    ? 'bg-[#9A521C] text-white dark:bg-[#D98A43] dark:text-[#1A110B]'
                    : 'bg-[#FFFDF9] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921] text-[#4C3B31] dark:text-[#EFE4D8] hover:border-[#CBB69F] dark:hover:border-[#4B3B2F]'
                }`}
              >
                Semua ({reviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5];
                if (count === 0) return null;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStar(star)}
                    aria-pressed={selectedStar === star}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                      selectedStar === star
                        ? 'bg-[#9A521C] text-white dark:bg-[#D98A43] dark:text-[#1A110B]'
                        : 'bg-[#FFFDF9] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921] text-[#4C3B31] dark:text-[#EFE4D8] hover:border-[#CBB69F] dark:hover:border-[#4B3B2F]'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-[#D98A43] text-[#D98A43]" aria-hidden="true" />
                    <span>
                      {star} ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onExploreMenu}
              className="text-xs font-medium text-[#9A521C] dark:text-[#E59D5B] hover:underline cursor-pointer"
            >
              Pesan sekarang untuk beri ulasan →
            </button>
          </div>
        )}

        {/* Editorial 3-Column Open-Ledger Review Grid */}
        {filteredReviews.length === 0 ? (
          <div className="py-10 text-center space-y-2 border-t border-[#E6DAC8] dark:border-[#332820] mt-4">
            <p className="text-sm font-semibold text-[#231914] dark:text-[#FAF2E8]">
              {reviews.length === 0
                ? 'Belum ada ulasan pelanggan'
                : `Belum ada ulasan dengan rating ${selectedStar} bintang`}
            </p>
            <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
              Setelah mengirim pesanan, Anda dapat langsung memberi rating &amp; evaluasi di layar
              konfirmasi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
            {filteredReviews.map((review, index) => {
              const formattedDate = new Date(review.createdAt).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <motion.article
                  key={review.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.2) }}
                  className="pt-5 border-t border-[#DECBB7] dark:border-[#342921] flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="flex items-center gap-0.5"
                        aria-label={`Rating ${review.rating} dari 5 bintang`}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= review.rating
                                ? 'fill-[#D98A43] text-[#D98A43]'
                                : 'text-[#DDD0BE] dark:text-[#3A2E25]'
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[11px] text-[#6B584C] dark:text-[#BBA798] tabular-nums">
                        {review.rating}/5 · {formattedDate}
                      </span>
                    </div>

                    <p className="text-sm text-[#3B2C24] dark:text-[#EFE4D8] leading-relaxed">
                      “{review.comment}”
                    </p>
                  </div>

                  <div className="text-xs text-[#6B584C] dark:text-[#BBA798] space-y-0.5">
                    <p className="font-semibold text-[#231914] dark:text-[#FAF2E8]">
                      {review.customerName}
                    </p>
                    <p className="truncate" title={review.itemsSummary}>
                      Membeli: {review.itemsSummary}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
