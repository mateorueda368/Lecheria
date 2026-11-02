/**
 * Utilidades para exportación de datos a Excel (CSV) y generación de reportes en PDF imprimibles
 * Diseñado con formato y estándares para Colombia / Latinoamérica.
 */

/**
 * Exporta datos tabulares a un archivo CSV compatible nativamente con Microsoft Excel.
 * Incluye BOM UTF-8 para caracteres especiales y separador de punto y coma (;).
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const sanitizeCell = (cell: string | number): string => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell);
    // Si contiene punto y coma, comillas o saltos de línea, envolver en comillas dobles
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(sanitizeCell).join(';');
  const dataRows = rows.map(row => row.map(sanitizeCell).join(';'));
  
  // \uFEFF es el BOM (Byte Order Mark) UTF-8 que hace que Excel reconozca tildes y caracteres en español
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface PrintReportOptions {
  title: string;
  subtitle?: string;
  periodo?: string;
  metrics?: { label: string; value: string; color?: string }[];
  tableHeaders: string[];
  tableRows: (string | number)[][];
  tableAligns?: ('left' | 'center' | 'right')[];
  footerNotes?: string[];
  showSignature?: boolean;
  signatureTitle?: string;
}

/**
 * Abre una ventana con diseño estilizado para impresión y generación nativa de PDF.
 */
export function printReport(options: PrintReportOptions) {
  const {
    title,
    subtitle = 'Sistema de Gestión de Lechería',
    periodo,
    metrics = [],
    tableHeaders,
    tableRows,
    tableAligns = [],
    footerNotes = [],
    showSignature = true,
    signatureTitle = 'Firma del Administrador / Responsable',
  } = options;

  const fechaGeneracion = new Date().toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes en tu navegador para ver y descargar el reporte en PDF.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title} - Reporte Lechería</title>
      <style>
        @page {
          size: letter portrait;
          margin: 1.2cm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 20px;
          background: #ffffff;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f766e;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .header-brand h1 {
          margin: 0;
          font-size: 20px;
          color: #0f766e;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .header-brand p {
          margin: 2px 0 0 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }
        .header-meta {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        .header-meta strong {
          color: #334155;
          font-size: 11px;
        }
        .report-title-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #0f766e;
          padding: 10px 14px;
          border-radius: 6px;
          margin-bottom: 16px;
        }
        .report-title-box h2 {
          margin: 0 0 4px 0;
          font-size: 15px;
          color: #0f172a;
          font-weight: 700;
        }
        .report-title-box p {
          margin: 0;
          font-size: 11px;
          color: #475569;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }
        .metric-card {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          border-radius: 6px;
        }
        .metric-card span {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 2px;
        }
        .metric-card strong {
          display: block;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        th {
          background: #0f766e;
          color: #ffffff;
          font-weight: 700;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid #0f766e;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        td {
          padding: 7px 10px;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        tr:nth-child(even) td {
          background: #f8fafc;
        }
        tr.total-row td {
          background: #e2e8f0;
          font-weight: 800;
          color: #0f172a;
          border-top: 2px solid #0f766e;
        }
        .footer-notes {
          margin-top: 14px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 4px;
          font-size: 10px;
          color: #64748b;
        }
        .footer-notes p {
          margin: 2px 0;
        }
        .signature-area {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .signature-box {
          width: 240px;
          border-top: 1px solid #475569;
          text-align: center;
          padding-top: 6px;
          font-size: 10px;
          color: #475569;
          font-weight: 600;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-brand">
          <h1>🥛 Sistema de Gestión Lechería</h1>
          <p>${subtitle}</p>
        </div>
        <div class="header-meta">
          <div><strong>Fecha Emisión:</strong> ${fechaGeneracion}</div>
          ${periodo ? `<div><strong>Período:</strong> ${periodo}</div>` : ''}
        </div>
      </div>

      <div class="report-title-box">
        <h2>${title}</h2>
        ${periodo ? `<p>Rango de consulta: <strong>${periodo}</strong></p>` : ''}
      </div>

      ${metrics.length > 0 ? `
        <div class="metrics-grid">
          ${metrics.map(m => `
            <div class="metric-card">
              <span>${m.label}</span>
              <strong style="${m.color ? `color: ${m.color}` : ''}">${m.value}</strong>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            ${tableHeaders.map((h, i) => `
              <th style="text-align: ${tableAligns[i] || 'left'}">${h}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows.map((row) => `
            <tr>
              ${row.map((cell, i) => `
                <td style="text-align: ${tableAligns[i] || 'left'}">${cell}</td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${footerNotes.length > 0 ? `
        <div class="footer-notes">
          ${footerNotes.map(note => `<p>• ${note}</p>`).join('')}
        </div>
      ` : ''}

      ${showSignature ? `
        <div class="signature-area">
          <div class="signature-box">
            ${signatureTitle}
          </div>
          <div class="signature-box">
            Revisado / Aprobado
          </div>
        </div>
      ` : ''}

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
