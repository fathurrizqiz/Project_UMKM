import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, RotateCcw, Star, Trash2, X } from 'lucide-react';
import type { Order, OrderReview, Review, StoreSettings } from '../types/store';
import { buildWhatsappUrl, formatRupiah } from '../utils/storeLogic';

interface OrderHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  settings: StoreSettings;
  onReorder: (order: Order) => void;
  onClearHistory: () => void;
  onReviewSubmitted: (orderCode: string, orderReview: OrderReview, review: Review) => void;
}

export function OrderHistoryDrawer({
  isOpen,
  onClose,
  orders,
  settings,
  onReorder,
  onClearHistory,
  onReviewSubmitted,
}: OrderHistoryDrawerProps) {
  const [activeReviewOrderCode, setActiveReviewOrderCode] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState(5);
  const [draftComment, setDraftComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const openInlineReview = (orderCode: string) => {
    setActiveReviewOrderCode(orderCode);
    setDraftRating(5);
    setDraftComment('');
    setReviewError('');
  };

  const handleSubmitInlineReview = async (e: FormEvent, order: Order) => {
    e.preventDefault();
    setReviewError('');

    const trimmed = draftComment.trim();
    if (trimmed.length < 4) {
      setReviewError('Tuliskan ulasan singkat minimal 4 karakter.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: order.orderCode,
          customerName: order.customerName,
          itemsSummary: order.items.map((i) => i.name).join(', '),
          rating: draftRating,
          comment: trimmed,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setReviewError(payload.error || 'Gagal mengirim ulasan.');
        return;
      }

      const created: Review = payload.review;
      const orderReview: OrderReview = {
        rating: created.rating,
        comment: created.comment,
        createdAt: created.createdAt,
      };
      onReviewSubmitted(order.orderCode, orderReview, created);
      setActiveReviewOrderCode(null);
      setDraftComment('');
    } catch {
      setReviewError('Gangguan jaringan saat mengirim ulasan.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-drawer-title"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="w-full max-w-lg h-full bg-[#FFFDF9] dark:bg-[#181310] border-l border-[#E2D4C3] dark:border-[#342921] flex flex-col shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-[#E6DAC8] dark:border-[#332820] flex items-center justify-between gap-4">
              <div>
                <h2
                  id="history-drawer-title"
                  className="font-display text-xl font-bold text-[#231914] dark:text-[#FAF2E8]"
                >
                  Riwayat Pemesanan
                </h2>
                <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                  Tersimpan otomatis di perangkat Anda (localStorage)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {orders.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6B584C] hover:text-red-600 dark:text-[#BBA798] dark:hover:text-red-400 hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Bersihkan</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup riwayat pemesanan"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#6B584C] hover:text-[#231914] dark:text-[#BBA798] dark:hover:text-[#FAF2E8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {orders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8]">
                    Belum ada riwayat pesanan
                  </p>
                  <p className="text-sm text-[#6B584C] dark:text-[#BBA798] max-w-xs mx-auto">
                    Setiap pesanan yang Anda kirim lewat WhatsApp akan otomatis tersimpan di sini
                    agar mudah dipantau atau dipesan ulang.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-[#9A521C] dark:bg-[#D98A43] text-white dark:text-[#1A110B] text-sm font-medium cursor-pointer"
                  >
                    Mulai Pesan Menu
                  </button>
                </div>
              ) : (
                orders.map((order) => {
                  const formattedDate = new Date(order.createdAt).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const waUrl = buildWhatsappUrl(settings.adminWhatsapp, order.whatsappMessage);
                  const isReviewFormOpen = activeReviewOrderCode === order.orderCode;

                  return (
                    <article
                      key={order.id}
                      className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0]/90 dark:bg-[#1D1713] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-bold text-[#231914] dark:text-[#FAF2E8]">
                            {order.orderCode}
                          </p>
                          <p className="text-xs font-medium text-[#4C3B31] dark:text-[#EFE4D8] mt-0.5">
                            {order.customerName} <span aria-hidden="true">·</span>{' '}
                            {order.paymentMethod}
                          </p>
                          <p className="text-[11px] text-[#6B584C] dark:text-[#BBA798] mt-0.5 line-clamp-1">
                            {formattedDate} <span aria-hidden="true">·</span>{' '}
                            {order.customerAddress}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            order.status === 'Selesai'
                              ? 'text-[#9A521C] dark:text-[#F0B57D]'
                              : order.status === 'Dibatalkan'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-[#B45309] dark:text-[#E59D5B]'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <ul className="text-xs text-[#4C3B31] dark:text-[#EFE4D8] space-y-1 border-y border-[#E6DAC8] dark:border-[#332820] py-2.5">
                        {order.items.map((item, idx) => (
                          <li key={`${order.id}-${idx}`} className="flex justify-between gap-2">
                            <span className="truncate">
                              {item.name} × {item.quantity}
                            </span>
                            <span className="font-mono tabular-nums shrink-0">
                              {formatRupiah(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B584C] dark:text-[#BBA798]">
                          {order.paymentProofDataUrl
                            ? 'Bukti pembayaran terlampir'
                            : 'Tanpa lampiran bukti'}
                        </span>
                        <span className="font-mono tabular-nums text-sm font-bold text-[#231914] dark:text-[#FAF2E8]">
                          {formatRupiah(order.totalAmount)}
                        </span>
                      </div>

                      {order.review && (
                        <div className="rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#14100D] px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#9A521C] dark:text-[#F0B57D]">
                              Ulasan Anda
                            </span>
                            <span className="font-mono font-semibold text-[#9A521C] dark:text-[#D98A43] tabular-nums">
                              ★ {order.review.rating}/5
                            </span>
                          </div>
                          <p className="text-[#4C3B31] dark:text-[#EADCCF] mt-1 leading-relaxed">
                            “{order.review.comment}”
                          </p>
                        </div>
                      )}

                      {isReviewFormOpen && !order.review && (
                        <form
                          onSubmit={(e) => handleSubmitInlineReview(e, order)}
                          className="rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#14100D] p-3 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#231914] dark:text-[#FAF2E8]">
                              Beri Rating Pesanan Ini
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setDraftRating(star)}
                                  aria-label={`Beri ${star} bintang untuk ${order.orderCode}`}
                                  className="p-0.5 cursor-pointer"
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      star <= draftRating
                                        ? 'fill-[#D98A43] text-[#D98A43]'
                                        : 'text-[#D6C5B3] dark:text-[#44352B]'
                                    }`}
                                    aria-hidden="true"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={draftComment}
                            onChange={(e) => setDraftComment(e.target.value)}
                            placeholder="Bagaimana rasa dan layanan pesanan ini?"
                            className="w-full px-2.5 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#181310] text-xs text-[#231914] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30"
                          />
                          {reviewError && (
                            <p role="alert" className="text-[11px] font-medium text-red-600 dark:text-red-400">
                              {reviewError}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={isSubmittingReview}
                              className="px-3 py-1.5 rounded-lg bg-[#9A521C] dark:bg-[#D98A43] text-white dark:text-[#1A110B] text-xs font-semibold disabled:opacity-60 cursor-pointer"
                            >
                              {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveReviewOrderCode(null)}
                              className="px-3 py-1.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] text-xs text-[#6B584C] dark:text-[#BBA798] cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </form>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-xs font-semibold transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Kirim ke WhatsApp</span>
                        </a>
                        {!order.review && order.status !== 'Dibatalkan' && !isReviewFormOpen && (
                          <button
                            type="button"
                            onClick={() => openInlineReview(order.orderCode)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#D98A43]/45 bg-[#D98A43]/12 text-[#9A521C] dark:text-[#F0B57D] hover:bg-[#D98A43]/22 text-xs font-semibold cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-[#D98A43] text-[#D98A43]" aria-hidden="true" />
                            <span>Beri Rating</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onReorder(order)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#14100D] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-[#2B1F18] dark:text-[#EFE4D8] text-xs font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Pesan Lagi</span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
