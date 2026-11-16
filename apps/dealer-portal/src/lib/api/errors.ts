import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors: Array<{ path: string; message: string }>;

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message ?? 'Request failed');
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    this.fieldErrors = body.errors ?? [];
  }
}

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  VALIDATION_ERROR: 'Dữ liệu nhập chưa hợp lệ. Vui lòng kiểm tra lại.',
  RULE_VIOLATION_QD3: 'Vượt hạn mức nợ cho phép của loại đại lý (QĐ3).',
  INSUFFICIENT_STOCK: 'Không đủ tồn kho để xuất hàng.',
  NETWORK_ERROR: 'Không kết nối được máy chủ.',
};

export const errorMessage = (e: unknown): string => {
  if (e instanceof ApiError) return MESSAGES[e.code] ?? e.message;
  if (e instanceof Error) return e.message;
  return 'Đã xảy ra lỗi không xác định.';
};
