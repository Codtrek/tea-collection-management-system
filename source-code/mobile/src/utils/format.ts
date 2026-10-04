/**
 * Formats a currency amount using the Sri Lankan / Indian grouping style
 * (lakh / crore), e.g. 100000 -> "Rs. 1,00,000".
 */
export function formatLKR(amount: number): string {
  const value = Math.round(amount).toString();
  const lastThree = value.slice(-3);
  const other = value.slice(0, -3);

  const grouped = other
    ? `${other.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${lastThree}`
    : lastThree;

  return `Rs. ${grouped}`;
}

/**
 * Formats a weight in kilograms with thousand separators,
 * e.g. 34250 -> "34,250 kg".
 */
export function formatKg(kg: number): string {
  const grouped = Math.round(kg)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${grouped} kg`;
}
