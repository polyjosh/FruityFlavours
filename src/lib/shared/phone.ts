/**
 * Normalises a Kenyan mobile number to +254XXXXXXXXX.
 * Accepts 0712345678, 712345678, 254712345678, +254 712 345 678 and 01xx numbers.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  let local: string | null = null;
  if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  return local ? `+254${local}` : null;
}

/** Daraja expects 2547XXXXXXXX with no plus sign. */
export function toDarajaMsisdn(phone: string): string | null {
  const n = normalizeKenyanPhone(phone);
  return n ? n.slice(1) : null;
}

/** +254712345678 -> +254 712 ••• 678, for logs and screens that should not show the full number. */
export function maskPhone(phone: string): string {
  const n = normalizeKenyanPhone(phone);
  if (!n) return "•••";
  return `+254 ${n.slice(4, 7)} ••• ${n.slice(10)}`;
}

/** +254712345678 -> "0712 345 678" (how the design shows phone numbers). */
export function formatLocalPhone(phone: string): string {
  const n = normalizeKenyanPhone(phone);
  if (!n) return phone;
  const local = `0${n.slice(4)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
