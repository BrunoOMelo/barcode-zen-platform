import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        return typeof val === "string" ? `"${val}"` : String(val ?? "");
      }).join(";")
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, unknown>[],
  filename: string,
  title: string
) {
  if (!data.length) return;
  const doc = new jsPDF();
  const headers = Object.keys(data[0]);

  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: data.map((row) => headers.map((h) => String(row[h] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 98, 168] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
