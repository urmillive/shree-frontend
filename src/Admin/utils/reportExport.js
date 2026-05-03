import { jsPDF } from "jspdf";

const toSafeString = (value) => {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const exportRowsToCsv = ({ filename, columns, rows }) => {
  const header = columns.map((col) => `"${col.label.replaceAll('"', '""')}"`).join(",");
  const dataLines = rows.map((row) =>
    columns.map((col) => `"${toSafeString(row[col.key]).replaceAll('"', '""')}"`).join(",")
  );
  const csvContent = [header, ...dataLines].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportRowsToPdf = ({ filename, title, filters = [], columns, rows }) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const lineHeight = 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  let cursorY = 44;

  const addPageIfNeeded = () => {
    if (cursorY < pageHeight - 40) return;
    doc.addPage();
    cursorY = 44;
  };

  doc.setFontSize(15);
  doc.text(title, marginX, cursorY);
  cursorY += lineHeight * 1.4;

  doc.setFontSize(10);
  filters.filter(Boolean).forEach((line) => {
    doc.text(line, marginX, cursorY);
    cursorY += lineHeight;
  });

  cursorY += 6;
  addPageIfNeeded();

  doc.setFontSize(9);
  doc.setFont("courier", "normal");

  const header = columns.map((col) => col.label).join(" | ");
  const divider = "-".repeat(Math.max(header.length, 20));
  doc.text(header, marginX, cursorY);
  cursorY += lineHeight;
  doc.text(divider, marginX, cursorY);
  cursorY += lineHeight;

  rows.forEach((row) => {
    const line = columns.map((col) => toSafeString(row[col.key])).join(" | ");
    const lines = doc.splitTextToSize(line, 510);
    lines.forEach((wrappedLine) => {
      addPageIfNeeded();
      doc.text(wrappedLine, marginX, cursorY);
      cursorY += lineHeight;
    });
  });

  doc.save(filename);
};
