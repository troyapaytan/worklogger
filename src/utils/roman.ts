/**
 * Converts a positive integer into standard Roman numerals.
 * Supports infinite positive values (up to 3999 standard, and larger numbers gracefully).
 */
export function toRoman(num: number): string {
  if (num <= 0 || !Number.isFinite(num)) return '';
  const romanMap: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let n = Math.floor(num);
  for (const [val, roman] of romanMap) {
    while (n >= val) {
      result += roman;
      n -= val;
    }
  }
  return result;
}
