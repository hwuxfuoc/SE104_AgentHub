import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RequireFeature } from '@/auth/guards';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const DealersPage = lazy(() => import('@/features/dealers/DealersPage'));
const DealerDetailPage = lazy(() => import('@/features/dealers/DealerDetailPage'));
const ProductsPage = lazy(() => import('@/features/inventory/ProductsPage'));
const PurchaseReceiptsPage = lazy(() => import('@/features/vouchers/PurchaseReceiptsPage'));
const SalesVouchersPage = lazy(() => import('@/features/vouchers/SalesVouchersPage'));
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage'));
const InvoicesPage = lazy(() => import('@/features/payments/InvoicesPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const RulesPage = lazy(() => import('@/features/rules/RulesPage'));
const AuditLogPage = lazy(() => import('@/features/rules/AuditLogPage'));
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));

export default function App() {
  return (
    <Suspense fallback={<div className="grid h-full place-items-center"><Spinner className="size-8" /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<RequireFeature feature="dashboard" />}>
              <Route index element={<DashboardPage />} />
            </Route>
            <Route element={<RequireFeature feature="dealers" />}>
              <Route path="dealers" element={<DealersPage />} />
              <Route path="dealers/:id" element={<DealerDetailPage />} />
            </Route>
            <Route element={<RequireFeature feature="products" />}>
              <Route path="products" element={<ProductsPage />} />
            </Route>
            <Route element={<RequireFeature feature="purchase-receipts" />}>
              <Route path="purchase-receipts" element={<PurchaseReceiptsPage />} />
            </Route>
            <Route element={<RequireFeature feature="sales-vouchers" />}>
              <Route path="sales-vouchers" element={<SalesVouchersPage />} />
            </Route>
            <Route element={<RequireFeature feature="payments" />}>
              <Route path="payments" element={<PaymentsPage />} />
            </Route>
            <Route element={<RequireFeature feature="invoices" />}>
              <Route path="invoices" element={<InvoicesPage />} />
            </Route>
            <Route element={<RequireFeature feature="reports.sales" />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RequireFeature feature="rules" />}>
              <Route path="rules" element={<RulesPage />} />
            </Route>
            <Route element={<RequireFeature feature="audit" />}>
              <Route path="audit-logs" element={<AuditLogPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
