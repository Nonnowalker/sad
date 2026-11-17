
import React, { useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { EvaluationData, StatementData, Violation, WcagStatus } from '../types';

// --- Constants ---

// Mapping for WCAG 2.2 Anchors (based on English slugs, used in IT translation anchors)
const WCAG_URL_MAP: { [key: string]: string } = {
  '1.1.1': 'non-text-content',
  '1.2.1': 'audio-only-and-video-only-prerecorded',
  '1.2.2': 'captions-prerecorded',
  '1.2.3': 'audio-description-or-media-alternative-prerecorded',
  '1.2.4': 'captions-live',
  '1.2.5': 'audio-description-prerecorded',
  '1.3.1': 'info-and-relationships',
  '1.3.2': 'meaningful-sequence',
  '1.3.3': 'sensory-characteristics',
  '1.3.4': 'orientation',
  '1.3.5': 'identify-input-purpose',
  '1.4.1': 'use-of-color',
  '1.4.2': 'audio-control',
  '1.4.3': 'contrast-minimum',
  '1.4.4': 'resize-text',
  '1.4.5': 'images-of-text',
  '1.4.10': 'reflow',
  '1.4.11': 'non-text-contrast',
  '1.4.12': 'text-spacing',
  '1.4.13': 'content-on-hover-or-focus',
  '2.1.1': 'keyboard',
  '2.1.2': 'no-keyboard-trap',
  '2.1.4': 'character-key-shortcuts',
  '2.2.1': 'timing-adjustable',
  '2.2.2': 'pause-stop-hide',
  '2.3.1': 'three-flashes-or-below-threshold',
  '2.4.1': 'bypass-blocks',
  '2.4.2': 'page-titled',
  '2.4.3': 'focus-order',
  '2.4.4': 'link-purpose-in-context',
  '2.4.5': 'multiple-ways',
  '2.4.6': 'headings-and-labels',
  '2.4.7': 'focus-visible',
  '2.4.11': 'focus-not-obscured-minimum',
  '2.5.1': 'pointer-gestures',
  '2.5.2': 'pointer-cancellation',
  '2.5.3': 'label-in-name',
  '2.5.4': 'motion-actuation',
  '2.5.7': 'dragging-movements',
  '2.5.8': 'target-size-minimum',
  '3.1.1': 'language-of-page',
  '3.1.2': 'language-of-parts',
  '3.2.1': 'on-focus',
  '3.2.2': 'on-input',
  '3.2.3': 'consistent-navigation',
  '3.2.4': 'consistent-identification',
  '3.2.6': 'consistent-help',
  '3.3.1': 'error-identification',
  '3.3.2': 'labels-or-instructions',
  '3.3.3': 'error-suggestion',
  '3.3.4': 'error-prevention-legal-financial-data',
  '3.3.7': 'redundant-entry',
  '3.3.8': 'accessible-authentication-minimum',
  '4.1.2': 'name-role-value',
  '4.1.3': 'status-messages',
};

// WCAG 2.2 Criteria List (A & AA)
const WCAG_CRITERIA = [
    { id: '1.1.1', name: 'Contenuti non testuali', level: 'A' },
    { id: '1.2.1', name: 'Solo audio e solo video (pre-registrati)', level: 'A' },
    { id: '1.2.2', name: 'Sottotitoli (pre-registrati)', level: 'A' },
    { id: '1.2.3', name: 'Audio-descrizione o media alternativo', level: 'A' },
    { id: '1.2.4', name: 'Sottotitoli (in diretta)', level: 'AA' },
    { id: '1.2.5', name: 'Audio-descrizione (preregistrata)', level: 'AA' },
    { id: '1.3.1', name: 'Informazioni e correlazioni', level: 'A' },
    { id: '1.3.2', name: 'Sequenza significativa', level: 'A' },
    { id: '1.3.3', name: 'Caratteristiche sensoriali', level: 'A' },
    { id: '1.3.4', name: 'Orientamento', level: 'AA' },
    { id: '1.3.5', name: 'Identificare lo scopo degli input', level: 'AA' },
    { id: '1.4.1', name: 'Uso del colore', level: 'A' },
    { id: '1.4.2', name: 'Controllo del sonoro', level: 'A' },
    { id: '1.4.3', name: 'Contrasto minimo', level: 'AA' },
    { id: '1.4.4', name: 'Ridimensionamento del testo', level: 'AA' },
    { id: '1.4.5', name: 'Immagini di testo', level: 'AA' },
    { id: '1.4.10', name: 'Ricalcolo del flusso', level: 'AA' },
    { id: '1.4.11', name: 'Contrasto in contenuti non testuali', level: 'AA' },
    { id: '1.4.12', name: 'Spaziatura del testo', level: 'AA' },
    { id: '1.4.13', name: 'Contenuto con Hover o Focus', level: 'AA' },
    { id: '2.1.1', name: 'Tastiera', level: 'A' },
    { id: '2.1.2', name: 'Nessun impedimento all\'uso della tastiera', level: 'A' },
    { id: '2.1.4', name: 'Tasti di scelta rapida', level: 'A' },
    { id: '2.2.1', name: 'Regolazione tempi di esecuzione', level: 'A' },
    { id: '2.2.2', name: 'Pausa, Stop, Nascondi', level: 'A' },
    { id: '2.3.1', name: 'Tre lampeggiamenti o inferiore alla soglia', level: 'A' },
    { id: '2.4.1', name: 'Salto di blocchi', level: 'A' },
    { id: '2.4.2', name: 'Titolazione della pagina', level: 'A' },
    { id: '2.4.3', name: 'Ordine del focus', level: 'A' },
    { id: '2.4.4', name: 'Scopo del collegamento (nel contesto)', level: 'A' },
    { id: '2.4.5', name: 'Differenti modalità', level: 'AA' },
    { id: '2.4.6', name: 'Intestazioni ed etichette', level: 'AA' },
    { id: '2.4.7', name: 'Focus visibile', level: 'AA' },
    { id: '2.4.11', name: 'Focus non oscurato (minimo)', level: 'AA' },
    { id: '2.5.1', name: 'Movimenti del puntatore', level: 'A' },
    { id: '2.5.2', name: 'Cancellazione delle azioni del puntatore', level: 'A' },
    { id: '2.5.3', name: 'Etichetta nel nome', level: 'A' },
    { id: '2.5.4', name: 'Azionamento da movimento', level: 'A' },
    { id: '2.5.7', name: 'Movimenti di trascinamento', level: 'AA' },
    { id: '2.5.8', name: 'Dimensione dell\'obiettivo (minimo)', level: 'AA' },
    { id: '3.1.1', name: 'Lingua della pagina', level: 'A' },
    { id: '3.1.2', name: 'Parti in lingua', level: 'AA' },
    { id: '3.2.1', name: 'Al Focus', level: 'A' },
    { id: '3.2.2', name: 'All\'input', level: 'A' },
    { id: '3.2.3', name: 'Navigazione coerente', level: 'AA' },
    { id: '3.2.4', name: 'Identificazione coerente', level: 'AA' },
    { id: '3.2.6', name: 'Aiuto coerente', level: 'A' },
    { id: '3.3.1', name: 'Identificazione di errori', level: 'A' },
    { id: '3.3.2', name: 'Etichette o istruzioni', level: 'A' },
    { id: '3.3.3', name: 'Suggerimenti per gli errori', level: 'AA' },
    { id: '3.3.4', name: 'Prevenzione degli errori (legali, finanziari, dati)', level: 'AA' },
    { id: '3.3.7', name: 'Inserimento ridondante', level: 'A' },
    { id: '3.3.8', name: 'Autenticazione accessibile (minimo)', level: 'AA' },
    { id: '4.1.2', name: 'Nome, ruolo, valore', level: 'A' },
    { id: '4.1.3', name: 'Messaggi di stato', level: 'AA' },
];

// --- GENERATORS ---

export const generateEvaluationPdfBlob = (data: EvaluationData, webViolations?: Violation[], nonWebViolations?: Violation[]): Blob => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxTextWidth = pageWidth - (margin * 2);
    
    // Check if there are non-web items to report
    const hasNonWeb = (data.documentsVerified && data.documentsVerified.length > 0) || 
                      (data.wcagMatrixNonWeb && Object.keys(data.wcagMatrixNonWeb).length > 0);
    
    // --- Header ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const dateStr = data.date ? new Date(data.date).toLocaleDateString() : '-';
    doc.text(`Data: ${dateStr}`, pageWidth - margin, 20, { align: "right" });

    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text("Report di valutazione", margin, 30);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text(data.siteName || "Nome Sito", margin, 42);
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("ACCESSIBILITÀ", margin, 50);

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(margin, 55, pageWidth - margin, 55);

    let yPos = 70;

    // --- Content ---
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Breve descrizione del prodotto:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    const descText = doc.splitTextToSize(data.productDescription || "Nessuna descrizione fornita.", maxTextWidth);
    doc.text(descText, margin, yPos);
    yPos += (descText.length * 5) + 6;

    if (data.siteUrl) {
        doc.text(`Il sito è raggiungibile all'indirizzo: ${data.siteUrl}`, margin, yPos);
        yPos += 8;
    }

    const toolsText = doc.splitTextToSize(`La valutazione, effettuata con strumenti automatici e riscontro manuale, si è avvalsa dei seguenti software di analisi o test: ${data.toolsUsed || 'Chrome, Accessibility Insights'}.`, maxTextWidth);
    doc.text(toolsText, margin, yPos);
    yPos += (toolsText.length * 5) + 10;

    // Metodologia
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "italic");
    doc.text("Metodologia di valutazione:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    const methodText = doc.splitTextToSize(
        "La valutazione è stata effettuata con metodologia di verifica a campione secondo il metodo di monitoraggio illustrato nelle Linee Guida di accessibilità AGID, sezione 5.1.3.5.",
        maxTextWidth
    );
    doc.text(methodText, margin, yPos);
    yPos += (methodText.length * 5) + 6;

    // Pages
    doc.text("Di seguito le pagine verificate alla data di redazione:", margin, yPos);
    yPos += 6;
    if (data.pagesVerified && data.pagesVerified.length > 0) {
        data.pagesVerified.forEach(page => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`• ${page}`, margin + 5, yPos);
            yPos += 6;
        });
    } else {
        doc.text("• Nessuna pagina specifica indicata.", margin + 5, yPos);
        yPos += 6;
    }
    yPos += 8;

    // Non-Web Docs
    if (hasNonWeb) {
        if (yPos > 260) { doc.addPage(); yPos = 20; }
        doc.text("Di seguito i documenti non-web verificati alla data di redazione:", margin, yPos);
        yPos += 6;
        
        // List verified documents if present, or generic message if only matrix data exists
        if (data.documentsVerified && data.documentsVerified.length > 0) {
            data.documentsVerified.forEach(d => {
                if (yPos > 270) { doc.addPage(); yPos = 20; }
                doc.text(`• ${d}`, margin + 5, yPos);
                yPos += 6;
            });
        } else {
             doc.text(`• Documenti PDF/Office analizzati (vedi dettaglio nella matrice).`, margin + 5, yPos);
             yPos += 6;
        }
        yPos += 8;
    }

    // Standards
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "italic");
    doc.text("Standard applicabili e linee guida:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    
    const std1Text = "Norma europea EN 301 549 Requisiti di accessibilità per prodotti e servizi ICT UNI EN 301549 in versione italiana";
    const std1Lines = doc.splitTextToSize(std1Text, maxTextWidth - 10);
    doc.text("•", margin + 5, yPos);
    doc.text(std1Lines, margin + 10, yPos);
    yPos += (std1Lines.length * 5) + 2;
    doc.setTextColor(0, 0, 255);
    doc.textWithLink("https://store.uni.com/uni-cei-en-301549-2021", margin + 10, yPos, { url: "https://store.uni.com/uni-cei-en-301549-2021" });
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    const std2Text = "Linee guida per l'accessibilità dei contenuti Web (WCAG) 2.2";
    const std2Lines = doc.splitTextToSize(std2Text, maxTextWidth - 10);
    doc.text("•", margin + 5, yPos);
    doc.text(std2Lines, margin + 10, yPos);
    yPos += (std2Lines.length * 5) + 2;
    doc.setTextColor(0, 0, 255);
    doc.textWithLink("https://www.w3.org/Translations/WCAG22-it/", margin + 10, yPos, { url: "https://www.w3.org/Translations/WCAG22-it/" });
    doc.setTextColor(0, 0, 0);
    yPos += 14;

    // Responsabile
    if (yPos > 260) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "italic");
    doc.text("Valutatore indipendente / Responsabile della compilazione:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(data.responsible || "Non specificato", margin, yPos);
    yPos += 14;

    // Web Tables
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.text("Documenti web", margin, 20);

    const createTable = (matrix: {[key:string]: WcagStatus}, prefix: string, violationsList?: Violation[]) => {
        return WCAG_CRITERIA.map(c => {
            const entry = matrix[c.id];
            const uniReference = `${prefix}${c.id} ${c.name}`;
            
            let criterionText = `${c.id} ${c.name} (Livello ${c.level})\n${uniReference}`;

             if (violationsList) {
                const violation = violationsList.find(v => v.criterion.includes(c.id));
                if (violation && violation.affectedFiles && violation.affectedFiles.length > 0) {
                     const fileList = violation.affectedFiles.map(f => `• ${f.fileName} (${f.count})`).join('\n');
                     criterionText += `\n\nFile coinvolti:\n${fileList}`;
                }
            }

            return [
                { content: criterionText, styles: { textColor: [0, 51, 153] as [number, number, number] } },
                entry ? entry.status : 'Non Valutato'
            ];
        });
    };

    autoTable(doc, {
        startY: 30,
        head: [['Criterio', 'Conformità']],
        body: createTable(data.wcagMatrix, '9.', webViolations),
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1 && data.cell.raw === 'Non Soddisfatto') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [200, 0, 0] as [number, number, number];
            }
        }
    });

    // Non-Web Tables (Conditional)
    if (hasNonWeb) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.text("Documenti non web", margin, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Criterio', 'Conformità']],
            body: createTable(data.wcagMatrixNonWeb, '10.', nonWebViolations),
            theme: 'grid',
            headStyles: { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 1 && data.cell.raw === 'Non Soddisfatto') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [200, 0, 0] as [number, number, number];
                }
            }
        });
    }

    return doc.output('blob');
};

export const generateStatementPdfBlob = (data: StatementData): Blob => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxTextWidth = pageWidth - (margin * 2);
    
    let yPos = 20;

    // --- Header ---
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.text("Dichiarazione di Accessibilità", margin, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(24);
    doc.text("Linee guida sull'accessibilità degli", margin, yPos);
    yPos += 10;
    doc.text("strumenti informatici", margin, yPos);
    yPos += 14;

    doc.setFontSize(11);
    const subTitle = "Modello di dichiarazione di accessibilità sito web e applicazione mobile per i soggetti di cui all'art. 3 comma 1-bis della legge 9 gennaio 2004, n.4";
    const subTitleLines = doc.splitTextToSize(subTitle, maxTextWidth);
    doc.text(subTitleLines, margin, yPos);
    yPos += (subTitleLines.length * 5) + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`SITO WEB: ${data.siteUrl.toUpperCase()}`, margin, yPos);
    doc.setTextColor(0, 0, 255);
    doc.link(margin + 25, yPos - 4, 100, 5, { url: data.siteUrl });
    doc.setTextColor(0, 0, 0);
    yPos += 12;

    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // --- Premessa ---
    doc.setFont("helvetica", "bold");
    doc.text("PREMESSA", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const boilerplate = `${data.siteName} si impegna a rendere il proprio sito web accessibile, conformemente alla Legge 9 gennaio 2004, n. 4, come modificata dal Decreto Legislativo 10 agosto 2018, n. 106, che ha recepito la Direttiva (UE) 2016/2102. La presente dichiarazione di accessibilità si applica al sito: ${data.siteUrl}`;
    const premessaLines = doc.splitTextToSize(boilerplate, maxTextWidth);
    doc.text(premessaLines, margin, yPos);
    yPos += (premessaLines.length * 5) + 8;

    // --- Stato di Conformità ---
    doc.setFont("helvetica", "bold");
    doc.text("STATO DI CONFORMITÀ", margin, yPos);
    yPos += 6;
    doc.text(data.complianceStatus, margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    
    const complianceText = "Questo sito web è parzialmente conforme ai requisiti previsti dall'allegato A alla norma UNI CEI EN 301549:2021 (corrispondente alle WCAG 2.1 livello AA). Lo stato di parziale conformità è attribuito ai sensi della Decisione di esecuzione (UE) 2018/1523, che definisce tale classificazione quando la maggior parte delle prescrizioni è rispettata.";
    const complianceLines = doc.splitTextToSize(complianceText, maxTextWidth);
    doc.text(complianceLines, margin, yPos);
    yPos += (complianceLines.length * 5) + 8;

    // --- Contenuti Non Accessibili ---
    if(yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("CONTENUTI NON ACCESSIBILI", margin, yPos);
    yPos += 6;
    
    // a) Inosservanza
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("a) Inosservanza del D.lgs. 106/2018", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "italic");
    doc.text("Le principali non conformità rilevate includono:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    
    if (data.nonComplianceReason) {
        const issues = data.nonComplianceReason.split('\n');
        issues.forEach(issue => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(`• ${issue}`, margin + 5, yPos);
            yPos += 5;
        });
    } else {
        doc.text("• Nessuna non conformità rilevata.", margin + 5, yPos);
        yPos += 5;
    }
    yPos += 6;

    // b) Onere
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("b) Onere sproporzionato", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    const burdenText = doc.splitTextToSize(data.disproportionateBurden || "Nessun onere sproporzionato invocato.", maxTextWidth);
    doc.text(burdenText, margin, yPos);
    yPos += (burdenText.length * 5) + 6;

    // c) Esclusi
    doc.setFont("helvetica", "bold");
    doc.text("c) Contenuti esclusi dall'ambito della direttiva", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    const excludedText = doc.splitTextToSize(data.contentExcluded || "Nessun contenuto escluso.", maxTextWidth);
    doc.text(excludedText, margin, yPos);
    yPos += (excludedText.length * 5) + 10;

    // --- Impegni Miglioramento ---
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("IMPEGNI DI MIGLIORAMENTO", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const improveIntro = `${data.siteName} riconosce l'importanza dell'accessibilità e si impegna a migliorare progressivamente il sito web al fine di garantire una fruizione inclusiva da parte di tutti gli utenti.`;
    const improveLines = doc.splitTextToSize(improveIntro, maxTextWidth);
    doc.text(improveLines, margin, yPos);
    yPos += (improveLines.length * 5) + 6;

    const improvePlan = doc.splitTextToSize(data.improvementPlan || "Piano di miglioramento in fase di definizione.", maxTextWidth);
    doc.text(improvePlan, margin, yPos);
    yPos += (improvePlan.length * 5) + 10;

    // --- Redazione ---
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("REDAZIONE DELLA DICHIARAZIONE", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text(`Data: ${data.date}`, margin, yPos);
    yPos += 6;
    doc.text("Metodo:", margin, yPos);
    doc.setFont("helvetica", "normal");
    const methodDecl = "Valutazione effettuata da terza parte indipendente tramite analisi tecnica specialistica su campione rappresentativo di contenuti.";
    const methodDeclLines = doc.splitTextToSize(methodDecl, maxTextWidth - 15);
    doc.text(methodDeclLines, margin + 15, yPos);
    yPos += (methodDeclLines.length * 5) + 10;

    // --- Feedback ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("FEEDBACK E CONTATTI", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Email per segnalazioni: ${data.feedbackEmail}`, margin, yPos);
    yPos += 6;
    const feedbackText = "Chiunque può notificare difetti di accessibilità o richiedere contenuti alternativi tramite questo indirizzo.";
    doc.text(feedbackText, margin, yPos);
    yPos += 12;

    // --- Procedura Attuazione ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PROCEDURA DI ATTUAZIONE", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const procText = "In caso di mancata risposta o risposta non soddisfacente entro 30 giorni, è possibile presentare segnalazione a:";
    doc.text(procText, margin, yPos);
    yPos += 8;
    doc.text("AGID – Agenzia per l'Italia Digitale", margin, yPos);
    yPos += 5;
    doc.text("PEC: protocollo@pec.agid.gov.it", margin, yPos);
    yPos += 12;

    // --- Info Aggiuntive ---
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("INFORMAZIONI AGGIUNTIVE", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`• Data di pubblicazione del sito: ${data.publishDate}`, margin + 5, yPos); yPos += 6;
    doc.text(`• CMS utilizzato: ${data.cmsUsed}`, margin + 5, yPos); yPos += 6;
    doc.text(`• Test di usabilità: ${data.usabilityTests}`, margin + 5, yPos); yPos += 6;

    return doc.output('blob');
};

// --- Evaluation Report Editor ---

interface EvaluationReportViewProps {
    dirName: string;
    initialData?: EvaluationData;
    webViolations: Violation[];
    nonWebViolations: Violation[];
    hasNonWeb: boolean;
    onSave: (data: EvaluationData) => void;
}

export const EvaluationReportView: React.FC<EvaluationReportViewProps> = ({ dirName, initialData, webViolations, nonWebViolations, hasNonWeb, onSave }) => {
    
    const [formData, setFormData] = useState<EvaluationData>({
        siteName: '',
        siteUrl: '',
        date: new Date().toISOString().split('T')[0],
        responsible: '',
        productDescription: '',
        toolsUsed: 'Chrome, Accessibility Insights, VoiceOver, NVDA',
        pagesVerified: [],
        documentsVerified: [],
        wcagMatrix: {},
        wcagMatrixNonWeb: {}
    });

    const [activeTab, setActiveTab] = useState<'web' | 'non-web'>('web');
    const [showToast, setShowToast] = useState(false);
    
    const [newPageUrl, setNewPageUrl] = useState('');
    const [newDocUrl, setNewDocUrl] = useState('');

    useEffect(() => {
        let baseData = initialData ? { ...initialData } : {
            siteName: dirName,
            siteUrl: '',
            date: new Date().toISOString().split('T')[0],
            responsible: '',
            productDescription: '',
            toolsUsed: 'Chrome, Accessibility Insights, VoiceOver, NVDA',
            pagesVerified: [],
            documentsVerified: [],
            wcagMatrix: {},
            wcagMatrixNonWeb: {}
        };
        
        baseData.wcagMatrix = baseData.wcagMatrix || {};
        baseData.wcagMatrixNonWeb = baseData.wcagMatrixNonWeb || {};
        baseData.pagesVerified = baseData.pagesVerified || [];
        baseData.documentsVerified = baseData.documentsVerified || [];

        // Update Matrix from violations, preserving manual notes
        const updateMatrix = (matrix: any, violationsList: Violation[]) => {
            WCAG_CRITERIA.forEach(c => {
                const violation = violationsList.find(v => v.criterion.includes(c.id));
                const existingEntry = matrix[c.id];

                if (violation) {
                    matrix[c.id] = {
                        status: 'Non Soddisfatto',
                        note: `Rilevate ${violation.count} violazioni. ` + (existingEntry?.note && !existingEntry.note.includes('Rilevate') ? `(${existingEntry.note})` : '')
                    };
                } else if (!existingEntry || existingEntry.status === 'Non Soddisfatto') {
                    matrix[c.id] = { status: 'Soddisfatto', note: existingEntry?.note || '' };
                }
            });
        };

        updateMatrix(baseData.wcagMatrix, webViolations);
        if (hasNonWeb) {
             updateMatrix(baseData.wcagMatrixNonWeb, nonWebViolations);
        }
        
        setFormData(baseData as EvaluationData);
    }, [initialData, webViolations, nonWebViolations, hasNonWeb, dirName]);

    const handleSave = () => { onSave(formData); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
    
    const handleDownloadPdf = () => {
        const blob = generateEvaluationPdfBlob(formData, webViolations, nonWebViolations);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Report_Valutazione_${formData.siteName.replace(/\s+/g,'_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const addPage = () => {
        if(newPageUrl.trim()) {
            setFormData(prev => ({...prev, pagesVerified: [...(prev.pagesVerified || []), newPageUrl.trim()]}));
            setNewPageUrl('');
        }
    };
    const removePage = (idx: number) => {
        setFormData(prev => ({...prev, pagesVerified: (prev.pagesVerified || []).filter((_, i) => i !== idx)}));
    };

    const addDoc = () => {
        if(newDocUrl.trim()) {
            setFormData(prev => ({...prev, documentsVerified: [...(prev.documentsVerified || []), newDocUrl.trim()]}));
            setNewDocUrl('');
        }
    };
    const removeDoc = (idx: number) => {
        setFormData(prev => ({...prev, documentsVerified: (prev.documentsVerified || []).filter((_, i) => i !== idx)}));
    };

    return (
        <div className="animate-fade-in bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full max-h-[800px] relative">
            {showToast && <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg z-50">Salvataggio OK!</div>}
            
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-xl font-bold text-white">Editor Report Valutazione</h2>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500">Salva</button>
                    <button onClick={handleDownloadPdf} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500">PDF</button>
                </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* 1. Anagrafica */}
                <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">1. Anagrafica e Metadati</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Nome Sito / Prodotto</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.siteName} onChange={e=>setFormData({...formData, siteName: e.target.value})} placeholder="Es. Portale Istituzionale" />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">URL Principale</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.siteUrl} onChange={e=>setFormData({...formData, siteUrl: e.target.value})} placeholder="https://..." />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Data</label>
                             <input type="date" className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Valutatore Indipendente</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.responsible} onChange={e=>setFormData({...formData, responsible: e.target.value})} placeholder="Nome Cognome" />
                         </div>
                    </div>
                </section>

                {/* 2. Descrizione */}
                <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">2. Descrizione e Strumenti</h3>
                    <div className="space-y-4">
                        <div>
                             <label className="block text-xs text-slate-500 mb-1">Descrizione Prodotto</label>
                             <textarea className="w-full h-24 bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.productDescription} onChange={e=>setFormData({...formData, productDescription: e.target.value})} placeholder="Breve descrizione..." />
                        </div>
                        <div>
                             <label className="block text-xs text-slate-500 mb-1">Strumenti di Valutazione utilizzati</label>
                             <textarea className="w-full h-16 bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.toolsUsed} onChange={e=>setFormData({...formData, toolsUsed: e.target.value})} />
                        </div>
                    </div>
                </section>

                {/* 3. Campione */}
                <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">3. Campione Analizzato</h3>
                    
                    <div className="mb-6">
                        <label className="block text-xs text-slate-500 mb-2">Pagine Web Verificate</label>
                        <div className="flex gap-2 mb-2">
                             <input className="flex-1 bg-slate-800 border-slate-600 text-white p-2 rounded text-sm" value={newPageUrl} onChange={e=>setNewPageUrl(e.target.value)} placeholder="https://..." onKeyDown={e => e.key === 'Enter' && addPage()} />
                             <button onClick={addPage} className="px-3 bg-indigo-600 text-white rounded text-sm">+</button>
                        </div>
                        <ul className="space-y-1">
                            {(formData.pagesVerified || []).map((p, i) => (
                                <li key={i} className="flex justify-between items-center bg-slate-800 px-3 py-1 rounded text-sm text-slate-300">
                                    <span className="truncate">{p}</span>
                                    <button onClick={()=>removePage(i)} className="text-red-400 hover:text-red-300 ml-2">x</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ALWAYS show Non-Web input if there are non-web reports, or just if matrix exists */}
                    {(hasNonWeb || (nonWebViolations && nonWebViolations.length > 0)) && (
                    <div>
                        <label className="block text-xs text-slate-500 mb-2">Documenti Non-Web Verificati</label>
                        <div className="flex gap-2 mb-2">
                             <input className="flex-1 bg-slate-800 border-slate-600 text-white p-2 rounded text-sm" value={newDocUrl} onChange={e=>setNewDocUrl(e.target.value)} placeholder="Nome file o URL..." onKeyDown={e => e.key === 'Enter' && addDoc()} />
                             <button onClick={addDoc} className="px-3 bg-indigo-600 text-white rounded text-sm">+</button>
                        </div>
                        <ul className="space-y-1">
                            {(formData.documentsVerified || []).map((d, i) => (
                                <li key={i} className="flex justify-between items-center bg-slate-800 px-3 py-1 rounded text-sm text-slate-300">
                                    <span className="truncate">{d}</span>
                                    <button onClick={()=>removeDoc(i)} className="text-red-400 hover:text-red-300 ml-2">x</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    )}
                </section>

                {/* 4. Matrice */}
                <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-4 mb-4 border-b border-slate-700 pb-2">
                         <h3 className="text-lg font-bold text-slate-300">4. Matrice di Conformità</h3>
                         {(hasNonWeb || (nonWebViolations && nonWebViolations.length > 0)) && (
                         <div className="flex bg-slate-800 rounded p-1">
                             <button onClick={() => setActiveTab('web')} className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'web' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Web</button>
                             <button onClick={() => setActiveTab('non-web')} className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'non-web' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Non Web</button>
                         </div>
                         )}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Criterio WCAG 2.2</th>
                                    <th className="px-4 py-3">Stato</th>
                                    <th className="px-4 py-3 rounded-tr-lg">Note (Interne)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {WCAG_CRITERIA.map(c => {
                                    const matrix = activeTab === 'web' ? formData.wcagMatrix : formData.wcagMatrixNonWeb;
                                    const entry = matrix[c.id] || { status: 'Soddisfatto', note: '' };
                                    const updateEntry = (updates: Partial<WcagStatus>) => {
                                        const field = activeTab === 'web' ? 'wcagMatrix' : 'wcagMatrixNonWeb';
                                        setFormData(prev => ({
                                            ...prev,
                                            [field]: { ...prev[field], [c.id]: { ...entry, ...updates } }
                                        }));
                                    };

                                    return (
                                        <tr key={c.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-2 font-mono text-xs">
                                                <div className="font-bold text-slate-200">{c.id} {c.name}</div>
                                                <div className="text-slate-500">Livello {c.level}</div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select 
                                                    value={entry.status} 
                                                    onChange={(e) => updateEntry({ status: e.target.value as any })}
                                                    className={`bg-slate-900 border border-slate-600 rounded text-xs p-1 focus:ring-1 focus:ring-indigo-500 outline-none ${
                                                        entry.status === 'Non Soddisfatto' ? 'text-red-400 border-red-900/50' : 
                                                        entry.status === 'Non Applicabile' ? 'text-slate-400' : 'text-emerald-400'
                                                    }`}
                                                >
                                                    <option value="Soddisfatto">Soddisfatto</option>
                                                    <option value="Non Soddisfatto">Non Soddisfatto</option>
                                                    <option value="Non Applicabile">Non Applicabile</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-transparent border-b border-slate-700 focus:border-indigo-500 outline-none text-xs text-slate-400 focus:text-slate-200"
                                                    value={entry.note}
                                                    onChange={(e) => updateEntry({ note: e.target.value })}
                                                    placeholder="Note opzionali..."
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

// --- Accessibility Statement Editor ---

interface AccessibilityStatementViewProps {
    dirName: string;
    initialData?: StatementData;
    evaluationData?: EvaluationData;
    webViolations: Violation[];
    nonWebViolations: Violation[];
    onSave: (data: StatementData) => void;
}

export const AccessibilityStatementView: React.FC<AccessibilityStatementViewProps> = ({ 
    dirName, 
    initialData, 
    evaluationData, 
    webViolations, 
    nonWebViolations, 
    onSave 
}) => {
    // State for form data
    const [formData, setFormData] = useState<StatementData>({
        siteName: '',
        siteUrl: '',
        date: new Date().toISOString().split('T')[0],
        complianceStatus: 'PARZIALMENTE CONFORME',
        nonComplianceReason: '',
        disproportionateBurden: '',
        contentExcluded: '',
        improvementPlan: '',
        feedbackEmail: '',
        publishDate: '',
        cmsUsed: '',
        usabilityTests: ''
    });
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        // Initialize logic
        if (initialData) {
            setFormData(initialData);
        } else {
             // Defaults based on other data
             const status = (webViolations.length === 0 && nonWebViolations.length === 0) ? 'CONFORME' : 'PARZIALMENTE CONFORME';
             
             // Generate reasons from violations
             const reasons = [...webViolations, ...nonWebViolations].map(v => 
                `• ${v.criterion} (${v.count} occorrenze)`
             ).join('\n');

             setFormData({
                siteName: evaluationData?.siteName || dirName,
                siteUrl: evaluationData?.siteUrl || '',
                date: new Date().toISOString().split('T')[0],
                complianceStatus: status,
                nonComplianceReason: reasons,
                disproportionateBurden: '',
                contentExcluded: '',
                improvementPlan: '',
                feedbackEmail: '',
                publishDate: new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
                cmsUsed: '',
                usabilityTests: ''
             });
        }
    }, [initialData, evaluationData, webViolations, nonWebViolations, dirName]);

    const handleSave = () => {
        onSave(formData);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };
    
    const handleDownloadPdf = () => {
        const blob = generateStatementPdfBlob(formData);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Dichiarazione_Accessibilita_${formData.siteName.replace(/\s+/g,'_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full max-h-[800px] relative">
            {showToast && <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg z-50">Salvataggio OK!</div>}
            
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-xl font-bold text-white">Editor Dichiarazione Accessibilità</h2>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500">Salva</button>
                    <button onClick={handleDownloadPdf} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500">PDF</button>
                </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Form fields */}
                <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">Dati Principali</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* siteName, siteUrl, date, feedbackEmail, publishDate, cmsUsed, usabilityTests */}
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Nome Sito</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.siteName} onChange={e=>setFormData({...formData, siteName: e.target.value})} />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">URL Sito</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.siteUrl} onChange={e=>setFormData({...formData, siteUrl: e.target.value})} />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Data Dichiarazione</label>
                             <input type="date" className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Email per Feedback</label>
                             <input type="email" className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.feedbackEmail} onChange={e=>setFormData({...formData, feedbackEmail: e.target.value})} placeholder="accessibilita@dominio.it" />
                         </div>
                          <div>
                             <label className="block text-xs text-slate-500 mb-1">Data Pubblicazione Sito (Mese Anno)</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.publishDate} onChange={e=>setFormData({...formData, publishDate: e.target.value})} />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">CMS Utilizzato</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.cmsUsed} onChange={e=>setFormData({...formData, cmsUsed: e.target.value})} />
                         </div>
                    </div>
                </section>

                <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                    <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">Conformità e Problematiche</h3>
                    <div className="space-y-4">
                        <div>
                             <label className="block text-xs text-slate-500 mb-1">Stato Conformità</label>
                             <select 
                                className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" 
                                value={formData.complianceStatus} 
                                onChange={e=>setFormData({...formData, complianceStatus: e.target.value as any})}
                             >
                                <option value="CONFORME">Conforme (Pienamente)</option>
                                <option value="PARZIALMENTE CONFORME">Parzialmente Conforme</option>
                                <option value="NON CONFORME">Non Conforme</option>
                             </select>
                        </div>
                        <div>
                             <label className="block text-xs text-slate-500 mb-1">Motivazioni Non Conformità (Violazioni)</label>
                             <textarea className="w-full h-32 bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.nonComplianceReason} onChange={e=>setFormData({...formData, nonComplianceReason: e.target.value})} />
                        </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Contenuti Esclusi (Onere Sproporzionato)</label>
                             <textarea className="w-full h-24 bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.disproportionateBurden} onChange={e=>setFormData({...formData, disproportionateBurden: e.target.value})} placeholder="Descrivere eventuali casi di onere sproporzionato..." />
                        </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Contenuti Esclusi (Non rientranti nella direttiva)</label>
                             <textarea className="w-full h-24 bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.contentExcluded} onChange={e=>setFormData({...formData, contentExcluded: e.target.value})} placeholder="Es. Mappe online, contenuti di terze parti..." />
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
                     <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">Miglioramento e Test</h3>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Piano di Miglioramento</label>
                             <textarea className="w-full h-24 bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.improvementPlan} onChange={e=>setFormData({...formData, improvementPlan: e.target.value})} placeholder="Descrivere gli interventi previsti..." />
                         </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Test di Usabilità Effettuati</label>
                             <input className="w-full bg-slate-800 border-slate-600 text-white p-2 rounded" value={formData.usabilityTests} onChange={e=>setFormData({...formData, usabilityTests: e.target.value})} placeholder="Es. Test con screen reader su 10 utenti..." />
                         </div>
                     </div>
                </section>
            </div>
        </div>
    );
};

// --- Cost Benefit View ---

interface CostBenefitViewProps {
    dirName: string;
    initialText?: string;
    onSave: (text: string) => void;
}

export const CostBenefitView: React.FC<CostBenefitViewProps> = ({ dirName, initialText, onSave }) => {
    const [text, setText] = useState(initialText || '');
    const [showToast, setShowToast] = useState(false);

    const handleSave = () => {
        onSave(text);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="animate-fade-in bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full relative">
             {showToast && <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg z-50">Salvataggio OK!</div>}
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Stima Costi e Benefici / Piano Remediation</h2>
                <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500">Salva</button>
            </div>
            <div className="p-6 flex-1 flex flex-col">
                <p className="text-slate-400 text-sm mb-4">
                    Inserisci qui la stima dei costi per gli interventi di adeguamento e il piano di lavoro previsto.
                    Questo testo verrà esportato nel PDF.
                </p>
                <textarea
                    className="flex-1 w-full bg-slate-900 border border-slate-700 rounded p-4 text-slate-200 focus:border-indigo-500 outline-none resize-none font-mono text-sm leading-relaxed"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Dettaglio interventi..."
                />
            </div>
        </div>
    );
};
