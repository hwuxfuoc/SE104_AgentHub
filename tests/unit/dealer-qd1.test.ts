import { describe, expect, it } from 'vitest';
import { assertDealerCapacity } from '../../src/modules/commercial/dealer/dealer.service.js';
import { createDealerSchema, updateDealerSchema } from '../../src/modules/commercial/dealer/dealer.schema.js';

describe('QD1 capacity and BM1 input', () => {
  it('accepts the last available slot and rejects a full/overfull district', () => {
    expect(() => assertDealerCapacity(3, 4)).not.toThrow();
    expect(() => assertDealerCapacity(4, 4)).toThrow('Quận đã đạt');
    expect(() => assertDealerCapacity(5, 4)).toThrow('Quận đã đạt');
    expect(() => assertDealerCapacity(4, 5)).not.toThrow();
  });
  it('rejects invalid dates, empty patches and attempts to set finance fields', () => {
    expect(updateDealerSchema.safeParse({}).success).toBe(false);
    expect(updateDealerSchema.safeParse({ currentDebt: 1 }).success).toBe(false);
    expect(updateDealerSchema.safeParse({ name: '   ' }).success).toBe(false);
    const input = { code: 'DL-1', name: 'Đại lý', phone: '0901234567', address: '123 ABC',
      email: 'test@example.com', districtId: 'district', tierId: 'tier', receivedDate: '2026-02-30T00:00:00Z' };
    expect(createDealerSchema.safeParse(input).success).toBe(false);
  });
});
