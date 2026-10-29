import { forwardRef, type InputHTMLAttributes } from 'react';
import { Input } from './Fields';
import { formatNumber, parseMoney } from '@/lib/format';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  value: number | undefined;
  onValueChange: (v: number | undefined) => void;
}

/** Ô nhập tiền VNĐ: hiển thị "1.500.000", giá trị trả về là số nguyên. */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput({ value, onValueChange, ...rest }, ref) {
  return (
    <Input
      ref={ref}
      inputMode="numeric"
      autoComplete="off"
      value={value === undefined || Number.isNaN(value) ? '' : formatNumber(value)}
      onChange={(e) => {
        const n = parseMoney(e.target.value);
        onValueChange(Number.isNaN(n) ? undefined : n);
      }}
      leading={<span className="text-xs font-medium">₫</span>}
      {...rest}
    />
  );
});
