import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  CheckCircle2,
  Copy,
  MessageCircle,
  Minus,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  CartItem,
  Order,
  OrderReview,
  PaymentMethod,
  Review,
  StoreSettings,
} from '../types/store';
import { calculateCartTotal, formatRupiah } from '../utils/storeLogic';
import { SafeImage } from './SafeImage';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  settings: StoreSettings;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onOrderSuccess: (order: Order) => void;
  onReviewSubmitted: (orderCode: string, orderReview: OrderReview, review: Review) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'QRIS', label: 'QRIS', hint: 'Scan via semua e-wallet & m-banking' },
  { value: 'Transfer Bank', label: 'Transfer Bank', hint: 'Transfer ke rekening resmi toko' },
  { value: 'E-Wallet', label: 'E-Wallet', hint: 'DANA · GoPay · OVO · ShopeePay' },
  { value: 'COD', label: 'COD (Bayar di Tempat)', hint: 'Bayar tunai saat kurir tiba' },
];

export function CartCheckoutDrawer({
  isOpen,
  onClose,
  cart,
  settings,
  onUpdateQuantity,
  onRemoveItem,
  onOrderSuccess,
  onReviewSubmitted,
}: CartCheckoutDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [selectedBankId, setSelectedBankId] = useState(settings.bankAccounts[0]?.id || '');
  const [selectedEWalletId, setSelectedEWalletId] = useState(settings.eWallets[0]?.id || '');
  const [proofDataUrl, setProofDataUrl] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [completedResult, setCompletedResult] = useState<{
    order: Order;
    whatsappUrl: string;
  } | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);

  useEffect(() => {
    if (!selectedBankId && settings.bankAccounts.length > 0) {
      setSelectedBankId(settings.bankAccounts[0].id);
    }
    if (!selectedEWalletId && settings.eWallets.length > 0) {
      setSelectedEWalletId(settings.eWallets[0].id);
    }
  }, [settings, selectedBankId, selectedEWalletId]);

  const totalAmount = calculateCartTotal(cart);
  const selectedBank =
    settings.bankAccounts.find((b) => b.id === selectedBankId) || settings.bankAccounts[0];
  const selectedEWallet =
    settings.eWallets.find((w) => w.id === selectedEWalletId) || settings.eWallets[0];

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1800);
    } catch {
      setCopiedId('');
    }
  };

  const handleProofFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File bukti pembayaran harus berupa gambar (PNG/JPG/WEBP).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofDataUrl(reader.result);
        setProofFileName(file.name);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError('Keranjang masih kosong. Pilih menu terlebih dahulu.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setError('Mohon lengkapi nama, nomor WhatsApp, dan alamat pengiriman.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          notes: notes.trim(),
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          selectedBankId: paymentMethod === 'Transfer Bank' ? selectedBank?.id : undefined,
          selectedEWalletId: paymentMethod === 'E-Wallet' ? selectedEWallet?.id : undefined,
          paymentProofDataUrl: paymentMethod !== 'COD' ? proofDataUrl : undefined,
          paymentProofName: paymentMethod !== 'COD' ? proofFileName : undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Gagal membuat pesanan. Silakan coba kembali.');
        return;
      }

      setCompletedResult({
        order: payload.order,
        whatsappUrl: payload.whatsappUrl,
      });
      setReviewRating(5);
      setReviewComment('');
      setReviewError('');
      setSubmittedReview(null);
      onOrderSuccess(payload.order);
      setProofDataUrl('');
      setProofFileName('');
      setNotes('');
    } catch {
      setError('Terjadi gangguan jaringan. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!completedResult) return;
    setReviewError('');

    const trimmed = reviewComment.trim();
    if (trimmed.length < 4) {
      setReviewError('Tuliskan ulasan singkat minimal 4 karakter.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const itemsSummary = completedResult.order.items.map((item) => item.name).join(', ');
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: completedResult.order.orderCode,
          customerName: completedResult.order.customerName,
          itemsSummary,
          rating: reviewRating,
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
      setSubmittedReview(created);
      onReviewSubmitted(completedResult.order.orderCode, orderReview, created);
    } catch {
      setReviewError('Gangguan jaringan saat mengirim ulasan. Coba lagi.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCloseDrawer = () => {
    setCompletedResult(null);
    setError('');
    setReviewError('');
    setReviewComment('');
    setSubmittedReview(null);
    onClose();
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
          aria-labelledby="cart-drawer-title"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="w-full max-w-lg h-full bg-[#FFFDF9] dark:bg-[#181310] border-l border-[#E2D4C3] dark:border-[#342921] flex flex-col shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#E6DAC8] dark:border-[#332820] flex items-center justify-between gap-4">
              <div>
                <h2
                  id="cart-drawer-title"
                  className="font-display text-xl font-bold text-[#231914] dark:text-[#FAF2E8]"
                >
                  {completedResult ? 'Pesanan & Notifikasi Terkirim' : 'Keranjang & Checkout'}
                </h2>
                <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                  {completedResult
                    ? `Kode Pesanan: ${completedResult.order.orderCode}`
                    : 'Tanpa perlu login · Langsung kirim ke WhatsApp'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawer}
                aria-label="Tutup keranjang"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#6B584C] hover:text-[#231914] dark:text-[#BBA798] dark:hover:text-[#FAF2E8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {completedResult ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#9A521C]/35 dark:border-[#D98A43]/40 bg-[#9A521C]/8 dark:bg-[#D98A43]/15 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="w-5 h-5 text-[#9A521C] dark:text-[#E59D5B] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="text-sm">
                        <p className="font-semibold text-[#7D4013] dark:text-[#F6DFC7]">
                          Notifikasi Pesan Otomatis Aktif
                        </p>
                        <p className="text-[#4C3B31] dark:text-[#EADCCF] text-xs mt-1 leading-relaxed">
                          Pesanan{' '}
                          <span className="font-mono font-semibold">
                            {completedResult.order.orderCode}
                          </span>{' '}
                          senilai{' '}
                          <span className="font-mono font-semibold">
                            {formatRupiah(completedResult.order.totalAmount)}
                          </span>{' '}
                          telah dicatat untuk Admin dan disimpan ke Riwayat Pemesanan perangkat
                          Anda.
                          {completedResult.order.paymentProofDataUrl
                            ? ' Tangkapan layar bukti pembayaran Anda otomatis terlampir dan memicu notifikasi ke Admin.'
                            : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#1D1713] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#4C3B31] dark:text-[#EFE4D8]">
                        Pratinjau Pesan WhatsApp untuk Admin
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText('wa-msg', completedResult.order.whatsappMessage)
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#9A521C] dark:text-[#E59D5B] hover:underline cursor-pointer"
                      >
                        {copiedId === 'wa-msg' ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Salin Pesan</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-[#4C3B31] dark:text-[#EADCCF] leading-relaxed max-h-56 overflow-y-auto">
                      {completedResult.order.whatsappMessage}
                    </pre>
                  </div>

                  <a
                    href={completedResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-sm font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Buka WhatsApp &amp; Kirim ke Admin</span>
                  </a>

                  {/* Post-Order Evaluation & Rating Section */}
                  <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#1D1713] p-4 space-y-3">
                    {submittedReview ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#9A521C] dark:text-[#F0B57D]">
                            Terima kasih! Ulasan Anda sudah tampil di halaman utama.
                          </p>
                          <span className="font-mono text-xs font-bold text-[#9A521C] dark:text-[#D98A43] tabular-nums">
                            {submittedReview.rating}/5 ★
                          </span>
                        </div>
                        <p className="text-xs text-[#4C3B31] dark:text-[#EADCCF] leading-relaxed">
                          “{submittedReview.comment}”
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[#231914] dark:text-[#FAF2E8]">
                            Evaluasi &amp; Rating Pesanan
                          </h3>
                          <p className="text-xs text-[#6B584C] dark:text-[#BBA798] mt-0.5">
                            Bagikan kesan Anda memesan di Dapur Hangat agar pengunjung lain bisa
                            melihat ulasannya.
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5" role="group" aria-label="Pilih rating bintang">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= reviewRating;
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                aria-label={`Beri ${star} bintang`}
                                aria-pressed={reviewRating === star}
                                className="p-1 rounded hover:bg-[#EFE4D5] dark:hover:bg-[#2E241D] transition-colors cursor-pointer"
                              >
                                <Star
                                  className={`w-6 h-6 transition-colors ${
                                    active
                                      ? 'fill-[#D98A43] text-[#D98A43]'
                                      : 'text-[#D6C5B3] dark:text-[#44352B]'
                                  }`}
                                  aria-hidden="true"
                                />
                              </button>
                            );
                          })}
                          <span className="ml-2 font-mono text-xs font-semibold text-[#4C3B31] dark:text-[#EFE4D8] tabular-nums">
                            {reviewRating}/5
                          </span>
                        </div>

                        <div>
                          <label htmlFor="post-order-review-comment" className="sr-only">
                            Tulis ulasan pesanan Anda
                          </label>
                          <textarea
                            id="post-order-review-comment"
                            rows={2}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Contoh: Proses pesan via WhatsApp cepat, dimsumnya hangat dan kripiknya renyah!"
                            className="w-full px-3 py-2 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#14100D] text-xs sm:text-sm text-[#231914] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30"
                          />
                        </div>

                        {reviewError && (
                          <p
                            role="alert"
                            className="text-xs font-medium text-red-600 dark:text-red-400"
                          >
                            {reviewError}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="w-full py-2.5 rounded-lg border border-[#9A521C] dark:border-[#D98A43] bg-[#FFFDF9] dark:bg-transparent text-[#9A521C] dark:text-[#E59D5B] hover:bg-[#9A521C] hover:text-white dark:hover:bg-[#D98A43] dark:hover:text-[#1A110B] disabled:opacity-60 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {isSubmittingReview ? 'Mengirim Ulasan...' : 'Kirim Ulasan'}
                        </button>
                      </form>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className="w-full py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] text-sm font-medium text-[#4C3B31] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
                  >
                    Kembali ke Katalog
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8]">
                    Keranjang Anda masih kosong
                  </p>
                  <p className="text-sm text-[#6B584C] dark:text-[#BBA798] max-w-xs mx-auto">
                    Tambahkan Dimsum hangat atau Kripik Pisang Coklat dari menu untuk mulai memesan.
                  </p>
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className="px-4 py-2 rounded-lg bg-[#9A521C] dark:bg-[#D98A43] text-white dark:text-[#1A110B] text-sm font-medium cursor-pointer"
                  >
                    Pilih Menu
                  </button>
                </div>
              ) : (
                <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
                  {/* Itemized List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wide text-[#6B584C] dark:text-[#BBA798]">
                      Ringkasan Item ({cart.reduce((s, i) => s + i.quantity, 0)})
                    </h3>
                    <ul className="divide-y divide-[#E6DAC8] dark:divide-[#332820] border border-[#E2D4C3] dark:border-[#342921] rounded-xl bg-[#FAF6F0]/75 dark:bg-[#1D1713]">
                      {cart.map((item) => (
                        <li key={item.productId} className="p-3.5 flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F3ECE1] dark:bg-[#261E19] shrink-0">
                            <SafeImage
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#231914] dark:text-[#FAF2E8] truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-[#6B584C] dark:text-[#BBA798] font-mono tabular-nums">
                              {formatRupiah(item.price)} · {item.unitLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.productId, -1)}
                              aria-label={`Kurangi ${item.name}`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#14100D] text-[#3B2C24] dark:text-[#EFE4D8] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <span className="w-6 text-center text-xs font-mono tabular-nums font-semibold text-[#231914] dark:text-[#FAF2E8]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= item.maxStock}
                              onClick={() => onUpdateQuantity(item.productId, 1)}
                              aria-label={`Tambah ${item.name}`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#14100D] text-[#3B2C24] dark:text-[#EFE4D8] disabled:opacity-40 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.productId)}
                              aria-label={`Hapus ${item.name}`}
                              className="w-7 h-7 inline-flex items-center justify-center rounded text-[#8A7363] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wide text-[#6B584C] dark:text-[#BBA798]">
                      Data Pengiriman (Tanpa Login)
                    </h3>
                    <div>
                      <label
                        htmlFor="checkout-name"
                        className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1"
                      >
                        Nama Pemesan *
                      </label>
                      <input
                        id="checkout-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Siti Rahmawati"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-sm text-[#231914] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-phone"
                        className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1"
                      >
                        Nomor WhatsApp Aktif *
                      </label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-sm text-[#231914] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-address"
                        className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1"
                      >
                        Alamat Lengkap Pengiriman *
                      </label>
                      <textarea
                        id="checkout-address"
                        required
                        rows={2}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Jalan, nomor rumah, patokan, atau detail kurir"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-sm text-[#231914] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-notes"
                        className="block text-xs font-medium text-[#4C3B31] dark:text-[#EADCCF] mb-1"
                      >
                        Catatan Pesanan (Opsional)
                      </label>
                      <input
                        id="checkout-notes"
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Misal: chili oil ekstra, kirim jam 4 sore"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] text-sm text-[#231914] dark:text-[#FAF2E8] focus:outline-none focus:ring-2 focus:ring-[#9A521C]/30"
                      />
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wide text-[#6B584C] dark:text-[#BBA798]">
                      Metode Pembayaran Digital
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const active = paymentMethod === method.value;
                        return (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setPaymentMethod(method.value)}
                            aria-pressed={active}
                            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                              active
                                ? 'border-[#9A521C] dark:border-[#D98A43] bg-[#9A521C]/8 dark:bg-[#D98A43]/15'
                                : 'border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9] dark:bg-[#1D1713] hover:border-[#CBB69F] dark:hover:border-[#4B3B2F]'
                            }`}
                          >
                            <p className="text-sm font-semibold text-[#231914] dark:text-[#FAF2E8]">
                              {method.label}
                            </p>
                            <p className="text-[11px] text-[#6B584C] dark:text-[#BBA798] mt-0.5 line-clamp-1">
                              {method.hint}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#1D1713] p-4 space-y-3">
                      {paymentMethod === 'QRIS' && (
                        <div className="flex flex-col items-center text-center space-y-2.5">
                          <p className="text-xs font-semibold text-[#3B2C24] dark:text-[#EFE4D8]">
                            Scan QRIS {settings.qrisMerchantName}
                          </p>
                          <div className="w-52 rounded-xl overflow-hidden border border-[#E2D4C3] dark:border-[#342921] bg-white p-2">
                            <SafeImage
                              src={settings.qrisImageUrl}
                              alt={`Kode QRIS ${settings.qrisMerchantName}`}
                              className="w-full h-auto object-contain"
                              fallbackTitle="QRIS Toko"
                            />
                          </div>
                          <p className="text-xs text-[#5C4B40] dark:text-[#CBB8A9]">
                            Total bayar:{' '}
                            <span className="font-mono tabular-nums font-bold text-[#231914] dark:text-[#FAF2E8]">
                              {formatRupiah(totalAmount)}
                            </span>
                          </p>
                        </div>
                      )}

                      {paymentMethod === 'Transfer Bank' && (
                        <div className="space-y-2.5">
                          <p className="text-xs font-semibold text-[#3B2C24] dark:text-[#EFE4D8]">
                            Pilih Rekening Tujuan Transfer:
                          </p>
                          {settings.bankAccounts.map((bank) => {
                            const isChosen = selectedBank?.id === bank.id;
                            return (
                              <div
                                key={bank.id}
                                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                                  isChosen
                                    ? 'border-[#9A521C] dark:border-[#D98A43] bg-[#FFFDF9] dark:bg-[#14100D]'
                                    : 'border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9]/70 dark:bg-[#14100D]/50'
                                }`}
                              >
                                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="radio"
                                    name="bankAccount"
                                    checked={isChosen}
                                    onChange={() => setSelectedBankId(bank.id)}
                                    className="accent-[#9A521C]"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#231914] dark:text-[#FAF2E8]">
                                      Bank {bank.bankName}
                                    </p>
                                    <p className="font-mono tabular-nums text-sm font-semibold text-[#9A521C] dark:text-[#F0B57D]">
                                      {bank.accountNumber}
                                    </p>
                                    <p className="text-[11px] text-[#6B584C] dark:text-[#BBA798] truncate">
                                      a.n. {bank.accountHolder}
                                    </p>
                                  </div>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(bank.id, bank.accountNumber)}
                                  className="px-2.5 py-1.5 rounded border border-[#E2D4C3] dark:border-[#342921] text-xs font-medium text-[#3B2C24] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  {copiedId === bank.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-[#9A521C] dark:text-[#D98A43]" aria-hidden="true" />
                                      <span>Disalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {paymentMethod === 'E-Wallet' && (
                        <div className="space-y-2.5">
                          <p className="text-xs font-semibold text-[#3B2C24] dark:text-[#EFE4D8]">
                            Pilih Tujuan E-Wallet:
                          </p>
                          {settings.eWallets.map((ew) => {
                            const isChosen = selectedEWallet?.id === ew.id;
                            return (
                              <div
                                key={ew.id}
                                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                                  isChosen
                                    ? 'border-[#9A521C] dark:border-[#D98A43] bg-[#FFFDF9] dark:bg-[#14100D]'
                                    : 'border-[#E2D4C3] dark:border-[#342921] bg-[#FFFDF9]/70 dark:bg-[#14100D]/50'
                                }`}
                              >
                                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="radio"
                                    name="ewalletAccount"
                                    checked={isChosen}
                                    onChange={() => setSelectedEWalletId(ew.id)}
                                    className="accent-[#9A521C]"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#231914] dark:text-[#FAF2E8]">
                                      {ew.provider}
                                    </p>
                                    <p className="font-mono tabular-nums text-sm font-semibold text-[#9A521C] dark:text-[#F0B57D]">
                                      {ew.number}
                                    </p>
                                    <p className="text-[11px] text-[#6B584C] dark:text-[#BBA798] truncate">
                                      a.n. {ew.accountHolder}
                                    </p>
                                  </div>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(ew.id, ew.number)}
                                  className="px-2.5 py-1.5 rounded border border-[#E2D4C3] dark:border-[#342921] text-xs font-medium text-[#3B2C24] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  {copiedId === ew.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-[#9A521C] dark:text-[#D98A43]" aria-hidden="true" />
                                      <span>Disalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {paymentMethod === 'COD' && (
                        <p className="text-xs text-[#5C4B40] dark:text-[#CBB8A9] leading-relaxed">
                          {settings.codNote || 'Pembayaran tunai dilakukan saat pesanan tiba.'}
                        </p>
                      )}

                      {paymentMethod !== 'COD' && (
                        <div className="pt-3 border-t border-[#E6DAC8] dark:border-[#332820] space-y-2">
                          <label
                            htmlFor="payment-proof-upload"
                            className="block text-xs font-semibold text-[#3B2C24] dark:text-[#EFE4D8]"
                          >
                            Unggah Tangkapan Layar Bukti Pembayaran
                          </label>
                          <p className="text-[11px] text-[#6B584C] dark:text-[#BBA798] leading-relaxed">
                            Saat Anda mengirim pesanan, bukti bayar otomatis tercatat untuk Admin dan
                            mengirim notifikasi ke WhatsApp Admin.
                          </p>
                          <div className="flex items-center gap-3">
                            <label
                              htmlFor="payment-proof-upload"
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D8C5AF] dark:border-[#44352B] bg-[#FFFDF9] dark:bg-[#14100D] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-xs font-medium text-[#2B1F18] dark:text-[#FAF2E8] cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{proofDataUrl ? 'Ganti Gambar' : 'Pilih Tangkapan Layar'}</span>
                            </label>
                            <input
                              id="payment-proof-upload"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProofFileChange(e.target.files?.[0] || null)}
                              className="sr-only"
                            />
                            {proofFileName && (
                              <span className="text-xs text-[#9A521C] dark:text-[#E59D5B] truncate">
                                {proofFileName}
                              </span>
                            )}
                          </div>

                          {proofDataUrl && (
                            <div className="relative mt-2 w-36 rounded-lg overflow-hidden border border-[#E2D4C3] dark:border-[#342921]">
                              <img
                                src={proofDataUrl}
                                alt="Pratinjau bukti pembayaran"
                                className="w-full h-28 object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setProofDataUrl('');
                                  setProofFileName('');
                                }}
                                aria-label="Hapus bukti pembayaran"
                                className="absolute top-1 right-1 w-6 h-6 rounded bg-black/70 text-white inline-flex items-center justify-center cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs font-medium text-red-800 dark:text-red-300"
                    >
                      {error}
                    </div>
                  )}
                </form>
              )}
            </div>

            {!completedResult && cart.length > 0 && (
              <div className="px-6 py-4 border-t border-[#E6DAC8] dark:border-[#332820] bg-[#FFFDF9] dark:bg-[#181310] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B584C] dark:text-[#BBA798]">
                    Total Pembayaran
                  </span>
                  <span className="font-mono tabular-nums text-lg font-bold text-[#231914] dark:text-[#FAF2E8]">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] disabled:opacity-60 text-white text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isSubmitting
                      ? 'Memproses Pesanan...'
                      : 'Pesan & Kirim Notifikasi WhatsApp'}
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
