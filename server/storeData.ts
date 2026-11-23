import fs from 'fs';
import path from 'path';
import type {
  AdminNotification,
  Order,
  OrderStatus,
  Product,
  Review,
  StoreSettings,
} from '../src/types/store';

export interface StoreDatabase {
  products: Product[];
  settings: StoreSettings;
  orders: Order[];
  notifications: AdminNotification[];
  reviews: Review[];
}

const DATA_DIR = path.resolve(
  process.env.STORE_DATA_DIR || path.resolve(process.cwd(), 'data'),
);
const DATA_FILE = path.join(DATA_DIR, 'store.json');

export function createInitialSeed(): StoreDatabase {
  return {
    products: [],
    settings: {
      storeName: 'Dapur Hangat',
      adminWhatsapp: '6281234567890',
      qrisImageUrl: '',
      qrisMerchantName: 'DAPUR HANGAT ID',
      bankAccounts: [],
      eWallets: [],
      codNote: 'Pengantaran langsung area kota, bayar tunai saat pesanan diterima.',
    },
    orders: [],
    notifications: [],
    reviews: [],
  };
}

export function loadDatabase(): StoreDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seed = createInitialSeed();
    saveDatabase(seed);
    return seed;
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as StoreDatabase;
  if (!parsed || !Array.isArray(parsed.products) || !parsed.settings) {
    throw new Error(`Invalid store data in ${DATA_FILE}`);
  }

  let migrated = false;
  if (!Array.isArray(parsed.orders)) {
    parsed.orders = [];
    migrated = true;
  }
  if (!Array.isArray(parsed.notifications)) {
    parsed.notifications = [];
    migrated = true;
  }
  if (!Array.isArray(parsed.reviews)) {
    parsed.reviews = [];
    migrated = true;
  }
  if (migrated) saveDatabase(parsed);

  return parsed;
}

export function saveDatabase(db: StoreDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return [
    'Menunggu Pembayaran',
    'Menunggu Verifikasi',
    'Diproses',
    'Dikirim',
    'Selesai',
    'Dibatalkan',
  ].includes(status);
}
