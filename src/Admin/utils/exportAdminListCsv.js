function escapeCsvValue(value) {
  if (value == null) return "";
  const text = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * @param {{ filename: string, exportColumns: { id: string, label: string, getValue?: (row: object) => unknown }[], rows: object[] }} options
 */
export function exportListToCsv({ filename, exportColumns = [], rows = [] }) {
  if (!exportColumns.length) return;

  const headerLine = exportColumns.map((col) => escapeCsvValue(col.label)).join(",");
  const bodyLines = rows.map((row) =>
    exportColumns
      .map((col) => {
        const raw = col.getValue ? col.getValue(row) : row?.[col.id];
        return escapeCsvValue(raw);
      })
      .join(",")
  );

  const csv = `\uFEFF${[headerLine, ...bodyLines].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
