import { FlaskConical } from 'lucide-react';

/** Banner cho các màn hình mà backend chưa có API: giúp nhóm biết dữ liệu đang mock. */
export function MockNotice({ children }: { children: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-400/40 bg-warning-soft px-4 py-3 text-sm text-warning">
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <p>
        <b>Dữ liệu mock.</b> {children}
      </p>
    </div>
  );
}
