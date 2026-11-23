import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomerOrderWhatsappMessage,
  buildProductShareLinks,
  buildWhatsappUrl,
  calculateCartCount,
  calculateCartTotal,
  calculateReviewSummary,
  filterAndSortProducts,
  formatRupiah,
  getHeroFavoriteProducts,
  markOrderReviewedInHistory,
  normalizeWhatsappNumber,
  ORDER_HISTORY_STORAGE_KEY,
  readOrderHistoryFromStorage,
  saveOrderToHistoryStorage,
  upsertCartItem,
} from './storeLogic';
import { parseBase64ImageDataUrl, slugifyImageName } from '../../server/imageStorage';
import type { Order, Product, Review } from '../types/store';

const sampleProducts: Product[] = [
  {
    id: 'p1',
    name: 'Dimsum Ayam Original',
    category: 'Dimsum',
    price: 28000,
    stock: 15,
    unitLabel: '8 pcs + Chili Oil',
    description: 'Dimsum ayam kukus lembut.',
    imageUrl: '/src/assets/images/dimsum_ayam_original_1795090633232.jpg',
    active: true,
  },
  {
    id: 'p2',
    name: 'Kripik Pisang Coklat Lumer',
    category: 'Kripik Pisang Coklat',
    price: 22000,
    stock: 20,
    unitLabel: 'Pouch 200g',
    description: 'Kripik pisang renyah balut coklat.',
    imageUrl: '/src/assets/images/kripik_coklat_lumer_1795090641883.jpg',
    active: true,
  },
  {
    id: 'p3',
    name: 'Kripik Pisang Dark Almond',
    category: 'Kripik Pisang Coklat',
    price: 35000,
    stock: 4,
    unitLabel: 'Jar 300g',
    description: 'Dark chocolate 70% dengan almond panggang.',
    imageUrl: '/src/assets/images/kripik_dark_almond_1795090634518.jpg',
    active: true,
  },
  {
    id: 'p4',
    name: 'Dimsum Mentai Bakar',
    category: 'Dimsum',
    price: 34000,
    stock: 0,
    unitLabel: '6 pcs + Nori',
    description: 'Saus mentai creamy gurih.',
    imageUrl: '/src/assets/images/dimsum_mentai_bakar_1795090633909.jpg',
    active: true,
  },
];

test('formatRupiah formats Indonesian currency cleanly', () => {
  assert.equal(formatRupiah(28000), 'Rp 28.000');
  assert.equal(formatRupiah(0), 'Rp 0');
});

test('normalizeWhatsappNumber converts local 08 prefix to 62', () => {
  assert.equal(normalizeWhatsappNumber('0812-3456-7890'), '6281234567890');
  assert.equal(normalizeWhatsappNumber('+62 812 9999 0000'), '6281299990000');
  assert.equal(normalizeWhatsappNumber('81311112222'), '6281311112222');
});

test('filterAndSortProducts filters by category, search query, and sorts cheapest/expensive', () => {
  const dimsumOnly = filterAndSortProducts(sampleProducts, {
    category: 'Dimsum',
    searchQuery: '',
    sortBy: 'default',
  });
  assert.equal(dimsumOnly.length, 2);
  assert.ok(dimsumOnly.every((p) => p.category === 'Dimsum'));

  const searchAlmond = filterAndSortProducts(sampleProducts, {
    category: 'Semua',
    searchQuery: 'almond',
    sortBy: 'default',
  });
  assert.equal(searchAlmond.length, 1);
  assert.equal(searchAlmond[0].id, 'p3');

  const cheapest = filterAndSortProducts(sampleProducts, {
    category: 'Semua',
    searchQuery: '',
    sortBy: 'cheapest',
  });
  assert.deepEqual(
    cheapest.map((p) => p.price),
    [22000, 28000, 34000, 35000],
  );

  const expensive = filterAndSortProducts(sampleProducts, {
    category: 'Semua',
    searchQuery: '',
    sortBy: 'expensive',
  });
  assert.deepEqual(
    expensive.map((p) => p.price),
    [35000, 34000, 28000, 22000],
  );
});

test('upsertCartItem respects stock ceiling and calculates totals accurately', () => {
  let cart = upsertCartItem([], sampleProducts[2], 2);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);

  // Stock is 4, adding 10 more should clamp to 4
  cart = upsertCartItem(cart, sampleProducts[2], 10);
  assert.equal(cart[0].quantity, 4);

  // Adding out-of-stock item should not add anything
  cart = upsertCartItem(cart, sampleProducts[3], 1);
  assert.equal(cart.length, 1);

  assert.equal(calculateCartCount(cart), 4);
  assert.equal(calculateCartTotal(cart), 140000);

  // Decrementing below 1 removes item
  cart = upsertCartItem(cart, sampleProducts[2], -4);
  assert.equal(cart.length, 0);
});

test('buildCustomerOrderWhatsappMessage includes payment proof notification and order summary', () => {
  const msg = buildCustomerOrderWhatsappMessage({
    orderCode: 'DH-261119-1024',
    storeName: 'Dapur Hangat',
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    customerAddress: 'Jl. Melati No. 12',
    notes: 'Chili oil dipisah',
    items: [
      { name: 'Dimsum Ayam Original', quantity: 2, price: 28000, unitLabel: '8 pcs' },
    ],
    totalAmount: 56000,
    paymentMethod: 'Transfer Bank',
    paymentAccountSummary: 'BCA 1234567890 a.n. Dapur Hangat',
    hasPaymentProof: true,
  });

  assert.match(msg, /DH-261119-1024/);
  assert.match(msg, /Rp 56\.000/);
  assert.match(msg, /Transfer Bank/);
  assert.match(msg, /BCA 1234567890/);
  assert.match(msg, /SUDAH DIUNGGAH/);

  const url = buildWhatsappUrl('081298765432', msg);
  assert.ok(url.startsWith('https://wa.me/6281298765432?text='));
});

test('buildProductShareLinks returns valid WhatsApp, Facebook, and Twitter share URLs', () => {
  const links = buildProductShareLinks(sampleProducts[0], 'https://example.com');
  assert.ok(links.whatsapp.startsWith('https://wa.me/?text='));
  assert.ok(links.facebook.includes('facebook.com/sharer'));
  assert.ok(links.twitter.includes('twitter.com/intent/tweet'));
});

test('calculateReviewSummary handles empty and mixed ratings cleanly', () => {
  const empty = calculateReviewSummary([]);
  assert.equal(empty.averageRating, 0);
  assert.equal(empty.totalCount, 0);
  assert.deepEqual(empty.distribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  const sampleReviews: Review[] = [
    {
      id: 'r1',
      orderCode: 'DH-261119-1001',
      customerName: 'Nadia',
      itemsSummary: 'Dimsum Ayam Original',
      rating: 5,
      comment: 'Dimsumnya lembut dan chili oilnya mantap.',
      createdAt: '2026-11-19T10:00:00.000Z',
    },
    {
      id: 'r2',
      orderCode: 'DH-261119-1002',
      customerName: 'Raka',
      itemsSummary: 'Kripik Pisang Coklat Lumer',
      rating: 4,
      comment: 'Renyah banget, coklatnya pas.',
      createdAt: '2026-11-19T11:00:00.000Z',
    },
    {
      id: 'r3',
      orderCode: 'DH-261119-1003',
      customerName: 'Tania',
      itemsSummary: 'Dimsum Mentai Bakar',
      rating: 5,
      comment: 'Pengiriman cepat, saus mentai gurih.',
      createdAt: '2026-11-19T12:00:00.000Z',
    },
  ];

  const summary = calculateReviewSummary(sampleReviews);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.averageRating, 4.7);
  assert.deepEqual(summary.distribution, { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 });
});

test('markOrderReviewedInHistory updates matching order in localStorage', () => {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  const originalWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = { localStorage: mockLocalStorage };

  try {
    const sampleOrder: Order = {
      id: 'ord-1',
      orderCode: 'DH-261119-5555',
      createdAt: '2026-11-19T08:00:00.000Z',
      customerName: 'Siti',
      customerPhone: '08123456789',
      customerAddress: 'Jl. Kenanga No. 5',
      notes: '',
      items: [
        {
          productId: 'p1',
          name: 'Dimsum Ayam Original',
          category: 'Dimsum',
          price: 28000,
          quantity: 1,
          unitLabel: '8 pcs + Chili Oil',
        },
      ],
      totalAmount: 28000,
      paymentMethod: 'QRIS',
      status: 'Menunggu Verifikasi',
      whatsappNotificationSent: true,
      whatsappMessage: 'Order test',
    };

    saveOrderToHistoryStorage(sampleOrder);
    const updated = markOrderReviewedInHistory('DH-261119-5555', {
      rating: 5,
      comment: 'Sangat enak dan hangat!',
      createdAt: '2026-11-19T09:00:00.000Z',
    });

    assert.equal(updated.length, 1);
    assert.equal(updated[0].review?.rating, 5);
    assert.equal(updated[0].review?.comment, 'Sangat enak dan hangat!');

    const persisted = readOrderHistoryFromStorage();
    assert.equal(persisted[0].review?.rating, 5);
    assert.ok(store.has(ORDER_HISTORY_STORAGE_KEY));
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  }
});

test('getHeroFavoriteProducts prioritizes active featured items and falls back to active items', () => {
  const withFeatured: Product[] = [
    { ...sampleProducts[0], featured: false, active: true },
    { ...sampleProducts[1], featured: true, active: true },
    { ...sampleProducts[2], featured: true, active: false },
  ];
  const result = getHeroFavoriteProducts(withFeatured);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'p2');

  const noFeatured: Product[] = [
    { ...sampleProducts[0], featured: false, active: true },
    { ...sampleProducts[1], featured: false, active: false },
  ];
  const fallback = getHeroFavoriteProducts(noFeatured);
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].id, 'p1');
});

test('parseBase64ImageDataUrl and slugifyImageName handle valid and invalid inputs', () => {
  const png1px =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const parsed = parseBase64ImageDataUrl(png1px);
  assert.ok(parsed);
  assert.equal(parsed.extension, 'png');
  assert.ok(parsed.buffer.length > 0);

  assert.equal(parseBase64ImageDataUrl('https://example.com/img.png'), null);
  assert.equal(parseBase64ImageDataUrl('data:text/plain;base64,SGVsbG8='), null);
  assert.equal(slugifyImageName('Dimsum Mentai Keju!'), 'dimsum-mentai-keju');
});
