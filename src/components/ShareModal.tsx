import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Share2, X } from 'lucide-react';
import type { Product } from '../types/store';
import { buildProductShareLinks, formatRupiah } from '../utils/storeLogic';

interface ShareModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ShareModal({ product, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const pageUrl =
    product && typeof window !== 'undefined'
      ? `${window.location.origin}/?produk=${encodeURIComponent(product.id)}`
      : product
        ? `https://dapurhangat.local/?produk=${encodeURIComponent(product.id)}`
        : '';
  const links = product ? buildProductShareLinks(product, pageUrl) : null;

  const handleCopyLink = async () => {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(`${links.shareText} ${pageUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AnimatePresence>
      {product && links && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-2xl bg-[#FFFDF9] dark:bg-[#1D1713] border border-[#E2D4C3] dark:border-[#342921] p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-medium text-[#9A521C] dark:text-[#E59D5B] mb-1">
                  Bagikan Menu Favorit
                </p>
                <h3
                  id="share-modal-title"
                  className="text-lg font-semibold text-[#231914] dark:text-[#FAF2E8]"
                >
                  {product.name}
                </h3>
                <p className="text-sm text-[#6B584C] dark:text-[#BBA798] font-mono tabular-nums mt-0.5">
                  {formatRupiah(product.price)} · {product.unitLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog bagikan"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#6B584C] hover:text-[#231914] dark:text-[#BBA798] dark:hover:text-[#FAF2E8] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-[#5C4B40] dark:text-[#CBB8A9] mb-4 leading-relaxed">
              Promosikan atau ajak teman pesan bersama lewat media sosial di bawah ini:
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#9A521C] hover:bg-[#7D4013] dark:bg-[#D98A43] dark:hover:bg-[#E59D5B] dark:text-[#1A110B] text-white text-sm font-medium transition-colors"
              >
                <span>Bagikan via WhatsApp</span>
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </a>

              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-[#2B1F18] dark:text-[#EFE4D8] text-sm font-medium transition-colors"
              >
                <span>Bagikan ke Facebook</span>
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </a>

              <a
                href={links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#E2D4C3] dark:border-[#342921] bg-[#FAF6F0] dark:bg-[#14100D] hover:bg-[#F3ECE1] dark:hover:bg-[#261E19] text-[#2B1F18] dark:text-[#EFE4D8] text-sm font-medium transition-colors"
              >
                <span>Bagikan ke X / Twitter</span>
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#9A521C]/35 dark:border-[#D98A43]/40 bg-[#9A521C]/8 dark:bg-[#D98A43]/12 hover:bg-[#9A521C]/15 dark:hover:bg-[#D98A43]/20 text-[#9A521C] dark:text-[#F0B57D] text-sm font-medium transition-colors cursor-pointer"
              >
                <span>
                  {copied
                    ? 'Tautan & Info Produk Disalin!'
                    : 'Salin Tautan untuk Instagram / TikTok'}
                </span>
                {copied ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
