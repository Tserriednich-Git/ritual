import { createId } from '../id';

describe('createId', () => {
  it('is a base36 timestamp prefix plus a random tail', () => {
    expect(createId()).toMatch(/^[0-9a-z]+-[0-9a-z]{10}$/);
  });

  it('does not repeat within a batch', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => createId()));
    expect(ids.size).toBe(5000);
  });

  it('sorts roughly by creation time', () => {
    const clock = jest.spyOn(Date, 'now');
    clock.mockReturnValue(1_770_000_000_000);
    const early = createId();
    clock.mockReturnValue(1_770_000_060_000);
    const later = createId();
    clock.mockRestore();

    const prefix = (id: string) => Number.parseInt(id.split('-')[0] ?? '0', 36);
    expect(prefix(later)).toBeGreaterThan(prefix(early));
  });
});
