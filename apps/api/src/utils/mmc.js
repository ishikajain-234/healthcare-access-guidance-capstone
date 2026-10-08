/**
 * Pure Mathematical M/M/c (Erlang-C) Analytical Benchmark Module
 *
 * Implements theoretical multiserver queueing calculations according to Kendall's M/M/c model.
 * Note: M/M/c is an analytical reference benchmark, not an empirical prediction or guarantee.
 */

/**
 * Calculates factorial of non-negative integer n.
 */
function factorial(n) {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

/**
 * Computes M/M/c queueing performance metrics.
 *
 * @param {Object} params
 * @param {number} params.lambda - Arrival rate in patients per hour (lambda > 0)
 * @param {number} params.mu - Service rate per counter in patients per hour (mu > 0)
 * @param {number} params.c - Number of active parallel counters/servers (c >= 0)
 * @returns {Object} M/M/c benchmark results
 */
function calculateMmc({ lambda, mu, c }) {
  const numServers = parseInt(c, 10);

  // If no servers are active, the queue is non-operational and unstable
  if (!numServers || numServers <= 0) {
    return {
      lambda_per_hour: lambda,
      mu_per_counter_per_hour: mu,
      servers: 0,
      rho: null,
      p0: null,
      p_wait: null,
      lq: null,
      wq_minutes: null,
      stable: false,
      stability_note: 'Unstable: Zero active counters available.',
    };
  }

  const r = lambda / mu; // Offered traffic load (Erlangs)
  const rho = lambda / (numServers * mu); // Server utilization

  // System stability condition: rho < 1
  if (rho >= 1.0) {
    return {
      lambda_per_hour: lambda,
      mu_per_counter_per_hour: mu,
      servers: numServers,
      rho: Math.round(rho * 10000) / 10000,
      p0: null,
      p_wait: null,
      lq: null,
      wq_minutes: null,
      stable: false,
      stability_note: `Unstable: Traffic intensity rho (${rho.toFixed(4)}) >= 1.0. Arrival rate exceeds collective service capacity.`,
    };
  }

  // Calculate P0 (Probability that all servers are idle)
  // P0 = 1 / [ sum_{k=0}^{c-1} (r^k / k!) + (r^c / (c! * (1 - rho))) ]
  let sumTerms = 0;
  for (let k = 0; k < numServers; k++) {
    sumTerms += Math.pow(r, k) / factorial(k);
  }

  const lastTerm = Math.pow(r, numServers) / (factorial(numServers) * (1 - rho));
  const p0 = 1.0 / (sumTerms + lastTerm);

  // Calculate Pwait (Erlang-C formula: Probability that an arriving patient must wait)
  // Pwait = [ r^c / (c! * (1 - rho)) ] * P0
  const pWait = lastTerm * p0;

  // Calculate Lq (Expected number of patients waiting in queue)
  // Lq = (Pwait * rho) / (1 - rho)
  const lq = (pWait * rho) / (1 - rho);

  // Calculate Wq (Expected waiting time in queue via Little's Law: Wq = Lq / lambda in hours)
  const wqHours = lq / lambda;
  const wqMinutes = wqHours * 60;

  return {
    lambda_per_hour: lambda,
    mu_per_counter_per_hour: mu,
    servers: numServers,
    rho: Math.round(rho * 10000) / 10000,
    p0: Math.round(p0 * 1000000) / 1000000,
    p_wait: Math.round(pWait * 1000000) / 1000000,
    lq: Math.round(lq * 100) / 100,
    wq_minutes: Math.round(wqMinutes * 100) / 100,
    stable: true,
  };
}

module.exports = {
  calculateMmc,
  factorial,
};
