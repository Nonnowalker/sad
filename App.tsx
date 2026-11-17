
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Violation, AnalysisResult, AuditDirectory, AuditMedia, EvaluationData, StatementData, QuoteData } from './types';
import { analyzeAccessibilityReport } from './services/geminiService';
import Header from './components/Header';
import ViolationList from './components/ViolationList';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import FileUpload from './components/FileUpload';
import ReportSidebar from './components/ReportSidebar';
import Dashboard from './components/Dashboard';
import { EvaluationReportView, AccessibilityStatementView, CostBenefitView } from './components/AuditToolViews';
import MediaEvidenceView from './components/MediaEvidenceView';
import QuoteGeneratorView from './components/QuoteGeneratorView';

export type AuditView = 'analysis' | 'evaluation' | 'statement' | 'remediation' | 'media' | 'quote';

const App: React.FC = () => {
  // --- STATE ---
  const [directories, setDirectories] = useState<AuditDirectory[]>([]);
  const [activeDirectoryId, setActiveDirectoryId] = useState<string | null>(null);
  
  // Only used for initial load or critical errors, not for analysis
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 'aggregated' means showing the sum of all files, number represents the index in the results array
  const [activeReportIndex, setActiveReportIndex] = useState<number | 'aggregated'>('aggregated');
  
  // New state to manage the main content view (Analysis vs Tools)
  const [activeView, setActiveView] = useState<AuditView>('analysis');

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('wcag-audits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            // Migration: ensure reports have IDs if loaded from old structure and SAFEGUARD against undefined arrays
            const migrated = parsed.map((d: AuditDirectory) => ({
                ...d,
                reports: (d.reports || []).map(r => ({ ...r, id: r.id || crypto.randomUUID(), reportType: r.reportType || 'web' })),
                mediaFiles: d.mediaFiles || []
            }));
            setDirectories(migrated);
        }
      } catch (e) {
        console.error("Failed to load saved audits", e);
        setDirectories([]);
      }
    } else {
        setDirectories([]);
    }
  }, []);

  useEffect(() => {
    if (directories.length > 0) {
        try {
            // We strip 'originalFileContent' if needed to save space, but here we keep it for zip
            // Note: In a real app with background processing, be careful saving 'pending' states to LS
            localStorage.setItem('wcag-audits', JSON.stringify(directories));
        } catch (e) {
            console.warn("Storage quota exceeded. Some data might not persist.", e);
        }
    } else {
        localStorage.removeItem('wcag-audits');
    }
  }, [directories]);

  // Handle Toast Timeout
  useEffect(() => {
    if (toastMessage) {
        const timer = setTimeout(() => setToastMessage(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toastMessage]);


  // --- COMPUTED ---
  const activeDirectory = useMemo(() => 
    directories.find(d => d.id === activeDirectoryId), 
  [directories, activeDirectoryId]);

  // Compute aggregated violations (Web and Non-Web separate)
  const { aggregatedWebViolations, aggregatedNonWebViolations, hasNonWebReports } = useMemo(() => {
    // Structure: Map<Criterion, { totalCount: number, fileMap: Map<FileName, count> }>
    const webViolationsMap = new Map<string, { total: number; files: Map<string, number> }>();
    const nonWebViolationsMap = new Map<string, { total: number; files: Map<string, number> }>();
    let hasNonWeb = false;

    if (activeDirectory && activeDirectory.reports) {
        activeDirectory.reports.forEach(res => {
            if (res.status === 'success' && res.violations) {
                const targetMap = res.reportType === 'non-web' ? nonWebViolationsMap : webViolationsMap;
                
                if (res.reportType === 'non-web') hasNonWeb = true;

                res.violations.forEach(v => {
                    const existing = targetMap.get(v.criterion) || { total: 0, files: new Map() };
                    
                    // Update total
                    existing.total += v.count;
                    
                    // Update per-file count
                    const currentFileCount = existing.files.get(res.fileName) || 0;
                    existing.files.set(res.fileName, currentFileCount + v.count);

                    targetMap.set(v.criterion, existing);
                });
            }
        });
    }

    const sortFn = (a: Violation, b: Violation) => {
        const aNum = a.criterion.replace('WCAG ', '').split('.').map(Number);
        const bNum = b.criterion.replace('WCAG ', '').split('.').map(Number);
        for (let i = 0; i < Math.max(aNum.length, bNum.length); i++) {
            const valA = aNum[i] || 0;
            const valB = bNum[i] || 0;
            if (valA !== valB) return valA - valB;
        }
        return 0;
    };

    const convertToViolations = (map: Map<string, { total: number; files: Map<string, number> }>): Violation[] => {
        return Array.from(map.entries()).map(([c, data]) => ({
            criterion: c,
            count: data.total,
            affectedFiles: Array.from(data.files.entries()).map(([fName, fCount]) => ({
                fileName: fName,
                count: fCount
            }))
        })).sort(sortFn);
    };

    return {
        aggregatedWebViolations: convertToViolations(webViolationsMap),
        aggregatedNonWebViolations: convertToViolations(nonWebViolationsMap),
        hasNonWebReports: hasNonWeb
    };
  }, [activeDirectory]);


  // Determine what to display based on activeReportIndex
  const currentDisplayData = useMemo(() => {
      if (!activeDirectory) return null;
      
      const reports = activeDirectory.reports || [];

      if (activeReportIndex === 'aggregated') {
          // Merging for display in the simple list (combining web and non-web for the main list view if wanted, or keeping separate)
          // For the main "Analysis" view, we usually show a flat list. 
          // Let's combine them but handle the affectedFiles correctly.
          
          const combinedViolations = [...aggregatedWebViolations];

          aggregatedNonWebViolations.forEach(nv => {
              const existingIndex = combinedViolations.findIndex(v => v.criterion === nv.criterion);
              if (existingIndex !== -1) {
                  // Merge counts and files
                  const existing = combinedViolations[existingIndex];
                  existing.count += nv.count;
                  
                  // Merge file lists
                  const mergedFiles = [...(existing.affectedFiles || [])];
                  if (nv.affectedFiles) {
                      nv.affectedFiles.forEach(nf => {
                         const existingFileIndex = mergedFiles.findIndex(ef => ef.fileName === nf.fileName);
                         if (existingFileIndex !== -1) {
                             mergedFiles[existingFileIndex].count += nf.count;
                         } else {
                             mergedFiles.push(nf);
                         }
                      });
                  }
                  existing.affectedFiles = mergedFiles;
                  
              } else {
                  combinedViolations.push({...nv});
              }
          });
          
          return {
              violations: combinedViolations.sort((a,b) => a.criterion.localeCompare(b.criterion)),
              fileName: `Riepilogo: ${activeDirectory.name} (${reports.filter(r => r.status === 'success').length} file)`,
              isError: false,
              errorMessage: undefined,
              isPending: reports.some(r => r.status === 'pending') && combinedViolations.length === 0
          };
      } else {
          const res = reports[activeReportIndex];
          if (!res) return null;
          return {
              violations: res.violations || [],
              fileName: res.fileName,
              isError: res.status === 'error',
              errorMessage: res.error,
              isPending: res.status === 'pending'
          };
      }
  }, [activeReportIndex, activeDirectory, aggregatedWebViolations, aggregatedNonWebViolations]);

  // --- ACTIONS ---

  const handleGoToDashboard = useCallback(() => {
    setActiveDirectoryId(null);
  }, []);

  const handleSelectDirectory = useCallback((id: string) => {
    setActiveDirectoryId(id);
    setActiveReportIndex('aggregated'); // Reset to aggregated view when switching directories
    setActiveView('analysis'); // Reset to analysis view
  }, []);

  const createDirectory = useCallback(() => {
    const newDir: AuditDirectory = {
        id: crypto.randomUUID(),
        name: `Audit #${directories.length + 1}`,
        createdAt: Date.now(),
        reports: [],
        mediaFiles: []
    };
    setDirectories(prev => [...prev, newDir]);
    setActiveDirectoryId(newDir.id);
    setActiveReportIndex('aggregated');
    setActiveView('quote'); // Start with quote for new audit
  }, [directories]);

  const renameDirectory = useCallback((id: string, newName: string) => {
    setDirectories(prev => prev.map(dir => 
        dir.id === id ? { ...dir, name: newName } : dir
    ));
  }, []);

  const deleteDirectory = useCallback((id: string) => {
    const newDirs = directories.filter(d => d.id !== id);
    setDirectories(newDirs);
    if (activeDirectoryId === id) {
        setActiveDirectoryId(null); // Go to dashboard if active is deleted
    }
  }, [directories, activeDirectoryId]);

  const removeReportFromDirectory = useCallback((reportId: string) => {
    if (!activeDirectoryId) return;
    
    setDirectories(prev => prev.map(dir => {
        if (dir.id !== activeDirectoryId) return dir;
        const newReports = (dir.reports || []).filter(r => r.id !== reportId);
        return { ...dir, reports: newReports };
    }));

    // If currently viewing the deleted report or any single report, revert to aggregated to avoid index issues
    if (activeReportIndex !== 'aggregated') {
        setActiveReportIndex('aggregated');
    }
  }, [activeDirectoryId, activeReportIndex]);

  const handleSelectReport = useCallback((index: number | 'aggregated') => {
      setActiveReportIndex(index);
      setActiveView('analysis'); // Force view back to analysis when a file is selected
  }, []);

  // Helper to read file content for storage (ZIP export)
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const isText = file.type.startsWith('text/') || 
                 file.type === 'application/json' ||
                 file.name.match(/\.(html|htm|json|csv|xml|txt|md|svg)$/i);
        
        const reader = new FileReader();
        reader.onloadend = () => {
             if (isText) {
                 resolve(reader.result as string);
             } else {
                 const result = reader.result as string;
                 const base64 = result.split(',')[1];
                 resolve(base64);
             }
        };
        reader.onerror = reject;
        if (isText) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    });
  };

  const processFileInBackground = async (file: File, reportId: string, directoryId: string) => {
    let result: Partial<AnalysisResult> = {};
    let fileContent = '';

    try {
        fileContent = await readFileContent(file);
        const { violations, reportType } = await analyzeAccessibilityReport(file);
        
        result = {
            violations: violations,
            reportType: reportType,
            status: 'success',
            originalFileContent: fileContent,
            fileSize: file.size,
            mimeType: file.type,
            timestamp: Date.now()
        };
        
        setToastMessage(`Analisi completata: ${file.name}`);

    } catch (err) {
        console.error(`Error analyzing ${file.name}:`, err);
        result = {
            violations: [],
            status: 'error',
            error: err instanceof Error ? err.message : 'Errore sconosciuto',
            originalFileContent: fileContent,
            fileSize: file.size,
            mimeType: file.type,
            timestamp: Date.now()
        };
        setToastMessage(`Errore analisi: ${file.name}`);
    }

    // Update state with result
    setDirectories(prev => prev.map(dir => {
        if (dir.id !== directoryId) return dir;
        return {
            ...dir,
            reports: (dir.reports || []).map(r => r.id === reportId ? { ...r, ...result } as AnalysisResult : r)
        };
    }));
  };

  const handleAnalyze = useCallback((files: File[]) => {
    if (files.length === 0) return;
    
    let targetId = activeDirectoryId;
    let newDirCreated = false;

    // Create directory if none selected
    if (!targetId) {
        const newDirId = crypto.randomUUID();
        const newDir: AuditDirectory = { id: newDirId, name: 'Nuovo Audit', createdAt: Date.now(), reports: [], mediaFiles: [] };
        targetId = newDirId;
        newDirCreated = true;
    }

    setGlobalError(null);
    setActiveView('analysis'); 

    // Create Placeholders
    const newReports: AnalysisResult[] = files.map(file => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        violations: [],
        reportType: 'web', // default, will be updated by processFileInBackground
        status: 'pending',
        timestamp: Date.now(),
        fileSize: file.size,
        mimeType: file.type
    }));

    // Update Directory State (Add placeholders)
    setDirectories(prev => {
        let nextState = [...prev];
        if (newDirCreated && targetId) {
             const newDir: AuditDirectory = { 
                 id: targetId, 
                 name: 'Nuovo Audit', 
                 createdAt: Date.now(), 
                 reports: [], 
                 mediaFiles: [] 
            };
            nextState.push(newDir);
        }
        
        return nextState.map(dir => {
            if (dir.id === targetId) {
                return { ...dir, reports: [...(dir.reports || []), ...newReports] };
            }
            return dir;
        });
    });

    if (newDirCreated && targetId) {
        setActiveDirectoryId(targetId);
    }
    
    // Trigger Background Processing for each file
    if (targetId) {
        const finalTargetId = targetId; // capture for closure
        files.forEach((file, index) => {
             processFileInBackground(file, newReports[index].id, finalTargetId);
        });
    }

  }, [activeDirectoryId]); 

  // Handle Document Updates
  const updateDirectoryDoc = useCallback((type: 'evaluation' | 'statement' | 'remediation' | 'quote', data: any) => {
    if(!activeDirectoryId) return;
    setDirectories(prev => prev.map(dir => {
        if(dir.id !== activeDirectoryId) return dir;
        
        if (type === 'quote') {
             const quoteData = data as QuoteData;
             const updatedEval = { 
                 ...(dir.evaluationData || {}), 
                 siteUrl: quoteData.baseUrl || dir.evaluationData?.siteUrl || '',
                 pagesVerified: (quoteData.pages || []).map(p => p.url),
                 siteName: quoteData.projectName || dir.evaluationData?.siteName || ''
             } as EvaluationData;
             return { ...dir, quoteData: data as QuoteData, evaluationData: updatedEval };
        } else if (type === 'evaluation') {
             return { ...dir, evaluationData: data as EvaluationData };
        } else if (type === 'statement') {
             return { ...dir, statementData: data as StatementData };
        } else {
             return { ...dir, remediationText: data as string };
        }
    }));
  }, [activeDirectoryId]);

  // --- MEDIA HANDLERS ---
  const handleAddMedia = useCallback((newMedia: AuditMedia) => {
      if (!activeDirectoryId) return;
      setDirectories(prev => prev.map(dir => {
          if (dir.id !== activeDirectoryId) return dir;
          return {
              ...dir,
              mediaFiles: [...(dir.mediaFiles || []), newMedia]
          };
      }));
  }, [activeDirectoryId]);

  const handleUpdateMedia = useCallback((mediaId: string, updates: Partial<AuditMedia>) => {
      if (!activeDirectoryId) return;
      setDirectories(prev => prev.map(dir => {
          if (dir.id !== activeDirectoryId) return dir;
          return {
              ...dir,
              mediaFiles: (dir.mediaFiles || []).map(m => m.id === mediaId ? { ...m, ...updates } : m)
          };
      }));
  }, [activeDirectoryId]);

  const handleDeleteMedia = useCallback((mediaId: string) => {
      if (!activeDirectoryId) return;
      setDirectories(prev => prev.map(dir => {
          if (dir.id !== activeDirectoryId) return dir;
          return {
              ...dir,
              mediaFiles: (dir.mediaFiles || []).filter(m => m.id !== mediaId)
          };
      }));
  }, [activeDirectoryId]);


  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto">
        <Header />
        
        <main className="mt-8 bg-slate-800/50 rounded-2xl shadow-2xl shadow-indigo-900/20 ring-1 ring-white/10 backdrop-blur-md min-h-[600px] flex flex-col lg:flex-row p-6 sm:p-8 gap-8 relative">
            
            {/* TOAST NOTIFICATION */}
            {toastMessage && (
                <div className="absolute bottom-8 right-8 z-50 bg-indigo-600 text-white px-6 py-4 rounded-lg shadow-xl animate-bounce-in flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{toastMessage}</span>
                </div>
            )}

            {/* LEFT SIDEBAR */}
            <ReportSidebar 
                directories={directories}
                activeDirectoryId={activeDirectoryId}
                onSelectDirectory={handleSelectDirectory}
                onCreateDirectory={createDirectory}
                onRenameDirectory={renameDirectory}
                onDeleteDirectory={deleteDirectory}
                onGoHome={handleGoToDashboard}
                
                activeReportIndex={activeReportIndex}
                onSelectReport={handleSelectReport}
                onRemoveReport={removeReportFromDirectory}
                onAddFiles={handleAnalyze}

                activeView={activeView}
                onSelectView={setActiveView}
            />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 w-full relative">
                
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
                        <Loader />
                    </div>
                )}

                {globalError && <ErrorMessage message={globalError} />}

                {!activeDirectory && !isLoading && (
                    <Dashboard 
                        directories={directories} 
                        onCreate={createDirectory}
                        onSelect={handleSelectDirectory}
                        onDelete={deleteDirectory}
                    />
                )}

                {activeDirectory && !isLoading && (
                    <>
                        {activeView === 'analysis' && (
                            <div className="animate-fade-in h-full">
                                {(!activeDirectory.reports || activeDirectory.reports.length === 0) ? (
                                    <div className="h-full flex flex-col items-center justify-center">
                                        <div className="mb-6 text-center">
                                            <h2 className="text-xl font-bold text-white mb-1">{activeDirectory.name}</h2>
                                            <p className="text-slate-400 text-sm">Questa directory è vuota.</p>
                                        </div>
                                        <FileUpload 
                                            onFilesSelect={handleAnalyze} 
                                            selectedFiles={[]} 
                                            onError={setGlobalError} 
                                        />
                                    </div>
                                ) : (
                                    currentDisplayData && (
                                        currentDisplayData.isPending ? (
                                            <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                                <h3 className="text-xl font-bold text-white mb-2">Analisi in corso...</h3>
                                                <p className="text-slate-400 text-center max-w-md">
                                                    Stiamo analizzando i file selezionati in background. 
                                                    Puoi continuare a lavorare sugli altri strumenti (Report, Dichiarazione) mentre attendi i risultati.
                                                </p>
                                            </div>
                                        ) : currentDisplayData.isError ? (
                                            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-800 rounded-xl border border-red-900/30">
                                                <ErrorMessage message={`Errore analisi file: ${currentDisplayData.errorMessage}`} />
                                            </div>
                                        ) : (
                                            <ViolationList
                                                violations={currentDisplayData.violations}
                                                fileName={currentDisplayData.fileName}
                                            />
                                        )
                                    )
                                )}
                            </div>
                        )}

                        {activeView === 'quote' && (
                             <QuoteGeneratorView
                                dirName={activeDirectory.name}
                                initialData={activeDirectory.quoteData}
                                onSave={(data) => updateDirectoryDoc('quote', data)}
                             />
                        )}

                        {activeView === 'evaluation' && (
                             <EvaluationReportView 
                                dirName={activeDirectory.name} 
                                initialData={activeDirectory.evaluationData}
                                webViolations={aggregatedWebViolations}
                                nonWebViolations={aggregatedNonWebViolations}
                                hasNonWeb={hasNonWebReports}
                                onSave={(data) => updateDirectoryDoc('evaluation', data)}
                             />
                        )}

                        {activeView === 'statement' && (
                             <AccessibilityStatementView 
                                dirName={activeDirectory.name} 
                                initialData={activeDirectory.statementData}
                                evaluationData={activeDirectory.evaluationData}
                                webViolations={aggregatedWebViolations}
                                nonWebViolations={aggregatedNonWebViolations}
                                onSave={(data) => updateDirectoryDoc('statement', data)}
                             />
                        )}

                        {activeView === 'remediation' && (
                             <CostBenefitView 
                                dirName={activeDirectory.name} 
                                initialText={activeDirectory.remediationText}
                                onSave={(text) => updateDirectoryDoc('remediation', text)}
                             />
                        )}

                        {activeView === 'media' && (
                             <MediaEvidenceView
                                mediaList={activeDirectory.mediaFiles || []}
                                onAddMedia={handleAddMedia}
                                onUpdateMedia={handleUpdateMedia}
                                onDeleteMedia={handleDeleteMedia}
                             />
                        )}
                    </>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;
