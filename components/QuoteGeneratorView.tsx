
import React, { useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { QuoteData, PageSample, AgidCategory } from '../types';
import { discoverSiteStructure } from '../services/geminiService';

interface QuoteGeneratorViewProps {
  dirName: string;
  initialData?: QuoteData;
  onSave: (data: QuoteData) => void;
}

// Logic: Home = 4h, Others = 2h, SR = 8h, Docs = 8h
const COSTS = {
    HOME_HOURS: 4,
    STD_HOURS: 2,
    SR_HOURS: 8,
    DOCS_HOURS: 8,
    DEFAULT_RATE: 35
};

// AgID Guidelines 5.1.3.5 Reference Map
const AGID_DEFINITIONS: Record<AgidCategory, { label: string, ref: string, desc: string }> = {
    home: { 
        label: 'Home Page', 
        ref: '5.1.3.5 comma 1', 
        desc: 'La home page del sito web è obbligatoria.' 
    },
    login: { 
        label: 'Login / Autenticazione', 
        ref: '5.1.3.5 comma 2', 
        desc: 'Pagine che costituiscono il processo di accesso, registrazione e recupero credenziali.' 
    },
    sitemap: { 
        label: 'Mappa Sito / Elenco', 
        ref: '5.1.3.5 comma 3', 
        desc: 'Mappa del sito o pagine contenenti l\'elenco dei servizi/contenuti.' 
    },
    contact: { 
        label: 'Contatti / Aiuto', 
        ref: '5.1.3.5 comma 4', 
        desc: 'Pagina contatti, help desk o pagine di aiuto.' 
    },
    legal: { 
        label: 'Legale / Privacy', 
        ref: '5.1.3.5 comma 5', 
        desc: 'Pagine contenenti termini legali, privacy policy, note legali.' 
    },
    search: { 
        label: 'Ricerca', 
        ref: '5.1.3.5 comma 6', 
        desc: 'Funzionalità di ricerca e relativa pagina dei risultati.' 
    },
    process: { 
        label: 'Processo / Servizio', 
        ref: '5.1.3.5 comma 6', 
        desc: 'Pagine che costituiscono un intero processo (es. carrello, compilazione modulo, prenotazione).' 
    },
    document: { 
        label: 'Documenti / Contenuti', 
        ref: '5.1.3.5 comma 6', 
        desc: 'Pagine rappresentative delle diverse tipologie di contenuto (es. tabelle, immagini, video, documenti scaricabili).' 
    },
    statement: { 
        label: 'Dichiarazione Accessibilità', 
        ref: '5.1.3.5 comma 7', 
        desc: 'La pagina contenente la dichiarazione di accessibilità e il meccanismo di feedback.' 
    },
    error: { 
        label: 'Errore 404', 
        ref: '5.1.3.5 comma 8', 
        desc: 'Esempi di pagine dall\'apparenza distinta, come le pagine di errore (404).' 
    },
    random: { 
        label: 'Campione Casuale', 
        ref: '5.1.3.5 comma 8', 
        desc: 'Almeno il 10% del campione deve essere costituito da pagine selezionate casualmente.' 
    }
};

// --- PDF MODULES ---

const printHeader = (doc: jsPDF, margin: number, projectName: string): number => {
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 153);
    doc.text("Offerta commerciale", margin, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(`Valutazione Accessibilità: ${projectName}`, margin, 30);
    
    return 45; // Next Y
};

const printPremise = (doc: jsPDF, startY: number, margin: number, pageWidth: number, baseUrl: string): number => {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const premise = `La presente offerta riguarda la valutazione di accessibilità per il sito ${baseUrl} conformemente al D.lgs. 106/2018 e alla norma UNI EN 301549:2021 (WCAG 2.1/2.2 livello AA).`;
    const splitText = doc.splitTextToSize(premise, pageWidth - (margin * 2));
    doc.text(splitText, margin, startY);
    return startY + (splitText.length * 5) + 10;
};

const printMethodology = (doc: jsPDF, startY: number, margin: number, flags: { sr: boolean, docs: boolean }): number => {
    let y = startY;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Metodologia di calcolo", margin, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`• Analisi Homepage completa (inclusi componenti comuni): ${COSTS.HOME_HOURS} ore`, margin, y); y+=5;
    doc.text(`• Analisi Pagine Interne (netto componenti comuni): ${COSTS.STD_HOURS} ore/cad`, margin, y); y+=5;
    if(flags.sr) { doc.text(`• Navigazione manuale Screen Reader: ${COSTS.SR_HOURS} ore`, margin, y); y+=5; }
    if(flags.docs) { doc.text(`• Redazione Report e Dichiarazione: ${COSTS.DOCS_HOURS} ore`, margin, y); y+=5; }
    
    return y + 4; // Add a little spacing before table
};

const printPageTable = (doc: jsPDF, startY: number, pages: PageSample[]): number => {
    const tableData = pages.map(p => {
        const displayUrl = p.url.length > 50 ? p.url.substring(0, 47) + '...' : p.url;
        return [
            p.name,
            displayUrl, 
            AGID_DEFINITIONS[p.category].label,
            `${p.category === 'home' ? COSTS.HOME_HOURS : COSTS.STD_HOURS}h`
        ];
    });

    autoTable(doc, {
        startY: startY,
        head: [['Pagina', 'URL', 'Categoria (AgID)', 'Stima']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
        // Use didDrawCell to make the URL clickable using the full URL from data
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const rowIndex = data.row.index;
                const originalPage = pages[rowIndex];
                if (originalPage && originalPage.url) {
                    doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: originalPage.url });
                }
            }
        }
    });

    return (doc as any).lastAutoTable.finalY + 10;
};

const printExtraTasks = (doc: jsPDF, startY: number, margin: number, flags: { sr: boolean, docs: boolean }): number => {
    if (!flags.sr && !flags.docs) return startY;

    let y = startY;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Attività Extra Incluse:", margin, y);
    y += 6;
    
    doc.setFontSize(9);
    if (flags.sr) {
        doc.text(`• Simulazione navigazione Screen Reader (${COSTS.SR_HOURS}h)`, margin + 5, y);
        y += 5;
    }
    if (flags.docs) {
        doc.text(`• Redazione Report Tecnico e Dichiarazione Accessibilità (${COSTS.DOCS_HOURS}h)`, margin + 5, y);
        y += 5;
    }
    return y + 5;
};

const printTotals = (doc: jsPDF, startY: number, margin: number, pageWidth: number, totals: { hours: number, cost: number }, rate: number) => {
    // Draw Box
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, startY, pageWidth/2, 40);
    
    // Content
    let textX = margin + 5;
    let textY = startY + 8;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Riepilogo Costi", textX, textY);
    
    textY += 10;
    doc.setFontSize(10);
    doc.text(`Totale Ore Stimate: ${totals.hours}`, textX, textY);
    
    textY += 6;
    doc.text(`Tariffa Oraria: € ${rate.toFixed(2)} (IVA incl.)`, textX, textY);
    
    textY += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 153);
    doc.text(`TOTALE: € ${totals.cost.toFixed(2)}`, textX, textY);
};

const printFooter = (doc: jsPDF, margin: number, pageHeight: number) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Preventivo valido 30 giorni dalla data di emissione.", margin, pageHeight - 10);
};


const QuoteGeneratorView: React.FC<QuoteGeneratorViewProps> = ({ dirName, initialData, onSave }) => {
  const [formData, setFormData] = useState<QuoteData>({
    clientName: '',
    projectName: dirName,
    baseUrl: '',
    date: new Date().toISOString().split('T')[0],
    clientType: 'Private',
    monitoringType: 'depth',
    deliveryDate: '',
    pages: [],
    includeScreenReader: false,
    includeDocumentation: true, // Default true
    hourlyRate: COSTS.DEFAULT_RATE
  });

  const [isSearching, setIsSearching] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Initialize with initial data if available
  useEffect(() => {
    if (initialData) {
        setFormData({
            ...initialData,
            pages: initialData.pages || [] // Ensure array
        });
    }
  }, [initialData]);

  // AI Discovery Handler
  const handleDiscoverPages = async () => {
    if (!formData.baseUrl) {
        alert("Inserisci prima l'URL del sito");
        return;
    }
    
    setIsSearching(true);
    try {
        const discovered = await discoverSiteStructure(formData.baseUrl);
        
        // REPLACE existing pages with new ones (Regenerate from scratch)
        if (discovered.length > 0) {
            setFormData(prev => ({
                ...prev,
                pages: discovered
            }));
        } else {
            alert("Nessuna pagina trovata automaticamente. Verifica l'URL o aggiungi manualmente.");
        }

    } catch (e) {
        console.error(e);
        alert("Errore durante la ricerca. Riprova o inserisci manualmente.");
    } finally {
        setIsSearching(false);
    }
  };

  const handleAddPage = () => {
      const newPage: PageSample = {
          id: crypto.randomUUID(),
          name: 'Nuova Pagina',
          url: '',
          category: 'document', // Default
          description: ''
      };
      setFormData(prev => ({ ...prev, pages: [...(prev.pages || []), newPage] }));
  };

  const updatePage = (id: string, updates: Partial<PageSample>) => {
      setFormData(prev => ({
          ...prev,
          pages: (prev.pages || []).map(p => p.id === id ? { ...p, ...updates } : p)
      }));
  };

  const removePage = (id: string) => {
      setFormData(prev => ({
          ...prev,
          pages: (prev.pages || []).filter(p => p.id !== id)
      }));
  };

  const calculateTotals = () => {
      let hours = 0;
      (formData.pages || []).forEach(p => {
          hours += p.category === 'home' ? COSTS.HOME_HOURS : COSTS.STD_HOURS;
      });
      
      if (formData.includeScreenReader) hours += COSTS.SR_HOURS;
      if (formData.includeDocumentation) hours += COSTS.DOCS_HOURS;

      const totalCost = hours * formData.hourlyRate;

      return { hours, totalCost };
  };

  const totals = calculateTotals();

  const handleSave = () => {
      onSave(formData);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Header
    let yPos = printHeader(doc, margin, formData.projectName);

    // 2. Premise
    yPos = printPremise(doc, yPos, margin, pageWidth, formData.baseUrl);

    // 3. Methodology
    yPos = printMethodology(doc, yPos, margin, { 
        sr: formData.includeScreenReader, 
        docs: formData.includeDocumentation 
    });

    // 4. Table (autoTable handles Y and pages)
    yPos = printPageTable(doc, yPos, formData.pages || []);

    // 5. Extra Tasks Details
    yPos = printExtraTasks(doc, yPos, margin, { 
        sr: formData.includeScreenReader, 
        docs: formData.includeDocumentation 
    });

    // 6. Totals Box
    // Check if enough space for box (approx 40 height), else add page
    if (yPos + 45 > pageHeight) {
        doc.addPage();
        yPos = 20;
    }
    printTotals(doc, yPos, margin, pageWidth, { hours: totals.hours, cost: totals.totalCost }, formData.hourlyRate);

    // 7. Footer
    printFooter(doc, margin, pageHeight);

    doc.save(`Preventivo_${formData.clientName || 'Cliente'}.pdf`);
  };

  return (
    <div className="animate-fade-in bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full max-h-[800px] relative">
         {showToast && <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg z-50">Salvataggio OK!</div>}

        <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-bold text-white">Preventivo & Campionamento</h2>
            <div className="flex gap-2">
                <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500">Salva</button>
                <button onClick={generatePDF} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500">PDF Offerta</button>
            </div>
        </div>

        <div className="overflow-y-auto p-6 custom-scrollbar space-y-8">
            
            {/* 1. Project Info */}
            <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">1. Dati Progetto & Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Cliente</label>
                        <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Es. Mario Rossi Srl" />
                    </div>
                    <div>
                         <label className="block text-xs text-slate-500 mb-1">URL Principale (Home)</label>
                         <div className="flex gap-2">
                            <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.baseUrl} onChange={e => setFormData({...formData, baseUrl: e.target.value})} placeholder="https://..." />
                            <button 
                                onClick={handleDiscoverPages} 
                                disabled={isSearching}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                                title="Usa AI per trovare le pagine principali"
                            >
                                {isSearching ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : '🔍 AI'}
                            </button>
                         </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Tipo Soggetto</label>
                        <select className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.clientType} onChange={e => setFormData({...formData, clientType: e.target.value as any})}>
                            <option value="Private">Privato (Azienda)</option>
                            <option value="PA">Pubblica Amministrazione</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Metodo Monitoraggio</label>
                        <select className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.monitoringType} onChange={e => setFormData({...formData, monitoringType: e.target.value as any})}>
                            <option value="depth">Approfondito (Completo)</option>
                            <option value="simplified">Semplificato</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Data Consegna Prevista</label>
                        <input type="date" className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                    </div>
                </div>
            </section>

            {/* 2. Page Sampling */}
            <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                     <h3 className="text-lg font-bold text-slate-300">2. Campione Pagine (Rif. AgID 5.1.3.5)</h3>
                     <button onClick={handleAddPage} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded">+ Aggiungi Riga</button>
                </div>
                
                <div className="overflow-visible">
                    <table className="w-full text-sm text-left text-slate-300 border-collapse">
                        <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                            <tr>
                                <th className="px-3 py-3 w-1/4">Categoria AgID / Normativa</th>
                                <th className="px-3 py-3 w-1/4">Nome / Descrizione</th>
                                <th className="px-3 py-3 w-1/3">URL</th>
                                <th className="px-3 py-3 text-right">Stima</th>
                                <th className="px-3 py-3 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {(formData.pages || []).map((page) => {
                                const agidInfo = AGID_DEFINITIONS[page.category];
                                return (
                                <tr key={page.id} className="hover:bg-slate-800/30">
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <select 
                                                className="bg-slate-900 border border-slate-600 rounded text-xs p-1 max-w-[180px] truncate"
                                                value={page.category}
                                                onChange={(e) => updatePage(page.id, { category: e.target.value as AgidCategory })}
                                            >
                                                {Object.entries(AGID_DEFINITIONS).map(([key, def]) => (
                                                    <option key={key} value={key}>{def.label}</option>
                                                ))}
                                            </select>
                                            
                                            {/* Tooltip */}
                                            <div className="group relative">
                                                <div className="w-5 h-5 rounded-full bg-slate-700 text-sky-400 flex items-center justify-center text-xs font-bold border border-slate-600 cursor-help">i</div>
                                                <div className="absolute left-6 top-0 w-64 p-3 bg-slate-900 border border-indigo-500 rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <p className="font-bold text-white text-xs mb-1">Rif. AgID {agidInfo.ref}</p>
                                                    <p className="text-xs text-slate-300 leading-tight">{agidInfo.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input className="bg-transparent border-b border-slate-700 focus:border-indigo-500 outline-none w-full" value={page.name} onChange={e => updatePage(page.id, { name: e.target.value })} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input className="bg-transparent border-b border-slate-700 focus:border-indigo-500 outline-none w-full font-mono text-xs text-sky-300" value={page.url} onChange={e => updatePage(page.id, { url: e.target.value })} placeholder="https://..." />
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-emerald-400">
                                        {page.category === 'home' ? COSTS.HOME_HOURS : COSTS.STD_HOURS}h
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button onClick={() => removePage(page.id)} className="text-slate-600 hover:text-red-400">×</button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                {(formData.pages || []).length === 0 && <p className="text-center text-slate-500 italic mt-4">Nessuna pagina inserita. Usa il tasto AI o aggiungi manualmente.</p>}
            </section>

            {/* 3. Costs & Tasks */}
            <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                 <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">3. Configurazione Costi</h3>
                 <div className="flex flex-col md:flex-row gap-8">
                     <div className="flex-1 space-y-3">
                         <label className="flex items-center gap-3 p-3 rounded border border-slate-700 bg-slate-800/50 cursor-pointer hover:bg-slate-800">
                             <input type="checkbox" checked={formData.includeScreenReader} onChange={e => setFormData({...formData, includeScreenReader: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-600" />
                             <div>
                                 <span className="block font-medium text-slate-200">Simulazione Screen Reader (Manuale)</span>
                                 <span className="text-xs text-slate-500">Aggiunge {COSTS.SR_HOURS} ore fisse al preventivo</span>
                             </div>
                         </label>
                         <label className="flex items-center gap-3 p-3 rounded border border-slate-700 bg-slate-800/50 cursor-pointer hover:bg-slate-800">
                             <input type="checkbox" checked={formData.includeDocumentation} onChange={e => setFormData({...formData, includeDocumentation: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-600" />
                             <div>
                                 <span className="block font-medium text-slate-200">Redazione Documentazione (Report + Dichiarazione)</span>
                                 <span className="text-xs text-slate-500">Aggiunge {COSTS.DOCS_HOURS} ore fisse al preventivo</span>
                             </div>
                         </label>
                     </div>

                     <div className="w-full md:w-64 bg-slate-800 p-4 rounded-xl border border-indigo-900/50 flex flex-col justify-between">
                         <div>
                             <p className="text-sm text-slate-400 mb-1">Totale Ore Stimate</p>
                             <p className="text-3xl font-bold text-white mb-4">{totals.hours} h</p>
                             
                             <div className="mb-4">
                                <label className="text-xs text-slate-500 block mb-1">Tariffa Oraria (€)</label>
                                <input type="number" className="w-20 bg-slate-900 border border-slate-600 rounded p-1 text-right text-white" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})} />
                             </div>
                         </div>
                         <div className="border-t border-slate-700 pt-3">
                             <p className="text-xs text-slate-400">Totale (IVA Incl.)</p>
                             <p className="text-2xl font-bold text-emerald-400">€ {totals.totalCost.toFixed(2)}</p>
                         </div>
                     </div>
                 </div>
            </section>

        </div>
    </div>
  );
};

export default QuoteGeneratorView;
