import type { StoreSettings } from '../types/store';

interface HowToOrderSectionProps {
  settings: StoreSettings;
  onOpenAdmin: () => void;
}

export function HowToOrderSection({ settings, onOpenAdmin }: HowToOrderSectionProps) {
  return (
    <section
      id="cara-pesan"
      className="scroll-mt-16 border-t border-[#E6DAC8] dark:border-[#332820] bg-[#F3ECE1]/80 dark:bg-[#1B1511]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#231914] dark:text-[#FAF2E8]">
            Alur Pemesanan Praktis
          </h2>
          <p className="text-sm text-[#6B584C] dark:text-[#BBA798] mt-1.5 leading-relaxed">
            Dari dapur rumahan langsung ke meja Anda dalam tiga langkah tanpa perlu membuat akun.
          </p>
        </div>

        {/* Open Editorial 3-Column Ledger */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="pt-4 border-t border-[#D8C5AF] dark:border-[#3D3026]">
            <span className="font-display text-2xl font-bold text-[#9A521C] dark:text-[#E59D5B] block mb-2">
              01
            </span>
            <h3 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8] mb-1.5">
              Pilih Menu Favorit
            </h3>
            <p className="text-sm text-[#6B584C] dark:text-[#BBA798] leading-relaxed">
              Filter kategori Dimsum atau Kripik Pisang Coklat, cari varian favorit, dan urutkan
              dari harga termurah atau termahal.
            </p>
          </div>

          <div className="pt-4 border-t border-[#D8C5AF] dark:border-[#3D3026]">
            <span className="font-display text-2xl font-bold text-[#9A521C] dark:text-[#E59D5B] block mb-2">
              02
            </span>
            <h3 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8] mb-1.5">
              Bayar &amp; Unggah Bukti
            </h3>
            <p className="text-sm text-[#6B584C] dark:text-[#BBA798] leading-relaxed">
              Scan kode QRIS toko, transfer ke rekening{' '}
              {settings.bankAccounts.map((b) => b.bankName).join(' / ') || 'Bank'}, pakai E-Wallet,
              atau COD lalu unggah tangkapan layar bukti bayar.
            </p>
          </div>

          <div className="pt-4 border-t border-[#D8C5AF] dark:border-[#3D3026]">
            <span className="font-display text-2xl font-bold text-[#9A521C] dark:text-[#E59D5B] block mb-2">
              03
            </span>
            <h3 className="text-base font-semibold text-[#231914] dark:text-[#FAF2E8] mb-1.5">
              Notifikasi WhatsApp Otomatis
            </h3>
            <p className="text-sm text-[#6B584C] dark:text-[#BBA798] leading-relaxed">
              Bukti pembayaran otomatis mengirim notifikasi ke Admin sekaligus menyimpan riwayat
              pesanan di perangkat Anda.
            </p>
          </div>
        </div>

        <footer className="mt-14 pt-6 border-t border-[#E2D4C3] dark:border-[#332820] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#6B584C] dark:text-[#BBA798]">
          <p>
            © {new Date().getFullYear()} {settings.storeName} · Dimsum &amp; Kripik Pisang Coklat
          </p>
          <div className="flex items-center gap-6">
            <a href="#katalog-menu" className="hover:text-[#231914] dark:hover:text-[#FAF2E8]">
              Katalog Menu
            </a>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hover:text-[#231914] dark:hover:text-[#FAF2E8] cursor-pointer"
            >
              Kelola Stok Admin
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
