import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { can, type Feature } from './permissions';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldAlert } from 'lucide-react';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="grid h-full place-items-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireFeature({ feature }: { feature: Feature }) {
  const { user } = useAuth();
  if (!can(user?.role, feature)) return <Forbidden />;
  return <Outlet />;
}

export function Forbidden() {
  return (
    <div className="mx-auto mt-24 flex max-w-md flex-col items-center gap-3 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <ShieldAlert className="size-7" />
      </div>
      <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
      <p className="text-muted">Vai trò hiện tại của bạn không được phép xem chức năng này. Liên hệ quản trị viên nếu cần hỗ trợ.</p>
    </div>
  );
}
