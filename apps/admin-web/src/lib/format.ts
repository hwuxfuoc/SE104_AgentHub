const TZ = 'Asia/Ho_Chi_Minh';

const vnd = new Intl.NumberFormat('vi-VN');

/** Tiền VNĐ: số nguyên, phân tách hàng nghìn kiểu Việt Nam. */
export const formatNumber = (n: number) => vnd.format(Math.round(n));
export const formatVnd = (n: number) => `${vnd.format(Math.round(n))} ₫`;

export const formatDate = (iso: string | Date) =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    typeof iso === 'string' ? new Date(iso) : iso,
  );

export const formatDateTime = (iso: string | Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);

export const formatPercent = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;

export const todayIso = () => new Date().toISOString();

/** `YYYY-MM-DD` cho input[type=date], theo giờ Việt Nam. */
export const toDateInput = (d: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

/** Chuyển `YYYY-MM-DD` (giờ VN) sang ISO có timezone như backend yêu cầu. */
export const dateInputToIso = (value: string) => new Date(`${value}T00:00:00+07:00`).toISOString();

/** Chuỗi nhập tay "1.500.000" -> 1500000 (NaN nếu rỗng). */
export const parseMoney = (v: string) => {
  const digits = v.replace(/[^\d]/g, '');
  return digits ? Number(digits) : NaN;
};

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
