export function getPaymentPath(invoiceNumber: string) {
  return `/p/${encodeURIComponent(invoiceNumber)}`;
}

export function getPaymentUrl(invoiceNumber: string, origin?: string) {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${getPaymentPath(invoiceNumber)}`;
}

export function parsePaymentTarget(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/\/(?:p|pay)\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : trimmed;
}
