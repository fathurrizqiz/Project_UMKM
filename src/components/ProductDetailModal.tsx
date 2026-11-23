import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, Share2, ShoppingBag, X } from 'lucide-react';
import type { Product } from '../types/store';
import { formatRupiah } from '../utils/storeLogic';
import { SafeImage } from './SafeImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onShare: (product: Product) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onShare,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  const outOfStock = product ? product.stock <= 0 : false;
  const clampedQty = product ? Math.min(Math.max(1, quantity), Math.max(1, product.stock)) : 1;

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl rounded-2xl bg-[#FFFDF9] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921] overflow-hidden shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-6 bg-[#F3ECE1] dark:bg-[#14100D] aspect-[4/3] md:aspect-auto">
                <SafeImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  fallbackTitle={product.name}
                />
              </div>
              <div className="md:col-span-6 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-xs text-[#6B584C] dark:text-[#BBA798]">
                      {product.category} <span aria-hidden="true">·</span> {product.unitLabel}
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Tutup detail produk"
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#6B584C] hover:text-[#231914] dark:text-[#BBA798] dark:hover:text-[#FAF2E8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <h3
                    id="detail-modal-title"
                    className="font-display text-2xl font-bold text-[#231914] dark:text-[#FAF2E8] mb-2"
                  >
                    {product.name}
                  </h3>

                  <div className="flex items-baseline justify-between gap-2 mb-4">
                    <span className="font-mono tabular-nums text-xl font-bold text-[#9A521C] dark:text-[#F0B57D]">
                      {formatRupiah(product.price)}
                    </span>
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        outOfStock
                          ? 'text-red-700 dark:text-red-400'
                          : product.stock <= 5
                            ? 'text-[#B45309] dark:text-[#F5B06C]'
                            : 'text-[#9A521C] dark:text-[#E59D5B]'
                      }`}
                    >
                      {outOfStock ? 'Stok Habis' : `Tersedia ${product.stock} stok`}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-[#5C4B40] dark:text-[#CBB8A9] mb-6">
                    {product.description}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#E6DAC8] dark:border-[#332820]">
                  {!outOfStock && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6B584C] dark:text-[#BBA798]">
                        Jumlah Pesanan
                      </span>
                      <div className="inline-flex items-center border border-[#E2D4C3] dark:border-[#342921] rounded-lg">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          aria-label="Kurangi jumlah"
                          className="w-9 h-9 inline-flex items-center justify-center text-[#3B2C24] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <span className="w-10 text-center font-mono tabular-nums text-sm font-semibold text-[#231914] dark:text-[#FAF2E8]">
                          {clampedQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                          aria-label="Tambah jumlah"
                          className="w-9 h-9 inline-flex items-center justify-center text-[#3B2C24] dark:text-[#EFE4D8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => {
                        onAddToCart(product, clampedQty);
                        onClose();
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] disabled:bg-[#E6DAC8] dark:disabled:bg-[#2A201A] disabled:text-[#8A7363] text-white text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                      <span>{outOfStock ? 'Stok Habis' : 'Tambah ke Keranjang'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onShare(product)}
                      aria-label={`Bagikan ${product.name}`}
                      className="px-3.5 py-2.5 rounded-lg border border-[#E2D4C3] dark:border-[#342921] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-[#3B2C24] dark:text-[#EFE4D8] inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                      <span>Bagikan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
