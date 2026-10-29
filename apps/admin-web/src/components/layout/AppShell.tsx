import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3, Boxes, ClipboardList, FileDown, FileUp, LayoutDashboard, LogOut, Menu, Moon, PackageSearch, ScrollText, Settings2, Store, Sun, Wallet, X, FlaskConical,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { can, ROLE_LABELS, type Feature } from '@/auth/permissions';
import { API_MODE } from '@/lib/api/client';
import { useTheme } from '@/lib/use-theme';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  hint: string;
  icon: typeof Store;
  feature: Feature;
  mock?: boolean;
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  { group: 'Tổng quan', items: [{ to: '/', label: 'Dashboard', hint: 'Tổng quan', icon: LayoutDashboard, feature: 'dashboard' }] },
  {
    group: 'Đại lý',
    items: [{ to: '/dealers', label: 'Đại lý', hint: 'Dealers · BM1, BM4', icon: Store, feature: 'dealers' }],
  },
  {
    group: 'Kho & Bán hàng',
    items: [
      { to: '/products', label: 'Hàng hóa & Tồn kho', hint: 'Inventory', icon: Boxes, feature: 'products', mock: true },
      { to: '/purchase-receipts', label: 'Phiếu nhập hàng', hint: 'Purchase · BM2', icon: FileDown, feature: 'purchase-receipts', mock: true },
      { to: '/sales-vouchers', label: 'Phiếu xuất hàng', hint: 'Sales · BM3', icon: FileUp, feature: 'sales-vouchers', mock: true },
    ],
  },
  {
    group: 'Tài chính',
    items: [
      { to: '/payments', label: 'Thu tiền & Công nợ', hint: 'Payments · BM5', icon: Wallet, feature: 'payments' },
      { to: '/invoices', label: 'Hóa đơn', hint: 'Invoices', icon: ClipboardList, feature: 'invoices' },
      { to: '/reports', label: 'Báo cáo tháng', hint: 'Reports · BM6', icon: BarChart3, feature: 'reports.sales' },
    ],
  },
  {
    group: 'Hệ thống',
    items: [
      { to: '/rules', label: 'Quy định', hint: 'Rules · QĐ7', icon: Settings2, feature: 'rules' },
      { to: '/audit-logs', label: 'Nhật ký thao tác', hint: 'Audit log', icon: ScrollText, feature: 'audit' },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid size-8 place-items-center rounded-lg bg-brand">
          <PackageSearch className="size-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-[14px] font-semibold text-white">AgentHub</p>
          <p className="text-[11px] text-sidebar-ink">Nội bộ</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(user?.role, i.feature));
          if (!items.length) return null;
          return (
            <div key={g.group}>
              <p className="mb-1 px-3 text-[11px] font-medium text-sidebar-ink/50">{g.group}</p>
              <ul className="space-y-0.5">
                {items.map(({ to, label, hint, icon: Icon, mock }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      onClick={onNavigate}
                      title={hint}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive ? 'bg-white/10 text-white' : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={cn('size-[16px] transition-colors', isActive ? 'text-white' : 'text-sidebar-ink/70 group-hover:text-white')} />
                          <span className="flex-1 truncate">{label}</span>
                          {mock && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">MOCK</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-sidebar-ink">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-white">
          <FlaskConical className="size-3.5" /> Chế độ dữ liệu: {API_MODE === 'mock' ? 'Mock' : 'Backend thật'}
        </p>
        {API_MODE === 'mock' ? 'Dữ liệu giả lập trong trình duyệt. Mục gắn MOCK chưa có API backend.' : 'Mục gắn MOCK vẫn chưa có API backend.'}
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="animate-slide-in relative h-full w-72 bg-sidebar">
            <button onClick={() => setOpen(false)} aria-label="Đóng menu" className="absolute top-4 right-3 cursor-pointer text-sidebar-ink">
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur lg:px-8">
          <button onClick={() => setOpen(true)} aria-label="Mở menu" className="cursor-pointer rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <button onClick={toggle} aria-label="Đổi giao diện sáng/tối" className="cursor-pointer rounded-xl p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink">
            {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          <div className="flex items-center gap-3 border-l border-line pl-4">
            <div className="grid size-9 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{initials(user?.fullName ?? '?')}</div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold">{user?.fullName}</p>
              <p className="text-xs text-muted">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
            <button onClick={logout} aria-label="Đăng xuất" title="Đăng xuất" className="cursor-pointer rounded-xl p-2.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger">
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div key={location.pathname} className="animate-fade-up mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
