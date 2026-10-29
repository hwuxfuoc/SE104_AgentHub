import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `drawer`: panel trượt từ phải (form dài); `dialog`: hộp thoại giữa màn hình. */
  variant?: 'drawer' | 'dialog';
  width?: string;
}

export function Overlay({ open, onClose, title, description, children, footer, variant = 'dialog', width }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const drawer = variant === 'drawer';
  return createPortal(
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          'relative flex max-h-full flex-col bg-surface shadow-pop',
          drawer ? 'animate-slide-in ml-auto h-full w-full' : 'animate-pop-in m-auto w-full max-w-lg rounded-2xl',
          drawer ? width ?? 'max-w-xl' : width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Đóng" className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
