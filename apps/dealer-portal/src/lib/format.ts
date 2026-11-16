const TZ = 'Asia/Ho_Chi_Minh';
const vnd = new Intl.NumberFormat('vi-VN');

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

export const toDateInput = (d: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
