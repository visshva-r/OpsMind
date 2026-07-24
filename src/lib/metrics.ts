const queryTimesMs: number[] = [];

export function recordQueryTime(ms: number) {
  queryTimesMs.push(ms);
  if (queryTimesMs.length > 30) {
    queryTimesMs.shift();
  }
}

export function getAverageQueryTimeMs(): number {
  if (queryTimesMs.length === 0) return 95;
  const total = queryTimesMs.reduce((sum, value) => sum + value, 0);
  return Math.round(total / queryTimesMs.length);
}
