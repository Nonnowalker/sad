
import React from 'react';
import { Violation, ComplianceStatus } from '../types';
import ViolationListItem from './ViolationListItem';
import SummaryStats from './SummaryStats';
import ExportControls from './ExportControls';

interface ViolationListProps {
  violations: Violation[];
  fileName?: string;
}

const ViolationList: React.FC<ViolationListProps> = ({ violations, fileName }) => {
  // Constants and Calculations
  const TOTAL_CRITERIA = 55; // Updated for WCAG 2.2 A/AA
  const violatedCount = violations.length;
  const respectedCount = Math.max(0, TOTAL_CRITERIA - violatedCount);
  const compliancePercentage = (respectedCount / TOTAL_CRITERIA) * 100;

  let complianceStatus: ComplianceStatus;
  if (compliancePercentage === 100) {
    complianceStatus = 'Conforme';
  } else if (compliancePercentage > 50) {
    complianceStatus = 'Parzialmente Conforme';
  } else {
    complianceStatus = 'Non Conforme';
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-100">Risultati Analisi</h2>
        <div className="flex items-center gap-3">
             <ExportControls 
                violations={violations} 
                fileName={fileName}
                complianceStatus={complianceStatus}
                totalViolations={violatedCount}
             />
        </div>
      </div>

      <SummaryStats
        fileName={fileName}
        violatedCount={violatedCount}
        respectedCount={respectedCount}
        totalCriteria={TOTAL_CRITERIA}
        complianceStatus={complianceStatus}
      />

      <h3 className="text-xl font-bold text-slate-100 mt-10 mb-4">
        Dettaglio Criteri Violati
      </h3>
      {violations.length > 0 ? (
        <ol className="space-y-3 list-decimal list-inside text-slate-300">
            {violations.map((violation, index) => (
            <ViolationListItem key={violation.criterion} violation={violation} index={index} />
            ))}
        </ol>
      ) : (
          <div className="p-8 text-center bg-slate-800/30 rounded-lg border border-slate-700/50">
              <p className="text-green-400 font-medium text-lg">Nessuna violazione trovata!</p>
              <p className="text-slate-500 mt-2">Il report non contiene menzioni di errori di accessibilità noti.</p>
          </div>
      )}
    </div>
  );
};

export default ViolationList;