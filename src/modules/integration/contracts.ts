/**
 * API Contract Types for Frontend Integration (P1: Dealer Portal, P2: Internal Admin Portal)
 */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  details?: any;
  errors?: Array<{ path: string; message: string }>;
}

// Payment BM5 Contract
export interface PaymentCreateRequest {
  dealerId: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
  notes?: string;
  receiptNumber?: string;
}

export interface PaymentItemResponse {
  id: string;
  receiptNumber: string;
  dealerId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  notes?: string | null;
  collector?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  dealer?: {
    id: string;
    code: string;
    name: string;
    phone: string;
    address: string;
    email: string;
    district?: { name: string };
    tier?: { name: string };
  };
  allocations?: Array<{
    id: string;
    amount: number;
    invoice: {
      id: string;
      invoiceNumber: string;
      totalAmount: number;
      status: string;
    };
  }>;
}

// Invoice Contract
export interface InvoiceCreateRequest {
  dealerId: string;
  salesOrderId?: string;
  totalAmount: number;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  invoiceNumber?: string;
}

export interface InvoiceItemResponse {
  id: string;
  invoiceNumber: string;
  salesOrderId?: string | null;
  dealerId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  dealer?: {
    id: string;
    code: string;
    name: string;
    phone: string;
    address: string;
    district?: { name: string };
    tier?: { name: string };
  };
}

// Debt Summary BM4 Contract
export interface DealerDebtSummaryResponse {
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
  recentTransactions: Array<{
    id: string;
    transactionType: string;
    referenceType: string;
    referenceCode?: string | null;
    debitAmount: number;
    creditAmount: number;
    previousBalance: number;
    currentBalance: number;
    notes?: string | null;
    createdAt: string;
  }>;
}

// BM6.1 Sales Report Contract
export interface SalesReportResponse {
  title: string;
  month: number;
  year: number;
  generatedAt: string;
  summary: {
    totalRevenue: number;
    totalExportCount: number;
    activeDealersCount: number;
  };
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

// BM6.2 Debt Report Contract
export interface DebtReportResponse {
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

// Credit Limit Check Contract
export interface CreditCheckResponse {
  allowed: boolean;
  dealerId: string;
  dealerName: string;
  tierName: string;
  currentDebt: number;
  orderAmount: number;
  expectedDebt: number;
  maxDebtAllowed: number;
  remainingCredit: number;
  reason?: string;
}

