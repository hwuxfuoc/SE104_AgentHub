import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Card';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc đã được di chuyển."
      action={<Link to="/"><Button>Về trang chủ</Button></Link>}
    />
  );
}
