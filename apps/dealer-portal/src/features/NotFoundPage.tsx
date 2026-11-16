import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-6xl font-bold text-muted">404</p>
      <h1 className="text-xl font-semibold">Trang không tồn tại</h1>
      <p className="text-sm text-muted">Địa chỉ bạn truy cập không có trong hệ thống.</p>
      <Link to="/">
        <Button variant="secondary">Về trang chủ</Button>
      </Link>
    </div>
  );
}
