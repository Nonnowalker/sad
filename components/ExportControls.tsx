
import React from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Violation, ComplianceStatus } from '../types';

interface ExportControlsProps {
  violations: Violation[];
  fileName?: string;
  complianceStatus: ComplianceStatus;
  totalViolations: number;
}

const ExportControls: React.FC<ExportControlsProps> = ({ 
  violations, 
  fileName, 
  complianceStatus,
  totalViolations
}) => {
  const safeName = (fileName || 'Report_Accessibilita').replace(/[^a-z0-9]/gi, '_');

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(violations, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${safeName}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const title = fileName || "Report Violazioni WCAG";
    const dateStr = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Report Analisi Accessibilità WCAG 2.2", 14, 20);
    
    // Metadata
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Progetto: ${title}`, 14, 30);
    doc.text(`Data: ${dateStr}`, 14, 36);
    doc.text(`Stato: ${complianceStatus}`, 14, 42);
    doc.text(`Totale Violazioni: ${totalViolations}`, 14, 48);

    // Table
    const tableRows = violations.map(v => {
        let criterionText = v.criterion;
        if (v.affectedFiles && v.affectedFiles.length > 0) {
            // Remove extension from filename for cleaner PDF report
            const filesList = v.affectedFiles.map(f => `• ${f.fileName.replace(/\.[^/.]+$/, "")} (${f.count})`).join('\n');
            criterionText += `\n\nPagine coinvolte:\n${filesList}`;
        }
        return [criterionText, v.count];
    });

    autoTable(doc, {
      startY: 55,
      head: [['Criterio WCAG', 'Conteggio Violazioni']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181] }, // Indigo color
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text('Generato con WCAG AI Analyzer', 14, doc.internal.pageSize.height - 10);
        doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    doc.save(`${safeName}_report.pdf`);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportJSON}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-emerald-600/80 text-slate-200 rounded-lg transition-colors text-sm font-medium border border-slate-600 hover:border-emerald-500"
        title="Esporta in JSON"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        JSON
      </button>
      <button
        onClick={handleExportPDF}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-rose-600/80 text-slate-200 rounded-lg transition-colors text-sm font-medium border border-slate-600 hover:border-rose-500"
        title="Esporta in PDF"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF
      </button>
    </div>
  );
};

export default ExportControls;
