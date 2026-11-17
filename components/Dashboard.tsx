
import React from 'react';
import { AuditDirectory } from '../types';

interface DashboardProps {
  directories: AuditDirectory[];
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ directories, onCreate, onSelect, onDelete }) => {
  
  // Helper to calculate stats
  const getAuditStats = (dir: AuditDirectory) => {
    let totalFiles = dir.reports.length;
    let totalViolations = 0;
    
    dir.reports.forEach(r => {
        if (r.status === 'success') {
            r.violations.forEach(v => totalViolations += v.count);
        }
    });

    return { totalFiles, totalViolations };
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in">
       <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Benvenuto</h2>
            <p className="text-slate-400">Seleziona un audit esistente o creane uno nuovo per iniziare.</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-10 custom-scrollbar">
          {/* Create New Card */}
          <div 
            onClick={onCreate} 
            className="cursor-pointer bg-slate-800/30 border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800/60 rounded-xl flex flex-col items-center justify-center min-h-[200px] transition-all group p-6"
          >
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500 group-hover:text-indigo-400 group-hover:scale-110 transition-all shadow-lg">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                 </svg>
              </div>
              <span className="text-lg font-bold text-slate-300 group-hover:text-white">Nuovo Audit</span>
              <span className="text-sm text-slate-500 mt-1">Crea un nuovo progetto</span>
          </div>

          {/* Audit Cards */}
          {directories.map(dir => {
              const stats = getAuditStats(dir);
              const lastUpdated = new Date(dir.createdAt).toLocaleDateString();

              return (
                <div 
                    key={dir.id}
                    onClick={() => onSelect(dir.id)}
                    className="relative bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-900/10 cursor-pointer transition-all flex flex-col justify-between group h-[200px]"
                >
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if(confirm('Sei sicuro di voler eliminare questo audit e tutti i suoi file?')) onDelete(dir.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Elimina Audit"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white truncate w-3/4" title={dir.name}>{dir.name}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Creato il: {lastUpdated}</p>
                    </div>

                    <div className="flex items-end justify-between border-t border-slate-700/50 pt-4">
                        <div className="text-center">
                            <span className="block text-xl font-bold text-white">{stats.totalFiles}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">File</span>
                        </div>
                        <div className="text-center">
                             <span className={`block text-xl font-bold ${stats.totalViolations > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                 {stats.totalViolations}
                             </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Violazioni</span>
                        </div>
                        <div className="text-center">
                            {stats.totalViolations > 0 ? (
                                <span className="inline-block px-2 py-1 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">KO</span>
                            ) : (
                                <span className="inline-block px-2 py-1 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">OK</span>
                            )}
                             <span className="block text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Stato</span>
                        </div>
                    </div>
                </div>
              );
          })}
       </div>
    </div>
  );
};

export default Dashboard;
