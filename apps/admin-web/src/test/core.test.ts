import { describe, expect, it } from 'vitest';
import { can } from '@/auth/permissions';
import { dateInputToIso, formatVnd, parseMoney } from '@/lib/format';
import { handleMock } from '@/mocks/mock-server';

const login = (email: string) => (handleMock('POST', '/auth/login', {}, { email, password: 'password123' }, null).body as any).data.token as string;

describe('permissions', () => {
  it('chỉ Admin được sửa quy định', () => {
    expect(can('ADMIN', 'rules.write')).toBe(true);
    expect(can('SALES', 'rules.write')).toBe(false);
  });
  it('chỉ Admin/Accountant lập phiếu thu và xem BM6.2', () => {
    expect(can('ACCOUNTANT', 'payments.write')).toBe(true);
    expect(can('SALES', 'payments.write')).toBe(false);
    expect(can('SALES', 'reports.debt')).toBe(false);
  });
});

describe('format', () => {
  it('định dạng tiền VNĐ nguyên đồng', () => {
    expect(formatVnd(1500000)).toContain('1.500.000');
  });
  it('parse tiền nhập tay', () => {
    expect(parseMoney('1.500.000')).toBe(1500000);
    expect(Number.isNaN(parseMoney(''))).toBe(true);
  });
  it('ngày nhập → ISO có timezone +07', () => {
    expect(dateInputToIso('2026-10-23')).toBe('2026-10-22T17:00:00.000Z');
  });
});

describe('mock backend – quy tắc nghiệp vụ', () => {
  it('QĐ5: chặn thu vượt công nợ', async () => {
    const token = login('accountant@agenthub.vn');
    const dealers = handleMock('GET', '/dealers', { limit: '100' }, null, token).body as any;
    const d = dealers.data.find((x: any) => x.currentDebt > 0);
    const res = handleMock('POST', '/payments', {}, { dealerId: d.id, amount: d.currentDebt + 1 }, token);
    expect(res.status).toBe(422);
    expect((res.body as any).code).toBe('RULE_VIOLATION_QD5');
  });
  it('QĐ1: quận đủ đại lý thì từ chối', () => {
    const token = login('admin@agenthub.vn');
    const base = { name: 'X', phone: '0900000000', address: 'A', email: '', tierId: 'tier1', districtId: 'dist5' };
    let last: any;
    for (let i = 0; i < 4; i++) last = handleMock('POST', '/dealers', {}, base, token);
    expect(last.status).toBe(422);
    expect(last.body.code).toBe('RULE_VIOLATION_QD1');
  });
  it('phân quyền: Warehouse không lập phiếu thu', () => {
    const token = login('warehouse@agenthub.vn');
    expect(handleMock('POST', '/payments', {}, { dealerId: 'd1', amount: 1 }, token).status).toBe(403);
  });
});
