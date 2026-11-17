
import React, { useRef, useState } from 'react';
import { AnalysisResult, AuditDirectory, Violation } from '../types';
import { AuditView } from '../App';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { generateEvaluationPdfBlob, generateStatementPdfBlob } from './AuditToolViews'; 

interface ReportSidebarProps {
  directories: AuditDirectory[];
  activeDirectoryId: string | null;
  onSelectDirectory: (id: string) => void;
  onCreateDirectory: () => void;
  onRenameDirectory: (id: string, newName: string) => void;
  onDeleteDirectory: (id: string) => void;
  onGoHome: () => void;
  
  activeReportIndex: number | 'aggregated';
  onSelectReport: (index: number | 'aggregated') => void;
  
  onRemoveReport: (reportId: string) => void;
  onAddFiles: (files: File[]) => void;

  activeView: AuditView;
  onSelectView: (view: AuditView) => void;
}

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 1) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper to format date
const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString(undefined, {
        day: '2-digit', month: '2-digit', year: '2-digit'
    });
};
const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit', minute: '2-digit'
    });
};

// Helper for file icons
const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    // PDF
    if (ext === 'pdf') return (
        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    );
    // Code/Data (JSON, XML, CSV)
    if (['json', 'xml', 'csv', 'js'].includes(ext || '')) return (
        <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
    );
    // HTML/Web
    if (['html', 'htm'].includes(ext || '')) return (
        <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
    );
    // Images
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) return (
        <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    );
    // Default Document
    return (
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    );
}

// Helper to generate a PDF blob from simple text (Legacy for remediation)
const generateSimplePdfBlob = (title: string, content: string): Blob => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFontSize(16);
    doc.text(title, margin, 20);
    
    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(content || 'Nessun contenuto.', maxLineWidth);
    doc.text(splitText, margin, 35);
    
    return doc.output('blob');
};


const ReportSidebar: React.FC<ReportSidebarProps> = ({
  directories,
  activeDirectoryId,
  onSelectDirectory,
  onCreateDirectory,
  onRenameDirectory,
  onDeleteDirectory,
  onGoHome,
  activeReportIndex,
  onSelectReport,
  onRemoveReport,
  onAddFiles,
  activeView,
  onSelectView
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingDirId, setEditingDirId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [zippingId, setZippingId] = useState<string | null>(null); 

  const activeDirectory = directories.find(d => d.id === activeDirectoryId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEditing = (dir: AuditDirectory, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingDirId(dir.id);
      setEditName(dir.name);
  };

  const saveEditing = (id: string) => {
      if (editName.trim()) {
          onRenameDirectory(id, editName.trim());
      }
      setEditingDirId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter') saveEditing(id);
      if (e.key === 'Escape') setEditingDirId(null);
  };

  const handleZipDownload = async (dir: AuditDirectory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (zippingId) return; 
    setZippingId(dir.id);

    try {
        const zip = new JSZip();
        const safeDirName = dir.name.replace(/[^a-z0-9]/gi, '_');
        const folder = zip.folder(safeDirName);

        if (!folder) return;

        // 1. Add Original Files
        (dir.reports || []).forEach(report => {
            if (report.originalFileContent) {
                const isBinary = !report.mimeType?.startsWith('text/') && 
                                 !['application/json', 'application/xml'].includes(report.mimeType || '');
                
                if (!isBinary) {
                     folder.file(report.fileName, report.originalFileContent);
                } else {
                     folder.file(report.fileName, report.originalFileContent, { base64: true });
                }
            }
        });

        // Helper Aggregation for PDF report
        const aggregate = (type: 'web' | 'non-web'): Violation[] => {
            const map = new Map<string, { total: number; files: Map<string, number> }>();
            (dir.reports || []).filter(r => r.status === 'success' && r.reportType === type).forEach(r => {
                r.violations.forEach(v => {
                    const existing = map.get(v.criterion) || { total: 0, files: new Map() };
                    existing.total += v.count;
                    existing.files.set(r.fileName, (existing.files.get(r.fileName) || 0) + v.count);
                    map.set(v.criterion, existing);
                });
            });
            return Array.from(map.entries()).map(([c, d]) => ({
                criterion: c,
                count: d.total,
                affectedFiles: Array.from(d.files.entries()).map(([fn, fc]) => ({ fileName: fn, count: fc }))
            }));
        };

        // 2. Add Generated Documents (PDFs)
        if (dir.evaluationData) {
            folder.file("Report_Valutazione.pdf", generateEvaluationPdfBlob(dir.evaluationData, aggregate('web'), aggregate('non-web')));
        }
        
        // Use Statement Data generator if available, else fallback to text
        if (dir.statementData) {
            folder.file("Dichiarazione_Accessibilita.pdf", generateStatementPdfBlob(dir.statementData));
        } else if (dir.statementText) {
             folder.file("Dichiarazione_Accessibilita.pdf", generateSimplePdfBlob("Dichiarazione di Accessibilità", dir.statementText));
        }

        if (dir.remediationText) {
            folder.file("Stima_Costi_Benefici.pdf", generateSimplePdfBlob("Stima Costi e Benefici", dir.remediationText));
        }

        // 3. Add Media Evidence
        if (dir.mediaFiles && dir.mediaFiles.length > 0) {
             const mediaFolder = folder.folder("Media_Evidence");
             let descriptions = `ELENCO MEDIA EVIDENZE - ${dir.name}\n\n`;
             
             dir.mediaFiles.forEach((media, idx) => {
                  if (mediaFolder) {
                      mediaFolder.file(media.fileName, media.base64Data, { base64: true });
                      
                      descriptions += `FILE ${idx + 1}: ${media.fileName}\n`;
                      descriptions += `TIPO: ${media.type}\n`;
                      descriptions += `DIDASCALIA: ${media.caption || '-'}\n`;
                      descriptions += `DESCRIZIONE: ${media.description || '-'}\n`;
                      descriptions += `----------------------------------------\n\n`;
                  }
             });
             
             if(mediaFolder) {
                 mediaFolder.file("_Descriptions.txt", descriptions);
             }
        }

        // 4. Generate and Download
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeDirName}_Full_Audit.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Error creating zip", e);
        alert("Errore durante la creazione del file ZIP.");
    } finally {
        setZippingId(null);
    }
  };


  return (
    <aside className="w-full lg:w-80 flex-shrink-0 lg:mr-8 mb-8 lg:mb-0 flex flex-col gap-6">
      
      {/* DIRECTORY MANAGEMENT SECTION */}
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        
        {/* Dashboard/Home Button */}
        <button 
             onClick={onGoHome}
             className="w-full flex items-center justify-center gap-2 mb-4 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-sm font-medium border border-slate-600/50"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
             </svg>
             Dashboard Audit
        </button>

        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">I Miei Audit</h3>
          <button 
            onClick={onCreateDirectory}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
            title="Nuova Directory"
          >
            + Nuovo
          </button>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {directories.map((dir) => {
            return (
                <div 
                key={dir.id}
                className={`group rounded-lg px-3 py-2 transition-all cursor-pointer border ${
                    activeDirectoryId === dir.id ? 'bg-slate-700 border-slate-600' : 'bg-transparent border-transparent hover:bg-slate-700/50'
                }`}
                onClick={() => onSelectDirectory(dir.id)}
                >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 flex-shrink-0 ${activeDirectoryId === dir.id ? 'text-sky-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        
                        {editingDirId === dir.id ? (
                            <input 
                                autoFocus
                                type="text"
                                className="bg-slate-900 text-white text-sm px-1 py-0.5 rounded border border-indigo-500 w-full outline-none"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => saveEditing(dir.id)}
                                onKeyDown={(e) => handleKeyDown(e, dir.id)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className={`text-sm truncate font-medium ${activeDirectoryId === dir.id ? 'text-white' : 'text-slate-400'}`}>
                                {dir.name}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => handleZipDownload(dir, e)}
                            className="text-slate-500 hover:text-emerald-400 p-1"
                            title="Scarica Audit (.zip)"
                            disabled={zippingId !== null}
                        >
                            {zippingId === dir.id ? (
                                <span className="block h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={(e) => startEditing(dir, e)}
                            className="text-slate-500 hover:text-sky-400 p-1"
                            title="Rinomina"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                             </svg>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Sei sicuro di voler eliminare questa directory?')) onDeleteDirectory(dir.id);
                            }}
                            className="text-slate-500 hover:text-red-400 p-1"
                            title="Elimina"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-1 pl-7">
                     <span className="text-[10px] text-slate-500">{formatDate(dir.createdAt)}</span>
                     <span className="text-[10px] text-slate-600 bg-slate-900/50 px-1.5 py-0.5 rounded">{(dir.reports || []).length} file</span>
                </div>
                </div>
            )})}
          {directories.length === 0 && (
             <p className="text-xs text-slate-500 italic px-2">Nessuna directory salvata</p>
          )}
        </div>
      </div>

      {activeDirectory && (
        <nav className="flex flex-col flex-grow bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3 px-1 border-b border-slate-700 pb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Contenuto
                </h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
                        title="Aggiungi file a questa directory"
                    >
                        + Aggiungi
                    </button>
                </div>
            </div>
               
               <button
                  onClick={() => onSelectReport('aggregated')}
                  className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-between ${
                      activeView === 'analysis' && activeReportIndex === 'aggregated'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
              >
                  <div className="flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h2a2 2 0 012-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div className="flex flex-col">
                        <span>Riepilogo Totale</span>
                        <span className="text-[10px] opacity-70 font-normal">{(activeDirectory.reports || []).length} file analizzati</span>
                      </div>
                  </div>
              </button>
  
          <div className="space-y-1 overflow-y-auto custom-scrollbar max-h-[250px] mt-2">
              {(activeDirectory.reports || []).map((report, index) => (
              <div
                  key={report.id}
                  className={`w-full flex items-center justify-between group rounded-lg pr-2 py-1 transition-colors duration-200 ${
                     activeView === 'analysis' && activeReportIndex === index
                      ? 'bg-slate-700 border border-slate-600'
                      : 'hover:bg-slate-800 border border-transparent'
                  }`}
              >
                <button
                  onClick={() => onSelectReport(index)}
                  className={`flex-grow text-left px-3 py-2 text-sm font-medium flex items-center gap-3 overflow-hidden ${
                    activeView === 'analysis' && activeReportIndex === index ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                     {getFileIcon(report.fileName)}
                  </div>
                  
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate">{report.fileName}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[10px] opacity-60">{formatBytes(report.fileSize || 0)}</span>
                         <span className="text-[10px] opacity-60">{formatTime(report.timestamp)}</span>
                    </div>
                  </div>
                </button>
                
                <div className="flex items-center gap-2">
                     {report.status === 'success' ? (
                       <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeView === 'analysis' && activeReportIndex === index ? 'bg-indigo-500/20 text-indigo-100' : 'bg-slate-700 text-slate-500'}`}>
                          {report.violations.length}
                       </span>
                    ) : report.status === 'pending' ? (
                       <span className="block h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="text-red-400" title="Errore analisi">!</span>
                    )}

                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if(confirm(`Rimuovere ${report.fileName} da questa directory?`)) onRemoveReport(report.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-opacity"
                    title="Rimuovi file"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
              </div>
              ))}
              {(activeDirectory.reports || []).length === 0 && (
                   <div className="text-center py-4 opacity-50 text-xs text-slate-400">
                       Nessun file nel report
                   </div>
              )}
          </div>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-auto">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                Strumenti & Output
            </h3>
            <div className="space-y-1">
                 <button
                    onClick={() => onSelectView('quote')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${
                        activeView === 'quote' ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Preventivo / Offerta
                </button>
                <button
                    onClick={() => onSelectView('evaluation')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${
                        activeView === 'evaluation' ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Report Valutazione
                </button>
                <button
                    onClick={() => onSelectView('statement')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${
                        activeView === 'statement' ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Dichiarazione Accessibilità
                </button>
                <button
                    onClick={() => onSelectView('remediation')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${
                        activeView === 'remediation' ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Stima Costi/Benefici
                </button>
                <button
                    onClick={() => onSelectView('media')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${
                        activeView === 'media' ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Media & Evidenze
                </button>
            </div>
          </div>

          <input 
             type="file" 
             multiple 
             className="hidden" 
             ref={fileInputRef} 
             onChange={handleFileChange}
             accept=".html,.htm,.json,.csv,.pdf,.doc,.docx,.txt"
          />
        </nav>
      )}
    </aside>
  );
};

export default ReportSidebar;
