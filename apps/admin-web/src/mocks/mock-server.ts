/**
 * Backend giả lập chạy trong trình duyệt (VITE_API_MODE=mock).
 * - Endpoint đã có ở backend thật: mô phỏng đúng contract và mã lỗi (RULE_VIOLATION_QD1/3/5...).
 * - Endpoint backend chưa có (products, inventory, purchase-receipts, sales-vouchers): contract ĐỀ XUẤT.
 * Dữ liệu nằm trong bộ nhớ, tải lại trang sẽ về trạng thái ban đầu.
 */
import type {
  AuditLog,
  BusinessRule,
  DebtLedgerEntry,
  Dealer,
  DealerTier,
  District,
  Invoice,
  Payment,
  Product,
  PurchaseReceipt,
  SalesVoucher,
  UserRole,
  VoucherLine,
} from '../lib/api/types';

export interface MockResponse {
  status: number;
  body: unknown;
}

type Query = Record<string, string>;
interface Ctx {
  query: Query;
  body: any;
  params: string[];
  user: MockUser | null;
}
interface MockUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
  dealerId: string | null;
}

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
let seq = 1000;
const uid = (p: string) => `${p}_${++seq}`;

/* ------------------------------ Seed data ------------------------------ */

const users: MockUser[] = [
  { id: 'u1', email: 'admin@agenthub.vn', fullName: 'Nguyễn Quản Trị', role: 'ADMIN', password: 'password123', dealerId: null },
  { id: 'u2', email: 'sales@agenthub.vn', fullName: 'Trần Kinh Doanh', role: 'SALES', password: 'password123', dealerId: null },
  { id: 'u3', email: 'warehouse@agenthub.vn', fullName: 'Lê Thủ Kho', role: 'WAREHOUSE', password: 'password123', dealerId: null },
  { id: 'u4', email: 'accountant@agenthub.vn', fullName: 'Phạm Kế Toán', role: 'ACCOUNTANT', password: 'password123', dealerId: null },
  { id: 'u5', email: 'dealer1@agenthub.vn', fullName: 'Đại lý Minh Phát', role: 'DEALER', password: 'password123', dealerId: 'd1' },
];

const DISTRICT_NAMES = [
  ...Array.from({ length: 12 }, (_, i) => `Quận ${i + 1}`),
  'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Bình Tân', 'Thủ Đức', 'Nhà Bè',
];
const districts: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `dist${i + 1}`,
  code: `Q${String(i + 1).padStart(2, '0')}`,
  name,
  isActive: true,
}));

const tiers: DealerTier[] = [
  { id: 'tier1', name: 'Loại 1', maxDebt: 10_000_000, isActive: true },
  { id: 'tier2', name: 'Loại 2', maxDebt: 5_000_000, isActive: true },
];

const rules: BusinessRule[] = [
  {
    id: 'r1', code: 'QD1', name: 'QĐ1 – Đại lý và quận', description: 'Số loại đại lý, số quận, số đại lý tối đa mỗi quận.',
    value: { maxDealerTypes: 2, totalDistricts: 20, maxDealersPerDistrict: 4 }, isActive: true, updatedAt: daysAgo(30), histories: [],
  },
  {
    id: 'r2', code: 'QD2', name: 'QĐ2 – Mặt hàng và đơn vị tính', description: 'Số mặt hàng và số đơn vị tính tối đa.',
    value: { maxProductCount: 5, maxUnitCount: 3 }, isActive: true, updatedAt: daysAgo(30), histories: [],
  },
  {
    id: 'r3', code: 'QD3', name: 'QĐ3 – Hạn mức nợ và giá xuất', description: 'Hạn mức nợ từng loại đại lý; đơn giá xuất = đơn giá nhập × tỷ lệ.',
    value: { tierDebtLimits: { 'Loại 1': 10_000_000, 'Loại 2': 5_000_000 }, exportPriceRatio: 1.02 }, isActive: true, updatedAt: daysAgo(30), histories: [],
  },
  {
    id: 'r5', code: 'QD5', name: 'QĐ5 – Thu tiền', description: 'Số tiền thu không vượt quá số tiền đại lý đang nợ.',
    value: { strictPaymentLessThanDebt: true }, isActive: true, updatedAt: daysAgo(30), histories: [],
  },
];

const products: Product[] = [
  { id: 'p1', code: 'MH01', name: 'Gạo ST25', category: 'Lương thực', unit: 'Bao', importPrice: 300_000, exportPrice: 306_000, stock: 120 },
  { id: 'p2', code: 'MH02', name: 'Dầu ăn Simply 1L', category: 'Gia vị', unit: 'Thùng', importPrice: 450_000, exportPrice: 459_000, stock: 80 },
  { id: 'p3', code: 'MH03', name: 'Nước mắm Nam Ngư', category: 'Gia vị', unit: 'Thùng', importPrice: 280_000, exportPrice: 285_600, stock: 60 },
  { id: 'p4', code: 'MH04', name: 'Đường Biên Hòa', category: 'Lương thực', unit: 'Bao', importPrice: 220_000, exportPrice: 224_400, stock: 90 },
  { id: 'p5', code: 'MH05', name: 'Trà Lipton', category: 'Đồ uống', unit: 'Hộp', importPrice: 60_000, exportPrice: 61_200, stock: 200 },
];

const dealerSeed: Array<[string, string, string, string, string, string]> = [
  // id, name, tier, district, phone, address
  ['d1', 'Đại lý Minh Phát', 'tier1', 'dist5', '0901234567', '12 Nguyễn Trãi'],
  ['d2', 'Đại lý Hòa Bình', 'tier2', 'dist10', '0912345678', '45 Ba Tháng Hai'],
  ['d3', 'Đại lý Thành Công', 'tier1', 'dist1', '0923456789', '8 Lê Lợi'],
  ['d4', 'Đại lý Phú Gia', 'tier2', 'dist7', '0934567890', '102 Nguyễn Thị Thập'],
  ['d5', 'Đại lý An Khang', 'tier1', 'dist13', '0945678901', '77 Xô Viết Nghệ Tĩnh'],
  ['d6', 'Đại lý Kim Long', 'tier2', 'dist14', '0956789012', '19 Quang Trung'],
  ['d7', 'Đại lý Hưng Thịnh', 'tier1', 'dist5', '0967890123', '210 An Dương Vương'],
  ['d8', 'Đại lý Bảo Ngọc', 'tier2', 'dist16', '0978901234', '5 Cộng Hòa'],
];

const dealers: Dealer[] = dealerSeed.map(([id, name, tierId, districtId, phone, address], i) => ({
  id,
  code: `DL${String(i + 1).padStart(4, '0')}`,
  name,
  phone,
  address,
  email: `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '')}@example.com`,
  districtId,
  tierId,
  district: districts.find((d) => d.id === districtId)!,
  tier: tiers.find((t) => t.id === tierId)!,
  receivedDate: daysAgo(120 - i * 5),
  status: i === 7 ? 'SUSPENDED' : 'ACTIVE',
  currentDebt: 0,
  createdAt: daysAgo(120 - i * 5),
}));

const ledger = new Map<string, Array<DebtLedgerEntry & { dealerId: string; at: number }>>();
const invoices: Invoice[] = [];
const payments: Payment[] = [];
const vouchers: Array<SalesVoucher & { at: number }> = [];
const receipts: PurchaseReceipt[] = [];
const audit: AuditLog[] = [];

const counters = { PN: 0, PX: 0, PT: 0, HD: 0 };
const nextCode = (p: keyof typeof counters) => `${p}${String(++counters[p]).padStart(4, '0')}`;

const getDealer = (id: string) => dealers.find((d) => d.id === id);
const exportRatio = () => (rules.find((r) => r.code === 'QD3')!.value.exportPriceRatio as number) ?? 1.02;
const tierLimit = (tierName: string) =>
  ((rules.find((r) => r.code === 'QD3')!.value.tierDebtLimits as Record<string, number>)[tierName] ?? 0);

function pushAudit(user: MockUser | null, action: string, entity: string, entityId: string, details: unknown) {
  audit.unshift({
    id: uid('a'), userId: user?.id ?? null, userRole: user?.role ?? null, action, entity, entityId,
    details: JSON.stringify(details), ipAddress: '127.0.0.1', createdAt: new Date().toISOString(),
    user: user ? { fullName: user.fullName, email: user.email } : null,
  });
}

function addLedger(dealerId: string, type: DebtLedgerEntry['transactionType'], refCode: string, debit: number, credit: number, at: number, notes?: string) {
  const dealer = getDealer(dealerId)!;
  const prev = dealer.currentDebt;
  const cur = prev + debit - credit;
  dealer.currentDebt = cur;
  const list = ledger.get(dealerId) ?? [];
  list.push({
    id: uid('l'), dealerId, at, transactionType: type, referenceType: type === 'PAYMENT' ? 'PAYMENT' : 'INVOICE',
    referenceCode: refCode, debitAmount: debit, creditAmount: credit, previousBalance: prev, currentBalance: cur,
    notes: notes ?? null, createdAt: new Date(at).toISOString(),
  });
  ledger.set(dealerId, list);
}

function createVoucher(dealerId: string, rows: Array<{ productId: string; quantity: number }>, paid: number, at: number, user: MockUser | null, adjustStock = true) {
  const dealer = getDealer(dealerId)!;
  const lines: VoucherLine[] = rows.map((r) => {
    const p = products.find((x) => x.id === r.productId)!;
    if (adjustStock) p.stock -= r.quantity;
    return { productId: p.id, productName: p.name, unit: p.unit, quantity: r.quantity, unitPrice: p.exportPrice, amount: r.quantity * p.exportPrice };
  });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const remaining = total - paid;
  const code = nextCode('PX');
  const v = {
    id: uid('v'), code, date: new Date(at).toISOString(), dealerId, dealerName: dealer.name, total, paid, remaining, lines, at,
  };
  vouchers.push(v);
  if (remaining > 0) {
    const inv: Invoice = {
      id: uid('inv'), invoiceNumber: nextCode('HD'), dealerId, totalAmount: remaining, paidAmount: 0, remainingAmount: remaining,
      status: 'UNPAID', issueDate: new Date(at).toISOString(), dueDate: new Date(at + 30 * DAY).toISOString(),
      dealer: { id: dealer.id, code: dealer.code, name: dealer.name },
    };
    invoices.push(inv);
    addLedger(dealerId, 'INVOICE', inv.invoiceNumber, remaining, 0, at, `Phiếu xuất ${code}`);
  }
  pushAudit(user, 'CREATE_SALES_VOUCHER', 'SALES_VOUCHER', v.id, { code, dealerId, total, paid });
  return v;
}

function createPayment(dealerId: string, amount: number, method: 'CASH' | 'BANK_TRANSFER', at: number, user: MockUser | null, notes?: string) {
  const dealer = getDealer(dealerId)!;
  let left = amount;
  const allocations: NonNullable<Payment['allocations']> = [];
  invoices
    .filter((i) => i.dealerId === dealerId && i.remainingAmount > 0)
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate))
    .forEach((inv) => {
      if (left <= 0) return;
      const use = Math.min(left, inv.remainingAmount);
      inv.paidAmount += use;
      inv.remainingAmount -= use;
      inv.status = inv.remainingAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';
      left -= use;
      allocations.push({ id: uid('al'), amount: use, invoice: { id: inv.id, invoiceNumber: inv.invoiceNumber, totalAmount: inv.totalAmount, status: inv.status } });
    });
  const p: Payment = {
    id: uid('pay'), receiptNumber: nextCode('PT'), dealerId, amount, paymentDate: new Date(at).toISOString(), paymentMethod: method,
    notes: notes ?? null, collector: user ? { id: user.id, fullName: user.fullName, email: user.email, role: user.role } : null,
    dealer: { id: dealer.id, code: dealer.code, name: dealer.name, phone: dealer.phone, address: dealer.address, email: dealer.email },
    allocations,
  };
  payments.unshift(p);
  addLedger(dealerId, 'PAYMENT', p.receiptNumber, 0, amount, at, notes);
  pushAudit(user, 'CREATE_PAYMENT', 'PAYMENT', p.id, { receiptNumber: p.receiptNumber, dealerId, amount });
  return p;
}

// Lịch sử mẫu (tạo theo thứ tự thời gian để sổ công nợ luôn khớp)
(() => {
  const admin = users[0]!;
  const S = (d: number, id: string, rows: Array<[string, number]>, paid: number) =>
    createVoucher(id, rows.map(([productId, quantity]) => ({ productId, quantity })), paid, Date.now() - d * DAY, admin, false);
  const P = (d: number, id: string, amt: number, m: 'CASH' | 'BANK_TRANSFER' = 'CASH') =>
    createPayment(id, amt, m, Date.now() - d * DAY, users[3]!);
  S(52, 'd1', [['p1', 4], ['p2', 2]], 1_000_000);
  S(50, 'd2', [['p3', 5], ['p5', 10]], 800_000);
  S(48, 'd3', [['p2', 6]], 1_500_000);
  S(44, 'd4', [['p4', 6]], 600_000);
  P(40, 'd1', 400_000);
  S(38, 'd5', [['p1', 10], ['p4', 4]], 2_000_000);
  S(36, 'd7', [['p3', 8]], 1_000_000);
  P(33, 'd2', 300_000, 'BANK_TRANSFER');
  S(28, 'd1', [['p5', 20], ['p3', 3]], 500_000);
  S(25, 'd6', [['p1', 3]], 400_000);
  P(22, 'd3', 700_000);
  S(18, 'd2', [['p2', 3]], 600_000);
  S(15, 'd4', [['p3', 4]], 300_000);
  S(12, 'd5', [['p2', 5], ['p5', 15]], 1_800_000);
  P(10, 'd7', 500_000, 'BANK_TRANSFER');
  S(8, 'd3', [['p1', 6]], 800_000);
  S(5, 'd1', [['p4', 7]], 600_000);
  P(3, 'd5', 600_000);
  S(2, 'd6', [['p5', 12], ['p4', 2]], 500_000);
  S(1, 'd7', [['p2', 4]], 500_000);
  audit.length = Math.min(audit.length, 30);
})();

/* ------------------------------ Helpers ------------------------------ */

const ok = (data: unknown, extra: Record<string, unknown> = {}, status = 200): MockResponse => ({ status, body: { success: true, data, ...extra } });
const fail = (status: number, code: string, message: string, errors?: Array<{ path: string; message: string }>): MockResponse => ({
  status, body: { success: false, code, message, errors },
});
const forbidden = () => fail(403, 'FORBIDDEN', 'Forbidden: insufficient permissions');

const need = (ctx: Ctx, ...roles: UserRole[]) => (!ctx.user ? fail(401, 'UNAUTHORIZED', 'Unauthorized') : roles.length && !roles.includes(ctx.user.role) ? forbidden() : null);

function paginate<T>(items: T[], q: Query, defLimit = 20) {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || defLimit));
  const total = items.length;
  return { items: items.slice((page - 1) * limit, page * limit), pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

function validateDealerInput(b: any, partial: boolean) {
  const errors: Array<{ path: string; message: string }> = [];
  const req = (k: string, msg: string) => { if (!partial || k in b) if (!String(b[k] ?? '').trim()) errors.push({ path: k, message: msg }); };
  req('name', 'Tên đại lý là bắt buộc');
  req('phone', 'Số điện thoại là bắt buộc');
  req('address', 'Địa chỉ là bắt buộc');
  req('districtId', 'Quận là bắt buộc');
  req('tierId', 'Loại đại lý là bắt buộc');
  if (b.phone && !/^\d{9,11}$/.test(String(b.phone))) errors.push({ path: 'phone', message: 'Số điện thoại chỉ gồm 9–11 chữ số' });
  if (b.email && !/^\S+@\S+\.\S+$/.test(String(b.email))) errors.push({ path: 'email', message: 'Email không hợp lệ' });
  return errors;
}

const districtCount = (districtId: string, exceptId?: string) => dealers.filter((d) => d.districtId === districtId && d.id !== exceptId).length;
const qd1Max = () => rules.find((r) => r.code === 'QD1')!.value.maxDealersPerDistrict as number;

/* ------------------------------ Reports ------------------------------ */

function monthRange(month: number, year: number) {
  return { from: new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+07:00`).getTime(), to: new Date(year, month, 1).getTime() };
}

function salesReport(month: number, year: number) {
  const { from, to } = monthRange(month, year);
  const byDealer = new Map<string, { count: number; total: number }>();
  vouchers.filter((v) => v.at >= from && v.at < to).forEach((v) => {
    const cur = byDealer.get(v.dealerId) ?? { count: 0, total: 0 };
    cur.count += 1; cur.total += v.total; byDealer.set(v.dealerId, cur);
  });
  const totalRevenue = [...byDealer.values()].reduce((s, x) => s + x.total, 0);
  const rows = [...byDealer.entries()].sort((a, b) => b[1].total - a[1].total).map(([id, x], i) => {
    const d = getDealer(id)!;
    return { stt: i + 1, dealerId: id, dealerCode: d.code, dealerName: d.name, district: d.district.name, tier: d.tier.name,
      exportCount: x.count, totalRevenue: x.total, percentage: totalRevenue ? Math.round((x.total / totalRevenue) * 1000) / 10 : 0 };
  });
  return {
    title: `Báo cáo doanh số tháng ${month}/${year}`, month, year, generatedAt: new Date().toISOString(),
    summary: { totalRevenue, totalExportCount: rows.reduce((s, r) => s + r.exportCount, 0), activeDealersCount: rows.length }, rows,
  };
}

function debtReport(month: number, year: number) {
  const { from, to } = monthRange(month, year);
  const rows: any[] = [];
  dealers.forEach((d) => {
    const entries = ledger.get(d.id) ?? [];
    const before = entries.filter((e) => e.at < from);
    const opening = before.length ? before[before.length - 1]!.currentBalance : 0;
    const inMonth = entries.filter((e) => e.at >= from && e.at < to);
    const debit = inMonth.reduce((s, e) => s + e.debitAmount, 0);
    const credit = inMonth.reduce((s, e) => s + e.creditAmount, 0);
    if (opening === 0 && debit === 0 && credit === 0) return;
    rows.push({ dealerId: d.id, dealerCode: d.code, dealerName: d.name, district: d.district.name, tier: d.tier.name,
      openingDebt: opening, incurredDebit: debit, incurredCredit: credit, incurredDebt: debit - credit, closingDebt: opening + debit - credit });
  });
  rows.sort((a, b) => b.closingDebt - a.closingDebt).forEach((r, i) => (r.stt = i + 1));
  const sum = (k: string) => rows.reduce((s, r) => s + r[k], 0);
  return {
    title: `Báo cáo công nợ đại lý tháng ${month}/${year}`, month, year, generatedAt: new Date().toISOString(),
    summary: { totalOpeningDebt: sum('openingDebt'), totalIncurredDebit: sum('incurredDebit'), totalIncurredCredit: sum('incurredCredit'),
      totalIncurredDebt: sum('incurredDebt'), totalClosingDebt: sum('closingDebt'), totalDealersCount: rows.length }, rows,
  };
}

/* ------------------------------ Rule validation ------------------------------ */

function validateRule(code: string, v: any): MockResponse | null {
  const posInt = (x: unknown) => Number.isInteger(x) && (x as number) > 0;
  const bad = (m: string) => fail(400, 'VALIDATION_ERROR', m, [{ path: 'value', message: m }]);
  if (code === 'QD1') {
    if (!posInt(v.maxDealerTypes) || !posInt(v.totalDistricts) || !posInt(v.maxDealersPerDistrict)) return bad('Các giá trị QĐ1 phải là số nguyên dương');
    const worst = districts.map((d) => ({ d, n: districtCount(d.id) })).sort((a, b) => b.n - a.n)[0]!;
    if (worst.n > v.maxDealersPerDistrict) return fail(422, 'RULE_VIOLATION_QD1', `${worst.d.name} hiện có ${worst.n} đại lý, vượt số tối đa mới`);
    if (v.maxDealerTypes < tiers.length) return fail(422, 'RULE_VIOLATION_QD1', 'Không thể giảm số loại đại lý khi còn loại đang được sử dụng');
  } else if (code === 'QD2') {
    if (!posInt(v.maxProductCount) || !posInt(v.maxUnitCount)) return bad('Các giá trị QĐ2 phải là số nguyên dương');
    if (v.maxProductCount < products.length) return fail(422, 'RULE_VIOLATION_QD2', `Hiện có ${products.length} mặt hàng đang sử dụng, không thể giảm xuống ${v.maxProductCount}`);
    const units = new Set(products.map((p) => p.unit)).size;
    if (v.maxUnitCount < units) return fail(422, 'RULE_VIOLATION_QD2', `Hiện có ${units} đơn vị tính đang sử dụng, không thể giảm xuống ${v.maxUnitCount}`);
  } else if (code === 'QD3') {
    const limits = v.tierDebtLimits as Record<string, number> | undefined;
    if (!limits || Object.values(limits).some((x) => !Number.isInteger(x) || x < 0)) return bad('Hạn mức nợ phải là số nguyên không âm');
    if (!(typeof v.exportPriceRatio === 'number' && v.exportPriceRatio > 0)) return bad('Tỷ lệ giá xuất phải lớn hơn 0');
  }
  return null;
}

/* ------------------------------ Routes ------------------------------ */

type Handler = (c: Ctx) => MockResponse;
const routes: Array<[string, RegExp, Handler]> = [];
const on = (method: string, path: string, h: Handler) => routes.push([method, new RegExp(`^${path.replace(/:id/g, '([^/]+)')}$`), h]);

on('POST', '/auth/login', (c) => {
  const u = users.find((x) => x.email === c.body?.email);
  if (!u || u.password !== c.body?.password) return fail(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác');
  const dealer = u.dealerId ? getDealer(u.dealerId) : null;
  return ok({ token: `mock.${u.id}`, user: { id: u.id, email: u.email, fullName: u.fullName, role: u.role, dealerId: u.dealerId, dealer: dealer ? { id: dealer.id, code: dealer.code, name: dealer.name } : null } }, { message: 'Đăng nhập thành công' });
});
on('GET', '/auth/profile', (c) => need(c) ?? ok({ id: c.user!.id, email: c.user!.email, fullName: c.user!.fullName, role: c.user!.role, dealerId: c.user!.dealerId }));

on('GET', '/districts', (c) => need(c) ?? ok(districts));
on('GET', '/dealer-tiers', (c) => need(c) ?? ok(tiers));

on('GET', '/dealers', (c) => {
  const e = need(c); if (e) return e;
  const q = c.query;
  let list = dealers.slice();
  if (q.search) { const s = stripDiacritics(q.search); list = list.filter((d) => [d.name, d.code, d.phone, d.email].some((f) => stripDiacritics(f).includes(s))); }
  if (q.districtId) list = list.filter((d) => d.districtId === q.districtId);
  if (q.tierId) list = list.filter((d) => d.tierId === q.tierId);
  if (q.status) list = list.filter((d) => d.status === q.status);
  const key = (q.sortBy || 'createdAt') as keyof Dealer;
  const dir = q.sortOrder === 'asc' ? 1 : -1;
  list.sort((a, b) => (String(a[key]).localeCompare(String(b[key]), 'vi', { numeric: true }) || 0) * dir);
  const { items, pagination } = paginate(list, q);
  return ok(items, { pagination });
});
on('POST', '/dealers', (c) => {
  const e = need(c, 'ADMIN', 'SALES'); if (e) return e;
  const errs = validateDealerInput(c.body, false);
  if (errs.length) return fail(400, 'VALIDATION_ERROR', 'Invalid input parameters', errs);
  const district = districts.find((d) => d.id === c.body.districtId);
  const tier = tiers.find((t) => t.id === c.body.tierId);
  if (!district || !tier) return fail(404, 'NOT_FOUND', 'Không có quận/loại đại lý');
  if (districtCount(district.id) >= qd1Max()) return fail(422, 'RULE_VIOLATION_QD1', `${district.name} đã đủ ${qd1Max()} đại lý tối đa (QĐ1)`);
  const code = c.body.code?.trim() || `DL${String(dealers.length + 1).padStart(4, '0')}`;
  if (dealers.some((d) => d.code === code)) return fail(409, 'DEALER_CODE_EXISTS', 'Mã đại lý đã tồn tại');
  const now = new Date().toISOString();
  const d: Dealer = { id: uid('d'), code, name: c.body.name.trim(), phone: c.body.phone, address: c.body.address.trim(), email: c.body.email ?? '',
    districtId: district.id, tierId: tier.id, district, tier, receivedDate: c.body.receivedDate ?? now, status: c.body.status ?? 'ACTIVE', currentDebt: 0, createdAt: now };
  dealers.unshift(d);
  pushAudit(c.user, 'CREATE_DEALER', 'DEALER', d.id, { code, name: d.name });
  return ok(d, {}, 201);
});
on('GET', '/dealers/overview', (c) => need(c) ?? ok(dealers));
on('GET', '/dealers/:id', (c) => {
  const e = need(c); if (e) return e;
  const d = getDealer(c.params[0]!);
  return d ? ok(d) : fail(404, 'NOT_FOUND', 'Không tìm thấy đại lý');
});
on('PATCH', '/dealers/:id', (c) => {
  const e = need(c, 'ADMIN', 'SALES'); if (e) return e;
  const d = getDealer(c.params[0]!);
  if (!d) return fail(404, 'NOT_FOUND', 'Không tìm thấy đại lý');
  const errs = validateDealerInput(c.body, true);
  if (errs.length) return fail(400, 'VALIDATION_ERROR', 'Invalid input parameters', errs);
  if (c.body.districtId && c.body.districtId !== d.districtId && districtCount(c.body.districtId) >= qd1Max()) {
    const dn = districts.find((x) => x.id === c.body.districtId)?.name ?? '';
    return fail(422, 'RULE_VIOLATION_QD1', `${dn} đã đủ ${qd1Max()} đại lý tối đa (QĐ1)`);
  }
  if (c.body.tierId && c.body.tierId !== d.tierId) {
    const t = tiers.find((x) => x.id === c.body.tierId);
    if (!t) return fail(404, 'NOT_FOUND', 'Không có loại đại lý');
    if (d.currentDebt > t.maxDebt) return fail(422, 'RULE_VIOLATION_QD3', 'Công nợ hiện tại vượt hạn mức của loại đại lý mới');
    d.tierId = t.id; d.tier = t;
  }
  if (c.body.districtId) { d.districtId = c.body.districtId; d.district = districts.find((x) => x.id === c.body.districtId)!; }
  (['name', 'phone', 'address', 'email', 'status', 'receivedDate'] as const).forEach((k) => { if (k in c.body) (d as any)[k] = c.body[k]; });
  pushAudit(c.user, 'UPDATE_DEALER', 'DEALER', d.id, c.body);
  return ok(d);
});

on('GET', '/dealers/:id/debt', (c) => {
  const e = need(c); if (e) return e;
  const d = getDealer(c.params[0]!);
  if (!d) return fail(404, 'NOT_FOUND', 'Không tìm thấy đại lý');
  const entries = ledger.get(d.id) ?? [];
  const lastPay = [...entries].reverse().find((x) => x.transactionType === 'PAYMENT');
  const lastInv = [...entries].reverse().find((x) => x.transactionType === 'INVOICE');
  const max = d.tier.maxDebt;
  return ok({
    dealer: { id: d.id, code: d.code, name: d.name, phone: d.phone, address: d.address, email: d.email, district: d.district.name, tier: d.tier.name, status: d.status },
    currentDebt: d.currentDebt, maxDebtAllowed: max, remainingCredit: Math.max(0, max - d.currentDebt), isDebtExceeded: d.currentDebt > max,
    lastPaymentDate: lastPay?.createdAt ?? null, lastPaymentAmount: lastPay?.creditAmount ?? null,
    lastInvoiceDate: lastInv?.createdAt ?? null, lastInvoiceAmount: lastInv?.debitAmount ?? null,
    recentTransactions: [...entries].reverse().slice(0, 10),
  });
});
on('GET', '/dealers/:id/debt-ledger', (c) => {
  const e = need(c); if (e) return e;
  const { items, pagination } = paginate([...(ledger.get(c.params[0]!) ?? [])].reverse(), c.query);
  return ok(items, { pagination });
});

on('GET', '/payments', (c) => {
  const e = need(c, 'ADMIN', 'ACCOUNTANT', 'SALES'); if (e) return e;
  let list = payments.slice();
  if (c.query.dealerId) list = list.filter((p) => p.dealerId === c.query.dealerId);
  const { items, pagination } = paginate(list, c.query);
  return ok(items, { pagination });
});
on('GET', '/payments/:id', (c) => {
  const e = need(c, 'ADMIN', 'ACCOUNTANT', 'SALES'); if (e) return e;
  const p = payments.find((x) => x.id === c.params[0]);
  return p ? ok(p) : fail(404, 'NOT_FOUND', 'Không tìm thấy phiếu thu');
});
on('POST', '/payments', (c) => {
  const e = need(c, 'ADMIN', 'ACCOUNTANT'); if (e) return e;
  const { dealerId, amount, paymentMethod, notes, paymentDate } = c.body ?? {};
  const d = getDealer(dealerId);
  if (!d) return fail(404, 'NOT_FOUND', 'Đại lý không tồn tại');
  if (!Number.isInteger(amount) || amount <= 0) return fail(400, 'VALIDATION_ERROR', 'Invalid input parameters', [{ path: 'amount', message: 'Số tiền thu phải là số nguyên dương (> 0)' }]);
  if (d.currentDebt === 0) return fail(422, 'RULE_VIOLATION_QD5', 'Đại lý hiện không còn nợ');
  if (amount > d.currentDebt) return fail(422, 'RULE_VIOLATION_QD5', 'Số tiền thu vượt quá số tiền đại lý đang nợ');
  return ok(createPayment(d.id, amount, paymentMethod ?? 'CASH', paymentDate ? new Date(paymentDate).getTime() : Date.now(), c.user, notes), { message: 'Lập phiếu thu thành công' }, 201);
});

on('GET', '/invoices', (c) => {
  const e = need(c, 'ADMIN', 'ACCOUNTANT', 'SALES'); if (e) return e;
  let list = invoices.slice().sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  if (c.query.dealerId) list = list.filter((i) => i.dealerId === c.query.dealerId);
  if (c.query.status) list = list.filter((i) => i.status === c.query.status);
  const { items, pagination } = paginate(list, c.query);
  return ok(items, { pagination });
});

on('GET', '/reports/sales', (c) => {
  const e = need(c, 'ADMIN', 'ACCOUNTANT', 'SALES'); if (e) return e;
  return ok(salesReport(Number(c.query.month), Number(c.query.year)));
});
on('GET', '/reports/debt', (c) => {
  const e = need(c, 'ADMIN', 'ACCOUNTANT'); if (e) return e;
  return ok(debtReport(Number(c.query.month), Number(c.query.year)));
});

on('GET', '/business-rules', (c) => need(c) ?? ok(rules.map((r) => ({ ...r, histories: r.histories.slice(0, 5) }))));
on('PATCH', '/business-rules/:id', (c) => {
  const e = need(c, 'ADMIN'); if (e) return e;
  const rule = rules.find((r) => r.code === c.params[0]);
  if (!rule) return fail(404, 'NOT_FOUND', 'Business rule not found');
  const v = c.body?.value ?? {};
  const err = validateRule(rule.code, v);
  if (err) return err;
  rule.histories.unshift({ id: uid('rh'), oldValue: rule.value, newValue: v, changeReason: c.body?.changeReason || 'Cập nhật theo QĐ7', changedAt: new Date().toISOString(),
    changedBy: { id: c.user!.id, fullName: c.user!.fullName, email: c.user!.email, role: c.user!.role } });
  rule.value = v; rule.updatedAt = new Date().toISOString();
  if (rule.code === 'QD3') tiers.forEach((t) => { t.maxDebt = (v.tierDebtLimits as Record<string, number>)[t.name] ?? t.maxDebt; });
  pushAudit(c.user, 'UPDATE_BUSINESS_RULE', 'BUSINESS_RULE', rule.id, { ruleCode: rule.code, newValue: v });
  return ok(rule);
});

on('GET', '/audit-logs', (c) => {
  const e = need(c, 'ADMIN', 'ACCOUNTANT'); if (e) return e;
  let list = audit.slice();
  if (c.query.entity) list = list.filter((a) => a.entity === c.query.entity);
  if (c.query.action) list = list.filter((a) => a.action === c.query.action);
  const { items, pagination } = paginate(list, c.query);
  return ok(items, { pagination });
});

/* ----- Contract đề xuất (backend chưa có) ----- */
on('GET', '/products', (c) => need(c) ?? ok(products));
on('GET', '/inventory', (c) => need(c, 'ADMIN', 'WAREHOUSE', 'SALES') ?? ok(products));

on('GET', '/purchase-receipts', (c) => {
  const e = need(c, 'ADMIN', 'WAREHOUSE', 'ACCOUNTANT'); if (e) return e;
  const { items, pagination } = paginate(receipts.slice(), c.query);
  return ok(items, { pagination });
});
on('POST', '/purchase-receipts', (c) => {
  const e = need(c, 'ADMIN', 'WAREHOUSE'); if (e) return e;
  const rows: Array<{ productId: string; quantity: number; unitPrice: number }> = c.body?.lines ?? [];
  if (!rows.length) return fail(400, 'VALIDATION_ERROR', 'Phiếu nhập cần ít nhất một dòng hàng');
  for (const r of rows) {
    if (!products.find((p) => p.id === r.productId)) return fail(422, 'RULE_VIOLATION_QD2', 'Mặt hàng không thuộc danh mục hiện hành (QĐ2)');
    if (!Number.isInteger(r.quantity) || r.quantity <= 0) return fail(400, 'VALIDATION_ERROR', 'Số lượng phải là số nguyên lớn hơn 0');
    if (!Number.isInteger(r.unitPrice) || r.unitPrice <= 0) return fail(400, 'VALIDATION_ERROR', 'Đơn giá phải là số nguyên lớn hơn 0');
  }
  const ratio = exportRatio();
  const lines: VoucherLine[] = rows.map((r) => {
    const p = products.find((x) => x.id === r.productId)!;
    p.stock += r.quantity; p.importPrice = r.unitPrice; p.exportPrice = Math.round(r.unitPrice * ratio);
    return { productId: p.id, productName: p.name, unit: p.unit, quantity: r.quantity, unitPrice: r.unitPrice, amount: r.quantity * r.unitPrice };
  });
  const rec: PurchaseReceipt = { id: uid('pn'), code: nextCode('PN'), date: c.body?.date ?? new Date().toISOString(), total: lines.reduce((s, l) => s + l.amount, 0), createdBy: c.user!.fullName, lines };
  receipts.unshift(rec);
  pushAudit(c.user, 'CREATE_PURCHASE_RECEIPT', 'PURCHASE_RECEIPT', rec.id, { code: rec.code, total: rec.total });
  return ok(rec, { message: 'Lập phiếu nhập thành công' }, 201);
});

on('GET', '/sales-vouchers', (c) => {
  const e = need(c, 'ADMIN', 'SALES', 'ACCOUNTANT'); if (e) return e;
  const { items, pagination } = paginate(vouchers.slice().reverse(), c.query);
  return ok(items, { pagination });
});
on('POST', '/sales-vouchers', (c) => {
  const e = need(c, 'ADMIN', 'SALES'); if (e) return e;
  const { dealerId, lines: rows = [], paid = 0 } = c.body ?? {};
  const d = getDealer(dealerId);
  if (!d || d.status !== 'ACTIVE') return fail(422, 'VALIDATION_ERROR', 'Đại lý không tồn tại hoặc đã ngưng hoạt động');
  if (!rows.length) return fail(400, 'VALIDATION_ERROR', 'Phiếu xuất cần ít nhất một dòng hàng');
  let total = 0;
  for (const r of rows as Array<{ productId: string; quantity: number }>) {
    const p = products.find((x) => x.id === r.productId);
    if (!p) return fail(422, 'RULE_VIOLATION_QD2', 'Mặt hàng không thuộc danh mục hiện hành (QĐ2)');
    if (!Number.isInteger(r.quantity) || r.quantity <= 0) return fail(400, 'VALIDATION_ERROR', 'Số lượng phải là số nguyên lớn hơn 0');
    if (r.quantity > p.stock) return fail(422, 'INSUFFICIENT_STOCK', `Không đủ tồn kho "${p.name}": còn ${p.stock}, cần ${r.quantity}`);
    total += r.quantity * p.exportPrice;
  }
  if (!Number.isInteger(paid) || paid < 0 || paid > total) return fail(400, 'VALIDATION_ERROR', 'Số tiền trả phải nằm trong khoảng từ 0 đến tổng tiền');
  const limit = tierLimit(d.tier.name) || d.tier.maxDebt;
  if (d.currentDebt + (total - paid) > limit) return fail(422, 'RULE_VIOLATION_QD3', 'Vượt hạn mức nợ cho phép');
  return ok(createVoucher(d.id, rows, paid, Date.now(), c.user), { message: 'Lập phiếu xuất thành công' }, 201);
});

/* ------------------------------ Entry ------------------------------ */

export function handleMock(method: string, path: string, query: Query, body: unknown, token: string | null): MockResponse {
  const user = token?.startsWith('mock.') ? users.find((u) => u.id === token.slice(5)) ?? null : null;
  for (const [m, re, h] of routes) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (match) return h({ query, body, params: match.slice(1), user });
  }
  return fail(404, 'ROUTE_NOT_FOUND', 'The requested API endpoint was not found.');
}

export const mockMeta = { exportRatio, tierLimit };
