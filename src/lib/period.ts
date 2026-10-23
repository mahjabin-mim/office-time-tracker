/** Reads ?year=&month= search params, falling back to the current period for anything invalid. */
export function parsePeriod(
  params: { year?: string; month?: string },
  current: { year: number; month: number }
): { year: number; month: number } {
  const year = Number(params.year);
  const month = Number(params.month);
  return {
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : current.year,
    month: Number.isInteger(month) && month >= 0 && month <= 11 ? month : current.month,
  };
}
