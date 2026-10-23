export const UserRole = {
  ADMIN: 'ADMIN',
  SALES: 'SALES',
  WAREHOUSE: 'WAREHOUSE',
  ACCOUNTANT: 'ACCOUNTANT',
  DEALER: 'DEALER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const DealerStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type DealerStatus = typeof DealerStatus[keyof typeof DealerStatus];

export const OrderStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const InvoiceStatus = {
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

export const DebtTransactionType = {
  INVOICE: 'INVOICE',
  PAYMENT: 'PAYMENT',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type DebtTransactionType = typeof DebtTransactionType[keyof typeof DebtTransactionType];

export const BusinessRuleCodes = {
  QD1: 'QD1', // 2 loại đại lý, 20 quận, mỗi quận tối đa 4 đại lý
  QD2: 'QD2', // 5 mặt hàng, 3 đơn vị tính
  QD3: 'QD3', // Hạn mức nợ loại 1: 10M, loại 2: 5M; Đơn giá xuất = 102% đơn giá nhập
  QD5: 'QD5', // Số tiền thu không vượt quá số tiền đại lý đang nợ
  QD7: 'QD7', // Thay đổi quy định
} as const;

export type BusinessRuleCode = typeof BusinessRuleCodes[keyof typeof BusinessRuleCodes];

