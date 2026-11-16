import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, PackageSearch, RotateCcw, ShoppingCart, Sun, User, Wallet, X,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/lib/use-theme';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';

interface NavItem { to: string; label: string; hint: string; icon: typeof LayoutDashboard; }

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Tổng quan',
    items: [{ to: '/', label: 'Trang chủ', hint: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Thông tin',
    items: [{ to: '/profile', label: 'Hồ sơ đại lý', hint: 'Dealer profile · BM1', icon: User }],
  },
  {
    group: 'Mua hàng',
    items: [
      { to: '/catalog',  label: 'Danh mục sản phẩm', hint: 'Catalog · BM2', icon: PackageSearch },
      { to: '/orders',   label: 'Đơn hàng của tôi',  hint: 'Orders · BM3',   icon: ShoppingCart },
    ],
  },
  {
    group: 'Tài chính',
    items: [
      { to: '/invoices', label: 'Hóa đơn',        hint: 'Invoices',         icon: ClipboardList },
      { to: '/debt',     label: 'Công nợ',         hint: 'Debt · BM5',       icon: Wallet },
      { to: '/returns',  label: 'Yêu cầu trả hàng', hint: 'Returns',         icon: RotateCcw },
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
          <p className="text-[11px] text-sidebar-ink">Cổng đại lý</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="mb-1 px-3 text-[11px] font-medium text-sidebar-ink/50">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map(({ to, label, hint, icon: Icon }) => (
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
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {user?.dealer && (
        <div className="m-3 rounded-xl bg-white/5 p-3">
          <p className="text-[11px] font-semibold text-white">{user.dealer.name}</p>
          <p className="text-[11px] text-sidebar-ink">Mã: {user.dealer.code}</p>
        </div>
      )}
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
            <div className="grid size-9 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
              {initials(user?.fullName ?? '?')}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold">{user?.fullName}</p>
              <p className="text-xs text-muted">{user?.dealer?.name ?? 'Đại lý'}</p>
            </div>
            <button onClick={logout} aria-label="Đăng xuất" title="Đăng xuất" className="cursor-pointer rounded-xl p-2.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger">
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div key={location.pathname} className="animate-fade-up mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
