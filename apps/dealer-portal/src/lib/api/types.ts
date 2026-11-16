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

export interface DealerProfile {
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
}

/** Catalog */
export interface Category {
  id: string;
  code: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category: Category;
}

export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
}

export interface Sku {
  id: string;
  code: string;
  productId: string;
  product: Product;
  unit: string;
  currentPrice?: number;
  importPrice?: number;
}

export interface Pricing {
  id: string;
  skuId: string;
  importPrice: number;
  exportPrice: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  skuId: string;
  minimumQuantity: number;
  discountPercent: number;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

/** Orders */
export type OrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  skuId: string;
  skuCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  items: OrderItem[];
}

/** Invoices */
export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string | null;
  salesOrderId?: string | null;
  orderNumber?: string | null;
}

/** Debt */
export type LedgerType = 'INVOICE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';

export interface DebtLedgerEntry {
  id: string;
  transactionType: LedgerType;
  referenceCode?: string | null;
  debitAmount: number;
  creditAmount: number;
  previousBalance: number;
  currentBalance: number;
  notes?: string | null;
  createdAt: string;
}

export interface DebtSummary {
  currentDebt: number;
  maxDebtAllowed: number;
  remainingCredit: number;
  isDebtExceeded: boolean;
  lastPaymentDate?: string | null;
  lastPaymentAmount?: number | null;
}

/** Returns */
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  salesOrderId: string;
  orderNumber: string;
  status: ReturnStatus;
  reason: string;
  debtCreditAmount: number;
  createdAt: string;
}
