export type ProductCategory = 'Dimsum' | 'Kripik Pisang Coklat';

export type CategoryFilter = 'Semua' | ProductCategory;

export type SortOption = 'default' | 'cheapest' | 'expensive';

export type PaymentMethod = 'QRIS' | 'Transfer Bank' | 'E-Wallet' | 'COD';

export type OrderStatus =
  | 'Menunggu Pembayaran'
  | 'Menunggu Verifikasi'
  | 'Diproses'
  | 'Dikirim'
  | 'Selesai'
  | 'Dibatalkan';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  unitLabel: string;
  description: string;
  imageUrl: string;
  featured?: boolean;
  active: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface EWalletAccount {
  id: string;
  provider: string;
  number: string;
  accountHolder: string;
}

export interface StoreSettings {
  storeName: string;
  adminWhatsapp: string;
  qrisImageUrl: string;
  qrisMerchantName: string;
  bankAccounts: BankAccount[];
  eWallets: EWalletAccount[];
  codNote: string;
}

export interface CartItem {
  productId: string;
  name: string;
  category: ProductCategory;
  price: number;
  quantity: number;
  unitLabel: string;
  imageUrl: string;
  maxStock: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  category: ProductCategory;
  price: number;
  quantity: number;
  unitLabel: string;
}

export interface OrderReview {
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderCode: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  selectedBankId?: string;
  selectedEWalletId?: string;
  paymentAccountSummary?: string;
  paymentProofDataUrl?: string;
  paymentProofName?: string;
  status: OrderStatus;
  whatsappNotificationSent: boolean;
  whatsappMessage: string;
  review?: OrderReview;
}

export interface Review {
  id: string;
  orderCode: string;
  customerName: string;
  itemsSummary: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  hasPaymentProof: boolean;
  messagePreview: string;
  createdAt: string;
  read: boolean;
}
