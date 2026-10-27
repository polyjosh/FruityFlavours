/** Money is whole KES integers everywhere. Shown as `KES 1,500`. */
export function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-US")}`;
}
