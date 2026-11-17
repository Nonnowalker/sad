
import React from 'react';
import { ComplianceStatus } from '../types';

interface SummaryStatsProps {
  fileName?: string;
  violatedCount: number;
  respectedCount: number;
  totalCriteria: number;
  complianceStatus: ComplianceStatus;
}

const getStatusColorClasses = (status: ComplianceStatus): string => {
  switch (status) {
    case 'Conforme':
      return 'bg-green-500/80 text-green-100 border-green-600/50';
    case 'Parzialmente Conforme':
      return 'bg-yellow-500/80 text-yellow-100 border-yellow-600/50';
    case 'Non Conforme':
      return 'bg-red-500/80 text-red-100 border-red-600/50';
    default:
      return 'bg-slate-700 text-slate-300';
  }
};

const StatCard: React.FC<{ title: string; value: string | number; description?: string }> = ({ title, value, description }) => (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
);


const SummaryStats: React.FC<SummaryStatsProps> = ({
  fileName,
  violatedCount,
  respectedCount,
  totalCriteria,
  complianceStatus,
}) => {
  const statusColor = getStatusColorClasses(complianceStatus);

  return (
    <div className="space-y-4">
      {fileName && (
         <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-slate-400">File Analizzato</p>
          <p className="text-lg font-mono text-sky-400 truncate">{fileName}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Criteri Violati" value={violatedCount} description={`su ${totalCriteria} totali`} />
        <StatCard title="Criteri Rispettati" value={respectedCount} description="(stimati)" />
        <div className={`col-span-2 p-4 rounded-lg border ${statusColor}`}>
          <p className="text-sm opacity-80">Stato Conformità</p>
          <p className="text-2xl font-bold">{complianceStatus}</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryStats;
