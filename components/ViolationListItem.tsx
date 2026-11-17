
import React, { useState } from 'react';
import { Violation } from '../types';

interface ViolationListItemProps {
  violation: Violation;
  index: number;
}

const getBadgeColor = (count: number): string => {
  if (count > 50) return 'bg-red-500/80 text-red-100';
  if (count > 20) return 'bg-orange-500/80 text-orange-100';
  if (count > 10) return 'bg-amber-500/80 text-amber-100';
  if (count > 4) return 'bg-sky-500/80 text-sky-100';
  return 'bg-sky-500/80 text-sky-100';
};

const wcagUrlMap: { [key: string]: string } = {
  '1.1.1': 'non-text-content',
  '1.3.1': 'info-and-relationships',
  '1.3.2': 'meaningful-sequence',
  '1.3.5': 'identify-input-purpose',
  '1.4.3': 'contrast-minimum',
  '1.4.4': 'resize-text',
  '2.1.1': 'keyboard',
  '2.1.2': 'no-keyboard-trap',
  '2.2.2': 'pausing-hiding-stopping',
  '2.4.1': 'bypass-blocks',
  '2.4.4': 'link-purpose-in-context',
  '2.4.5': 'multiple-ways',
  '2.4.6': 'headings-and-labels',
  '2.4.7': 'focus-visible',
  '2.5.3': 'label-in-name',
  '3.1.2': 'language-of-parts',
  '3.2.2': 'on-input',
  '3.2.3': 'consistent-navigation',
  '3.3.2': 'labels-or-instructions',
  '4.1.2': 'name-role-value',
};

const getWcagUrl = (criterion: string): string | null => {
    const criterionNumber = criterion.replace('WCAG ', '').trim();
    const slug = wcagUrlMap[criterionNumber];
    if (slug) {
        return `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html`;
    }
    return null;
}


const ViolationListItem: React.FC<ViolationListItemProps> = ({ violation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const badgeColor = getBadgeColor(violation.count);
  const wcagDocUrl = getWcagUrl(violation.criterion);
  const hasDetails = violation.affectedFiles && violation.affectedFiles.length > 0;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700/50 transition-all duration-300 hover:border-sky-500/50">
        <div 
            className={`p-4 flex justify-between items-center cursor-pointer ${hasDetails ? 'hover:bg-slate-700/80' : ''}`}
            onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        >
            <div className="flex items-center gap-3">
                 {/* Expand Icon */}
                 {hasDetails && (
                    <div className={`transition-transform duration-200 text-slate-500 ${isExpanded ? 'rotate-90' : ''}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                 )}

                {wcagDocUrl ? (
                    <a 
                    href={wcagDocUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()} // Prevent collapse toggling when clicking link
                    className="font-mono text-lg text-slate-200 hover:text-sky-400 underline decoration-dotted decoration-slate-500 hover:decoration-sky-400 underline-offset-4 group inline-flex items-center gap-2"
                    >
                    {violation.criterion}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 group-hover:text-sky-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    </a>
                ) : (
                    <span className="font-mono text-lg text-slate-200">{violation.criterion}</span>
                )}
            </div>
            
            <div className="flex items-center space-x-3">
                <span className="text-sm text-slate-400 hidden sm:inline">Violazioni:</span>
                <span className={`px-3 py-1 text-sm font-bold rounded-full ${badgeColor}`}>
                {violation.count}
                </span>
            </div>
        </div>

        {/* Collapsible Details */}
        {hasDetails && isExpanded && (
            <div className="border-t border-slate-700/50 bg-slate-900/30 p-4 animate-fade-in">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Pagine con errori rilevati</p>
                <ul className="space-y-1">
                    {violation.affectedFiles!.map((file, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm text-slate-300 py-1 border-b border-slate-800/50 last:border-0 hover:text-white transition-colors">
                            <span className="truncate pr-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {file.fileName.replace(/\.[^/.]+$/, "")}
                            </span>
                            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                                {file.count}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
  );
};

export default ViolationListItem;
