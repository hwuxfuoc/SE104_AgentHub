import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/guards';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';

const LoginPage       = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage   = lazy(() => import('@/features/dashboard/DashboardPage'));
const ProfilePage     = lazy(() => import('@/features/profile/ProfilePage'));
const CatalogPage     = lazy(() => import('@/features/catalog/CatalogPage'));
const OrdersPage      = lazy(() => import('@/features/orders/OrdersPage'));
const NewOrderPage    = lazy(() => import('@/features/orders/NewOrderPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'));
const InvoicesPage    = lazy(() => import('@/features/invoices/InvoicesPage'));
const DebtPage        = lazy(() => import('@/features/debt/DebtPage'));
const ReturnsPage     = lazy(() => import('@/features/returns/ReturnsPage'));
const NotFoundPage    = lazy(() => import('@/features/NotFoundPage'));

export default function App() {
  return (
    <Suspense fallback={<div className="grid h-full place-items-center"><Spinner className="size-8" /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index            element={<DashboardPage />} />
            <Route path="profile"   element={<ProfilePage />} />
            <Route path="catalog"   element={<CatalogPage />} />
            <Route path="orders"    element={<OrdersPage />} />
            <Route path="orders/new" element={<NewOrderPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="invoices"  element={<InvoicesPage />} />
            <Route path="debt"      element={<DebtPage />} />
            <Route path="returns"   element={<ReturnsPage />} />
            <Route path="*"         element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
