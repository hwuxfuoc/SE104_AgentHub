import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Card = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-line bg-surface', className)} {...rest} />
);

export const CardHeader = ({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
    <div>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
    </div>
    {action}
  </div>
);

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand-soft text-brand-strong',
};

export const Badge = ({ tone = 'neutral', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>
    {dot && <span className="size-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton h-4 w-full', className)} />;

export const EmptyState = ({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
    {icon && <div className="mb-1 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">{icon}</div>}
    <p className="font-medium">{title}</p>
    {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
