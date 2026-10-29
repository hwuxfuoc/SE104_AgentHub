/** Kiểu dữ liệu khớp contract backend (`src/modules/integration/contracts.ts`, docs P3/P5). */

export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTANT' | 'DEALER';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiErrorBody {
  success: false;
  code: string;
  message: string;
  details?: unknown;
  errors?: Array<{ path: string; message: string }>;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  dealerId: string | null;
  dealer?: { id: string; code: string; name: string } | null;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface District {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface DealerTier {
  id: string;
  name: string;
  maxDebt: number;
  isActive: boolean;
}

export type DealerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Dealer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  districtId: string;
  tierId: string;
  district: District;
  tier: DealerTier;
  receivedDate: string;
  status: DealerStatus;
  currentDebt: number;
  createdAt: string;
}

export interface DealerInput {
  code?: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  districtId: string;
  tierId: string;
  receivedDate?: string;
  status?: DealerStatus;
}

export interface DealerQuery {
  page?: number;
  limit?: number;
  search?: string;
  districtId?: string;
  tierId?: string;
  status?: DealerStatus | '';
  sortBy?: 'name' | 'code' | 'receivedDate' | 'createdAt' | 'currentDebt';
  sortOrder?: 'asc' | 'desc';
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface Payment {
  id: string;
  receiptNumber: string;
  dealerId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  collector?: { id: string; fullName: string; email: string; role: string } | null;
  dealer?: Pick<Dealer, 'id' | 'code' | 'name' | 'phone' | 'address' | 'email'>;
  allocations?: Array<{
    id: string;
    amount: number;
    invoice: { id: string; invoiceNumber: string; totalAmount: number; status: string };
  }>;
}

export interface PaymentInput {
  dealerId: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  dealerId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string | null;
  dealer?: Pick<Dealer, 'id' | 'code' | 'name'>;
}

export interface DebtLedgerEntry {
  id: string;
  transactionType: 'INVOICE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
  referenceType: string;
  referenceCode?: string | null;
  debitAmount: number;
  creditAmount: number;
  previousBalance: number;
  currentBalance: number;
  notes?: string | null;
  createdAt: string;
}

export interface DealerDebtSummary {
  dealer: {
    id: string;
    code: string;
    name: string;
    phone: string;
    address: string;
    email: string;
    district: string;
    tier: string;
    status: string;
  };
  currentDebt: number;
  maxDebtAllowed: number;
  remainingCredit: number;
  isDebtExceeded: boolean;
  lastPaymentDate?: string | null;
  lastPaymentAmount?: number | null;
  lastInvoiceDate?: string | null;
  lastInvoiceAmount?: number | null;
  recentTransactions: DebtLedgerEntry[];
}

export interface SalesReport {
  title: string;
  month: number;
  year: number;
  generatedAt: string;
  summary: { totalRevenue: number; totalExportCount: number; activeDealersCount: number };
  rows: Array<{
    stt: number;
    dealerId: string;
    dealerCode: string;
    dealerName: string;
    district: string;
    tier: string;
    exportCount: number;
    totalRevenue: number;
    percentage: number;
  }>;
}

export interface DebtReport {
  title: string;
  month: number;
  year: number;
  generatedAt: string;
  summary: {
    totalOpeningDebt: number;
    totalIncurredDebit: number;
    totalIncurredCredit: number;
    totalIncurredDebt: number;
    totalClosingDebt: number;
    totalDealersCount: number;
  };
  rows: Array<{
    stt: number;
    dealerId: string;
    dealerCode: string;
    dealerName: string;
    district: string;
    tier: string;
    openingDebt: number;
    incurredDebit: number;
    incurredCredit: number;
    incurredDebt: number;
    closingDebt: number;
  }>;
}

export interface RuleHistory {
  id: string;
  oldValue: unknown;
  newValue: unknown;
  changeReason?: string | null;
  changedAt: string;
  changedBy: { id: string; fullName: string; email: string; role: string };
}

export interface BusinessRule {
  id: string;
  code: 'QD1' | 'QD2' | 'QD3' | 'QD5' | 'QD7' | string;
  name: string;
  description?: string | null;
  value: Record<string, unknown>;
  isActive: boolean;
  updatedAt: string;
  histories: RuleHistory[];
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { fullName: string; email: string } | null;
}

/* ---------- Các module backend chưa có: contract đề xuất (đang mock) ---------- */

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  importPrice: number;
  exportPrice: number;
  stock: number;
}

export interface VoucherLine {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseReceipt {
  id: string;
  code: string; // PN0001
  date: string;
  total: number;
  createdBy: string;
  lines: VoucherLine[];
}

export interface SalesVoucher {
  id: string;
  code: string; // PX0001
  date: string;
  dealerId: string;
  dealerName: string;
  total: number;
  paid: number;
  remaining: number;
  lines: VoucherLine[];
}
