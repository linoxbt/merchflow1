/** Tiny CSV parser. Handles quoted fields and embedded commas. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          val += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        val += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(val);
        val = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(val);
        rows.push(cur);
        cur = [];
        val = "";
      } else {
        val += c;
      }
    }
  }
  if (val.length || cur.length) {
    cur.push(val);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type CsvPayrollRow = {
  label: string;
  wallet: string | null;
  amountUsd: number;
};

/**
 * Parses a payroll CSV with headers: label, wallet, amount_usd.
 * (Header row required; column order arbitrary.)
 */
export function parsePayrollCsv(text: string): { rows: CsvPayrollRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: CsvPayrollRow[] = [];
  const parsed = parseCsv(text);
  if (!parsed.length) return { rows, errors: ["CSV is empty."] };

  const header = parsed[0].map((h) => h.trim().toLowerCase());
  const labelIdx = header.findIndex((h) => /^(label|name|recipient)$/.test(h));
  const walletIdx = header.findIndex((h) => /^(wallet|address)$/.test(h));
  const amountIdx = header.findIndex((h) => /^(amount_usd|amount|usd)$/.test(h));

  if (labelIdx < 0 || amountIdx < 0) {
    return {
      rows,
      errors: ['Required headers missing. Expected at least "label" and "amount_usd".'],
    };
  }

  for (let i = 1; i < parsed.length; i++) {
    const r = parsed[i];
    const label = (r[labelIdx] ?? "").trim();
    const wallet = walletIdx >= 0 ? (r[walletIdx] ?? "").trim() : "";
    const amount = parseFloat((r[amountIdx] ?? "").replace(/[,$]/g, ""));

    if (!label) {
      errors.push(`Row ${i + 1}: missing label`);
      continue;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Row ${i + 1}: invalid amount "${r[amountIdx]}"`);
      continue;
    }
    if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      errors.push(`Row ${i + 1}: invalid wallet "${wallet}"`);
      continue;
    }
    rows.push({ label, wallet: wallet || null, amountUsd: amount });
  }
  return { rows, errors };
}
