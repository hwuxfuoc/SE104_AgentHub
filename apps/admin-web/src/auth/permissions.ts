import type { UserRole } from '@/lib/api/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  SALES: 'Kinh doanh',
  WAREHOUSE: 'Thủ kho',
  ACCOUNTANT: 'Kế toán',
  DEALER: 'Đại lý',
};

export type Feature =
  | 'dashboard'
  | 'dealers'
  | 'dealers.write'
  | 'products'
  | 'purchase-receipts'
  | 'sales-vouchers'
  | 'payments'
  | 'payments.write'
  | 'invoices'
  | 'reports.sales'
  | 'reports.debt'
  | 'rules'
  | 'rules.write'
  | 'audit';

/** Ma trận quyền giao diện — backend vẫn là nơi kiểm tra quyền thật sự. */
const MATRIX: Record<Feature, UserRole[]> = {
  dashboard: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTANT'],
  dealers: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTANT'],
  'dealers.write': ['ADMIN', 'SALES'],
  products: ['ADMIN', 'SALES', 'WAREHOUSE'],
  'purchase-receipts': ['ADMIN', 'WAREHOUSE', 'ACCOUNTANT'],
  'sales-vouchers': ['ADMIN', 'SALES', 'ACCOUNTANT'],
  payments: ['ADMIN', 'ACCOUNTANT', 'SALES'],
  'payments.write': ['ADMIN', 'ACCOUNTANT'],
  invoices: ['ADMIN', 'ACCOUNTANT', 'SALES'],
  'reports.sales': ['ADMIN', 'ACCOUNTANT', 'SALES'],
  'reports.debt': ['ADMIN', 'ACCOUNTANT'],
  rules: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTANT'],
  'rules.write': ['ADMIN'],
  audit: ['ADMIN', 'ACCOUNTANT'],
};

export const can = (role: UserRole | undefined, feature: Feature) => !!role && MATRIX[feature].includes(role);
export const isInternalRole = (role: UserRole) => role !== 'DEALER';
