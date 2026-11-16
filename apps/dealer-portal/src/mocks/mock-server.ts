/**
 * Mock server cho Dealer Portal.
 * Chạy trong trình duyệt khi VITE_API_MODE=mock (mặc định khi không có backend).
 * Dữ liệu nằm trong bộ nhớ, reload trang sẽ về trạng thái ban đầu.
 */

export interface MockResponse { status: number; body: unknown; }
type Query = Record<string, string>;
interface Ctx { query: Query; body: any; params: string[]; user: MockUser | null; }
interface MockUser { id: string; email: string; fullName: string; role: string; dealerId: string | null; }

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
let seq = 100;
const uid = (p: string) => `${p}_${++seq}`;

/* ---------- Seed data ---------- */

const USERS: MockUser[] = [
  { id: 'u5', email: 'dealer1@agenthub.vn', fullName: 'Nguyễn Văn Minh',  role: 'DEALER', dealerId: 'd1' },
  { id: 'u6', email: 'dealer2@agenthub.vn', fullName: 'Trần Thị Hoa',     role: 'DEALER', dealerId: 'd2' },
];

const DEALER_DATA = [
  { id: 'd1', userId: 'u5', code: 'DL0001', name: 'Đại lý Minh Phát', phone: '0901234567', address: '12 Nguyễn Trãi, Q.5', email: 'dealer1@agenthub.vn', districtName: 'Quận 5',  tierName: 'Loại 1', maxDebt: 10_000_000 },
  { id: 'd2', userId: 'u6', code: 'DL0002', name: 'Đại lý Hòa Bình',  phone: '0912345678', address: '45 Ba Tháng Hai, Q.10', email: 'dealer2@agenthub.vn', districtName: 'Quận 10', tierName: 'Loại 2', maxDebt: 5_000_000  },
];

// Đồng bộ với admin-web mock: 5 mặt hàng, 3 đơn vị tính (QĐ2), giá xuất = 102% giá nhập (QĐ3)
const SKUS_SEED = [
  { id: 'sku-1', code: 'MH01', productName: 'Gạo ST25',         category: 'Lương thực', unit: 'Bao',   exportPrice: 306_000 },
  { id: 'sku-2', code: 'MH02', productName: 'Dầu ăn Simply 1L', category: 'Gia vị',     unit: 'Thùng', exportPrice: 459_000 },
  { id: 'sku-3', code: 'MH03', productName: 'Nước mắm Nam Ngư', category: 'Gia vị',     unit: 'Thùng', exportPrice: 285_600 },
  { id: 'sku-4', code: 'MH04', productName: 'Đường Biên Hòa',   category: 'Lương thực', unit: 'Bao',   exportPrice: 224_400 },
  { id: 'sku-5', code: 'MH05', productName: 'Trà Lipton',       category: 'Đồ uống',    unit: 'Hộp',   exportPrice: 61_200  },
];

const PROMOTIONS_SEED = [
  { id: 'promo-1', code: 'KM-001', name: 'KM tháng 11 - Gạo thùng', skuId: 'sku-2', minimumQuantity: 10, discountPercent: 5,  effectiveFrom: daysAgo(10), effectiveTo: new Date(Date.now() + 14 * DAY).toISOString(), isActive: true },
  { id: 'promo-2', code: 'KM-002', name: 'KM Pepsi mùa lễ',          skuId: 'sku-5', minimumQuantity: 5,  discountPercent: 10, effectiveFrom: daysAgo(5),  effectiveTo: new Date(Date.now() + 45 * DAY).toISOString(), isActive: true },
];

/* Per-dealer mutable state */
interface DealerState {
  currentDebt: number;
  orders: any[];
  invoices: any[];
  ledger: any[];
  returns: any[];
  orderSeq: number;
  invoiceSeq: number;
  returnSeq: number;
}

const state = new Map<string, DealerState>();

function initDealer(dealerId: string, seed: typeof DEALER_DATA[0]): DealerState {
  const orders: any[] = [
    { id: `${dealerId}-o1`, orderNumber: 'DH-2026-0042', status: 'SHIPPED',          totalAmount: 2_754_000, createdAt: daysAgo(6),  approvedAt: daysAgo(5),  notes: null, items: [
      { id: 'i1', skuId: 'sku-2', skuCode: 'MH02', productName: 'Dầu ăn Simply 1L', unit: 'Thùng', quantity: 4, unitPrice: 459_000, amount: 1_836_000 },
      { id: 'i2', skuId: 'sku-3', skuCode: 'MH03', productName: 'Nước mắm Nam Ngư', unit: 'Thùng', quantity: 3, unitPrice: 285_600, amount: 856_800  },
    ]},
    { id: `${dealerId}-o2`, orderNumber: 'DH-2026-0040', status: 'PENDING_APPROVAL', totalAmount: 612_000,   createdAt: daysAgo(4),  approvedAt: null,        notes: null, items: [
      { id: 'i3', skuId: 'sku-1', skuCode: 'MH01', productName: 'Gạo ST25', unit: 'Bao', quantity: 2, unitPrice: 306_000, amount: 612_000 },
    ]},
    { id: `${dealerId}-o3`, orderNumber: 'DH-2026-0038', status: 'COMPLETED',        totalAmount: 918_000,   createdAt: daysAgo(11), approvedAt: daysAgo(10), notes: null, items: [
      { id: 'i4', skuId: 'sku-1', skuCode: 'MH01', productName: 'Gạo ST25',         unit: 'Bao',   quantity: 2, unitPrice: 306_000, amount: 612_000 },
      { id: 'i5', skuId: 'sku-5', skuCode: 'MH05', productName: 'Trà Lipton',       unit: 'Hộp',   quantity: 5, unitPrice: 61_200,  amount: 306_000 },
    ]},
  ];

  const invoices: any[] = [
    { id: `${dealerId}-inv1`, invoiceNumber: 'HD-2026-0042', totalAmount: 2_754_000, paidAmount: 0,         remainingAmount: 2_754_000, status: 'UNPAID', issueDate: daysAgo(6),  dueDate: null, salesOrderId: `${dealerId}-o1`, orderNumber: 'DH-2026-0042' },
    { id: `${dealerId}-inv2`, invoiceNumber: 'HD-2026-0038', totalAmount: 918_000,   paidAmount: 918_000,   remainingAmount: 0,         status: 'PAID',   issueDate: daysAgo(11), dueDate: null, salesOrderId: `${dealerId}-o3`, orderNumber: 'DH-2026-0038' },
  ];

  const initDebt = 2_754_000;
  const ledger: any[] = [
    { id: uid('l'), transactionType: 'INVOICE', referenceCode: 'HD-2026-0038', debitAmount: 918_000,   creditAmount: 0,         previousBalance: 1_836_000, currentBalance: 2_754_000, notes: null, createdAt: daysAgo(11) },
    { id: uid('l'), transactionType: 'PAYMENT', referenceCode: 'PT-2026-0019', debitAmount: 0,         creditAmount: 1_000_000, previousBalance: 2_836_000, currentBalance: 1_836_000, notes: null, createdAt: daysAgo(14) },
    { id: uid('l'), transactionType: 'INVOICE', referenceCode: 'HD-2026-0031', debitAmount: 1_836_000, creditAmount: 0,         previousBalance: 1_000_000, currentBalance: 2_836_000, notes: null, createdAt: daysAgo(18) },
  ];

  const returns: any[] = [
    { id: `${dealerId}-r1`, returnNumber: 'TH-2026-0003', salesOrderId: `${dealerId}-o3`, orderNumber: 'DH-2026-0038', status: 'COMPLETED', reason: 'Hàng bị hỏng khi vận chuyển', debtCreditAmount: 170_000, createdAt: daysAgo(9) },
  ];

  return { currentDebt: initDebt, orders, invoices, ledger, returns, orderSeq: 42, invoiceSeq: 42, returnSeq: 3 };
}

DEALER_DATA.forEach((d) => { state.set(d.id, initDealer(d.id, d)); });

/* ---------- Helpers ---------- */

const ok = (data: unknown, extra: Record<string, unknown> = {}, status = 200): MockResponse => ({ status, body: { success: true, data, ...extra } });
const fail = (status: number, code: string, message: string): MockResponse => ({ status, body: { success: false, code, message } });

function getUser(token: string | null): MockUser | null {
  if (!token?.startsWith('mock.')) return null;
  return USERS.find((u) => u.id === token.slice(5)) ?? null;
}

function getDealerInfo(id: string) { return DEALER_DATA.find((d) => d.id === id); }

function paginate<T>(items: T[], q: Query) {
  const page  = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  const total = items.length;
  return { items: items.slice((page - 1) * limit, page * limit), pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

/* ---------- Route table ---------- */

type Handler = (c: Ctx) => MockResponse;
const routes: Array<[string, RegExp, Handler]> = [];
const on = (method: string, path: string, h: Handler) =>
  routes.push([method, new RegExp(`^${path.replace(/:id/g, '([^/]+)')}$`), h]);

/* Auth */
on('POST', '/auth/login', (c) => {
  const u = USERS.find((x) => x.email === c.body?.email);
  if (!u || c.body?.password !== 'password123') return fail(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác');
  const d = getDealerInfo(u.dealerId!);
  return ok({ token: `mock.${u.id}`, user: { ...u, dealer: d ? { id: d.id, code: d.code, name: d.name } : null } });
});

on('GET', '/auth/profile', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const d = c.user.dealerId ? getDealerInfo(c.user.dealerId) : null;
  return ok({ ...c.user, dealer: d ? { id: d.id, code: d.code, name: d.name } : null });
});

/* Catalog */
on('GET', '/categories', () => ok([
  { id: 'cat-1', code: 'TP', name: 'Thực phẩm' },
  { id: 'cat-2', code: 'DU', name: 'Đồ uống' },
]));

on('GET', '/skus', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const q = c.query.search?.toLowerCase() ?? '';
  const list = SKUS_SEED.filter((s) => !q || s.productName.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  return ok(list);
});

on('GET', '/promotions', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  return ok(PROMOTIONS_SEED.filter((p) => p.isActive));
});

/* Dealer profile */
on('GET', '/dealers/:id', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const d = getDealerInfo(c.params[0]!);
  if (!d) return fail(404, 'NOT_FOUND', 'Không tìm thấy đại lý');
  const st = state.get(d.id)!;
  return ok({ id: d.id, code: d.code, name: d.name, phone: d.phone, address: d.address, email: d.email,
    districtId: d.id + '-dist', tierId: d.id + '-tier',
    district: { id: d.id + '-dist', code: 'D', name: d.districtName, isActive: true },
    tier: { id: d.id + '-tier', name: d.tierName, maxDebt: d.maxDebt, isActive: true },
    receivedDate: daysAgo(180), status: 'ACTIVE', currentDebt: st.currentDebt });
});

on('GET', '/dealers/:id/debt', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const d = getDealerInfo(c.params[0]!);
  if (!d) return fail(404, 'NOT_FOUND', 'Không tìm thấy đại lý');
  const st = state.get(d.id)!;
  const lastPay = [...st.ledger].reverse().find((l) => l.transactionType === 'PAYMENT');
  return ok({ currentDebt: st.currentDebt, maxDebtAllowed: d.maxDebt, remainingCredit: Math.max(0, d.maxDebt - st.currentDebt),
    isDebtExceeded: st.currentDebt > d.maxDebt, lastPaymentDate: lastPay?.createdAt ?? null, lastPaymentAmount: lastPay?.creditAmount ?? null });
});

on('GET', '/dealers/:id/debt-ledger', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const st = state.get(c.params[0]!);
  if (!st) return fail(404, 'NOT_FOUND', 'Không tìm thấy đại lý');
  const { items, pagination } = paginate([...st.ledger].reverse(), c.query);
  return ok(items, { pagination });
});

/* Orders */
on('GET', '/sales-orders', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const dealerId = c.user.dealerId!;
  const st = state.get(dealerId)!;
  let list = [...st.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (c.query.status) list = list.filter((o) => o.status === c.query.status);
  const { items, pagination } = paginate(list, c.query);
  return ok(items.map((o) => ({ ...o, items: undefined })), { pagination });
});

on('GET', '/sales-orders/:id', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const st = state.get(c.user.dealerId!)!;
  const order = st.orders.find((o) => o.id === c.params[0]);
  return order ? ok(order) : fail(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
});

on('POST', '/sales-orders', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const dealerId = c.user.dealerId!;
  const st = state.get(dealerId)!;
  const lines: Array<{ skuId: string; quantity: number }> = c.body?.lines ?? [];
  if (!lines.length) return fail(400, 'VALIDATION_ERROR', 'Đơn hàng cần ít nhất một sản phẩm');
  const items = lines.map((l, i) => {
    const sku = SKUS_SEED.find((s) => s.id === l.skuId);
    if (!sku) throw new Error('SKU not found');
    return { id: uid('oi'), skuId: sku.id, skuCode: sku.code, productName: sku.productName, unit: sku.unit, quantity: l.quantity, unitPrice: sku.exportPrice, amount: sku.exportPrice * l.quantity };
  });
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  st.orderSeq += 1;
  const order = { id: uid('o'), orderNumber: `DH-2026-${String(st.orderSeq).padStart(4, '0')}`, status: 'PENDING_APPROVAL', totalAmount, notes: c.body?.notes ?? null, createdAt: new Date().toISOString(), approvedAt: null, items };
  st.orders.unshift(order);
  return ok(order, { message: 'Đơn hàng đã được gửi, đang chờ duyệt.' }, 201);
});

/* Invoices */
on('GET', '/invoices', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const st = state.get(c.user.dealerId!)!;
  let list = [...st.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  if (c.query.status) list = list.filter((i) => i.status === c.query.status);
  const { items, pagination } = paginate(list, c.query);
  return ok(items, { pagination });
});

/* Returns */
on('GET', '/returns', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const st = state.get(c.user.dealerId!)!;
  const { items, pagination } = paginate([...st.returns].reverse(), c.query);
  return ok(items, { pagination });
});

on('POST', '/returns', (c) => {
  if (!c.user) return fail(401, 'UNAUTHORIZED', 'Unauthorized');
  const dealerId = c.user.dealerId!;
  const st = state.get(dealerId)!;
  const { salesOrderId, reason } = c.body ?? {};
  if (!salesOrderId || !reason?.trim()) return fail(400, 'VALIDATION_ERROR', 'Vui lòng chọn đơn hàng và nhập lý do');
  const order = st.orders.find((o) => o.id === salesOrderId);
  if (!order) return fail(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng');
  st.returnSeq += 1;
  const ret = { id: uid('r'), returnNumber: `TH-2026-${String(st.returnSeq).padStart(4, '0')}`, salesOrderId, orderNumber: order.orderNumber, status: 'REQUESTED', reason, debtCreditAmount: 0, createdAt: new Date().toISOString() };
  st.returns.push(ret);
  return ok(ret, { message: 'Yêu cầu trả hàng đã được ghi nhận.' }, 201);
});

/* ---------- Entry ---------- */

export function handleMock(method: string, path: string, query: Query, body: unknown, token: string | null): MockResponse {
  const user = getUser(token);
  for (const [m, re, h] of routes) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (match) return h({ query, body, params: match.slice(1), user });
  }
  return fail(404, 'ROUTE_NOT_FOUND', 'API endpoint không tồn tại.');
}
