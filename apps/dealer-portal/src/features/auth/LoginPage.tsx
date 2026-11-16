import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, PackageSearch, ShieldCheck, ShoppingCart, Wallet } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Fields';
import { errorMessage } from '@/lib/api/errors';

const schema = z.object({
  email:    z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await login(v.email, v.password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const fill = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'password123', { shouldValidate: true });
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-brand">
            <PackageSearch className="size-5" />
          </div>
          <span className="text-[15px] font-semibold">AgentHub</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl leading-tight font-bold tracking-tight">Cổng thông tin đại lý AgentHub.</h1>
          <p className="mt-4 text-white/70">Đặt hàng, theo dõi đơn hàng, xem hóa đơn và quản lý công nợ — mọi lúc, mọi nơi.</p>
          <ul className="mt-10 space-y-4 text-sm text-white/85">
            {[
              [ShoppingCart, 'Đặt hàng và theo dõi trạng thái giao hàng'],
              [Wallet,       'Xem công nợ và lịch sử thanh toán (BM5)'],
              [ShieldCheck,  'Thông tin hồ sơ đại lý và bảng giá hiện hành'],
            ].map(([Icon, text]) => {
              const I = Icon as typeof ShoppingCart;
              return (
                <li key={text as string} className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-white/10">
                    <I className="size-[18px]" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">© 2026 SE104 · AgentHub</p>
      </section>

      <section className="grid place-items-center p-6">
        <div className="animate-fade-up w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 grid size-9 place-items-center rounded-lg bg-brand">
              <PackageSearch className="size-5 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Đăng nhập</h2>
          <p className="mt-1 mb-7 text-sm text-muted">Đăng nhập vào cổng thông tin đại lý.</p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input label="Email" type="email" autoComplete="username" placeholder="daily@agenthub.vn"
              leading={<Mail className="size-4" />} error={errors.email?.message} {...register('email')} />
            <Input label="Mật khẩu" type="password" autoComplete="current-password" placeholder="••••••••"
              leading={<Lock className="size-4" />} error={errors.password?.message} {...register('password')} />
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Đăng nhập
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-line p-4">
            <p className="mb-3 text-xs font-medium text-muted">Tài khoản demo · mật khẩu: password123</p>
            <div className="flex flex-wrap gap-2">
              {[{ label: 'Đại lý A', email: 'dealer1@agenthub.vn' }, { label: 'Đại lý B', email: 'dealer2@agenthub.vn' }].map((d) => (
                <button key={d.email} type="button" onClick={() => fill(d.email)}
                  className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand hover:text-brand">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
