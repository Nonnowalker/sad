
export interface Violation {
  criterion: string;
  count: number;
  affectedFiles?: { fileName: string; count: number }[]; // List of files contributing to this violation
}

export interface AnalysisResult {
  id: string; // Unique ID for tracking background updates
  fileName: string;
  violations: Violation[];
  reportType: 'web' | 'non-web'; // Distinguishes between Web content and Documents (PDF/Adobe)
  status: 'success' | 'error' | 'pending';
  error?: string;
  // New metadata fields
  timestamp: number;
  fileSize: number; 
  // Content storage for ZIP export
  originalFileContent?: string; // Base64 or plain text
  mimeType?: string;
}

export interface AuditMedia {
  id: string;
  type: 'image' | 'audio' | 'video';
  fileName: string;
  mimeType: string;
  base64Data: string; // Stored as base64
  caption: string;
  description: string;
  timestamp: number;
}

export interface WcagStatus {
  status: 'Soddisfatto' | 'Non Soddisfatto' | 'Non Applicabile';
  note: string;
}

export interface EvaluationData {
  siteName: string;
  siteUrl: string;
  date: string;
  responsible: string;
  productDescription: string;
  toolsUsed: string; 
  pagesVerified: string[];
  documentsVerified: string[];
  wcagMatrix: { [criterion: string]: WcagStatus };
  wcagMatrixNonWeb: { [criterion: string]: WcagStatus };
}

export interface StatementData {
  siteName: string;
  siteUrl: string;
  date: string;
  complianceStatus: 'CONFORME' | 'PARZIALMENTE CONFORME' | 'NON CONFORME';
  nonComplianceReason: string; // generated from violations
  disproportionateBurden: string;
  contentExcluded: string;
  improvementPlan: string;
  feedbackEmail: string;
  publishDate: string; // e.g., "Ottobre 2024"
  cmsUsed: string;
  usabilityTests: string;
}

// AgID Categories for 5.1.3.5
export type AgidCategory = 'home' | 'login' | 'sitemap' | 'contact' | 'legal' | 'search' | 'process' | 'document' | 'statement' | 'error' | 'random';

export interface PageSample {
  id: string;
  name: string; // e.g., "Chi Siamo"
  url: string;
  category: AgidCategory; // Replaces 'type'
  description: string; // for the PDF table
}

export interface QuoteData {
  clientName: string;
  projectName: string;
  baseUrl: string;
  date: string;
  clientType: 'PA' | 'Private'; // Public Administration or Private
  monitoringType: 'depth' | 'simplified'; // Approfondito vs Semplice
  
  // Sample
  pages: PageSample[];
  
  // Tasks
  includeScreenReader: boolean; // 8 hours fixed
  includeDocumentation: boolean; // 8 hours fixed (Report + Declaration)
  
  // Economics
  hourlyRate: number; // 35 default
  deliveryDate: string;
}

export interface AuditDirectory {
  id: string;
  name: string;
  createdAt: number;
  reports: AnalysisResult[];
  
  // Document Data
  quoteData?: QuoteData; // NEW: Quote/Preventivo
  evaluationData?: EvaluationData; 
  statementData?: StatementData; // Replaces simple text
  statementText?: string; // Legacy fallback
  remediationText?: string;

  // Media Evidence
  mediaFiles?: AuditMedia[];
}

export type ComplianceStatus = 'Non Conforme' | 'Parzialmente Conforme' | 'Conforme';
