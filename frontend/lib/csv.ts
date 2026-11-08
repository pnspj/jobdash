/**
 * Minimal RFC 4180 CSV parser / serializer.
 * Handles quoted fields, escaped quotes (""), embedded newlines, CRLF and a leading BOM.
 */

export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Flush the last field unless the file ended with a newline
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop completely blank lines
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const escapeField = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeField).join(',')).join('\r\n') + '\r\n';
}

/** Trigger a browser download. A BOM is prepended so Excel opens UTF-8 correctly. */
export function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
