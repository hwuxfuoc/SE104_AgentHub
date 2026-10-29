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

/** Thông báo nghiệp vụ tiếng Việt, hiển thị thay cho message kỹ thuật từ backend. */
const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  VALIDATION_ERROR: 'Dữ liệu nhập chưa hợp lệ. Vui lòng kiểm tra lại.',
  DEALER_CODE_EXISTS: 'Mã đại lý đã tồn tại.',
  WRITE_CONFLICT: 'Dữ liệu vừa bị thay đổi bởi thao tác khác. Vui lòng thử lại.',
  RULE_VIOLATION_QD1: 'Quận đã đủ số đại lý tối đa theo quy định (QĐ1).',
  RULE_VIOLATION_QD2: 'Mặt hàng hoặc đơn vị tính không thuộc danh mục hiện hành (QĐ2).',
  RULE_VIOLATION_QD3: 'Vượt hạn mức nợ cho phép của loại đại lý (QĐ3).',
  RULE_VIOLATION_QD5: 'Số tiền thu vượt quá số tiền đại lý đang nợ (QĐ5).',
  INSUFFICIENT_STOCK: 'Không đủ tồn kho để xuất hàng.',
  ROUTE_NOT_FOUND: 'API chưa được backend triển khai.',
  NETWORK_ERROR: 'Không kết nối được máy chủ. Kiểm tra backend hoặc chuyển sang chế độ mock.',
};

export const errorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    // Ưu tiên message backend nếu đã là tiếng Việt có ý nghĩa nghiệp vụ.
    if (e.code.startsWith('RULE_VIOLATION') || e.code === 'INSUFFICIENT_STOCK') {
      return e.message && /[À-ỹ]/.test(e.message) ? e.message : MESSAGES[e.code] ?? e.message;
    }
    return MESSAGES[e.code] ?? e.message;
  }
  if (e instanceof Error) return e.message;
  return 'Đã xảy ra lỗi không xác định.';
};
