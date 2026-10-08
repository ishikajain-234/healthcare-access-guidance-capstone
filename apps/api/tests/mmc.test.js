const { calculateMmc, factorial } = require('../src/utils/mmc');

describe('M/M/c (Erlang-C) Analytical Benchmark Unit Tests', () => {
  test('Factorial helper computes accurately', () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(4)).toBe(24);
    expect(factorial(5)).toBe(120);
    expect(factorial(6)).toBe(720);
  });

  describe('Frozen Architecture Benchmark Baselines (lambda=30, mu=8)', () => {
    test('c=4: rho=0.9375, P0=0.006561, Pwait=0.865030, Lq=12.98, Wq=25.95 mins', () => {
      const res = calculateMmc({ lambda: 30, mu: 8, c: 4 });

      expect(res.stable).toBe(true);
      expect(res.servers).toBe(4);
      expect(res.rho).toBe(0.9375);
      expect(res.p0).toBeCloseTo(0.006561, 6);
      expect(res.p_wait).toBeCloseTo(0.865030, 5);
      expect(res.lq).toBeCloseTo(12.98, 2);
      expect(res.wq_minutes).toBeCloseTo(25.95, 2);
    });

    test('c=5: rho=0.75, P0=0.018681, Pwait=0.461789, Lq=1.39, Wq=2.77 mins', () => {
      const res = calculateMmc({ lambda: 30, mu: 8, c: 5 });

      expect(res.stable).toBe(true);
      expect(res.servers).toBe(5);
      expect(res.rho).toBe(0.75);
      expect(res.p0).toBeCloseTo(0.018681, 6);
      expect(res.p_wait).toBeCloseTo(0.461789, 5);
      expect(res.lq).toBeCloseTo(1.39, 2);
      expect(res.wq_minutes).toBeCloseTo(2.77, 2);
    });

    test('c=6: rho=0.625, P0=0.022080, Pwait=0.227419, Lq=0.38, Wq=0.76 mins', () => {
      const res = calculateMmc({ lambda: 30, mu: 8, c: 6 });

      expect(res.stable).toBe(true);
      expect(res.servers).toBe(6);
      expect(res.rho).toBe(0.625);
      expect(res.p0).toBeCloseTo(0.022080, 6);
      expect(res.p_wait).toBeCloseTo(0.227419, 5);
      expect(res.lq).toBeCloseTo(0.38, 2);
      expect(res.wq_minutes).toBeCloseTo(0.76, 2);
    });
  });

  describe('Queue Stability Boundary & Edge Cases', () => {
    test('c=3 with lambda=30, mu=8 produces rho=1.25 >= 1 -> marked unstable', () => {
      const res = calculateMmc({ lambda: 30, mu: 8, c: 3 });

      expect(res.stable).toBe(false);
      expect(res.rho).toBe(1.25);
      expect(res.wq_minutes).toBeNull();
      expect(res.lq).toBeNull();
      expect(res.p0).toBeNull();
      expect(res.p_wait).toBeNull();
      expect(res.stability_note).toMatch(/Unstable/);
    });

    test('Critical boundary rho=1.0000 -> marked unstable', () => {
      // lambda=32, mu=8, c=4 -> rho = 32 / (4*8) = 1.0
      const res = calculateMmc({ lambda: 32, mu: 8, c: 4 });

      expect(res.stable).toBe(false);
      expect(res.rho).toBe(1);
      expect(res.wq_minutes).toBeNull();
    });

    test('Zero active servers (c=0) -> marked unstable without division by zero', () => {
      const res = calculateMmc({ lambda: 30, mu: 8, c: 0 });

      expect(res.stable).toBe(false);
      expect(res.servers).toBe(0);
      expect(res.wq_minutes).toBeNull();
      expect(res.stability_note).toMatch(/Zero active counters/);
    });
  });
});
