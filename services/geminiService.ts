import { Violation, PageSample } from '../types';

// --- ADOBE ACROBAT MAPPING LOGIC ---

const ADOBE_WCAG_MAP: Record<string, string> = {
    'Perms': 'WCAG 4.1.2', // Accessibility Permission Flag
    'ImageOnlyPDF': 'WCAG 1.1.1',
    'TaggedPDF': 'WCAG 1.3.1',
    'LogicalRO': 'WCAG 1.3.2',
    'PrimeLang': 'WCAG 3.1.1',
    'DocTitle': 'WCAG 2.4.2',
    'Bookmarks': 'WCAG 2.4.5',
    'ColorContrast': 'WCAG 1.4.3',
    'TaggedCont': 'WCAG 1.3.1',
    'TaggedAnnots': 'WCAG 1.3.1',
    'TabOrder': 'WCAG 2.4.3',
    'CharEnc': 'WCAG 1.3.1', // Reliable encoding needed for info
    'Multimedia': 'WCAG 1.2.1',
    'FlickerRate': 'WCAG 2.3.1',
    'Scripts': 'WCAG 2.1.1',
    'TimedResponses': 'WCAG 2.2.1',
    'NavLinks': 'WCAG 2.4.1',
    'TaggedFormFields': 'WCAG 1.3.1',
    'FormFieldNames': 'WCAG 2.4.6',
    'FigAltText': 'WCAG 1.1.1',
    'NestedAltText': 'WCAG 1.1.1',
    'AltTextNoContent': 'WCAG 1.1.1',
    'HiddenAnnot': 'WCAG 1.1.1',
    'OtherAltText': 'WCAG 1.1.1',
    'TableRows': 'WCAG 1.3.1',
    'THTD': 'WCAG 1.3.1',
    'TableHeaders': 'WCAG 1.3.1',
    'RegularTable': 'WCAG 1.3.1',
    'TableSummary': 'WCAG 1.3.1',
    'ListItems': 'WCAG 1.3.1',
    'LblLBody': 'WCAG 1.3.1',
    'Headings': 'WCAG 1.3.1'
};

const sortViolations = (violations: Violation[]): Violation[] => {
    violations.sort((a, b) => {
        const aNum = a.criterion.replace('WCAG ', '').split('.').map(Number);
        const bNum = b.criterion.replace('WCAG ', '').split('.').map(Number);
        for (let i = 0; i < Math.max(aNum.length, bNum.length); i++) {
            if ((aNum[i] || 0) !== (bNum[i] || 0)) return (aNum[i] || 0) - (bNum[i] || 0);
        }
        return 0;
    });
    return violations;
};

const parseAdobeHtmlReport = (htmlContent: string): Violation[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const violationsMap = new Map<string, number>();

    // Check if it's really an Adobe report
    const title = doc.querySelector('title')?.textContent || '';
    if (!title.includes('Acrobat') && !doc.body.textContent?.includes('Adobe Acrobat')) {
        return []; // Not an Adobe report, fallback to AI
    }

    const rows = Array.from(doc.querySelectorAll('tr'));

    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) return;

        // Cell 0: Rule Name (contains link with hash), Cell 1: Status
        const statusText = cells[1].textContent?.trim().toLowerCase() || '';

        // Logic: "Non riuscito" = Violation.
        if (statusText === 'non riuscito') {
            const link = cells[0].querySelector('a');
            if (link && link.hash) {
                // Extract Adobe Rule ID (e.g., #DocTitle -> DocTitle)
                const adobeRuleId = link.hash.replace('#', '');
                const wcagCriterion = ADOBE_WCAG_MAP[adobeRuleId];

                if (wcagCriterion) {
                    violationsMap.set(wcagCriterion, (violationsMap.get(wcagCriterion) || 0) + 1);
                } else {
                    console.warn(`Unknown Adobe Rule: ${adobeRuleId}`);
                }
            }
        }
    });

    const violations: Violation[] = Array.from(violationsMap.entries()).map(([criterion, count]) => ({
        criterion,
        count
    }));

    return sortViolations(violations);
};

// --- JSON REPORT PARSING LOGIC ---

interface JsonReportResult {
    wcagNumber: string;
    status: string; // "fail", "pass"
    requirementsFailed?: {
        instances?: any[];
    }[];
}

interface JsonReport {
    results?: JsonReportResult[];
}

const parseJsonAuditReport = (jsonContent: string): Violation[] => {
    let data: JsonReport;
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        return []; // Not valid JSON
    }

    if (!data.results || !Array.isArray(data.results)) {
        return []; // Not the expected format
    }

    const violationsMap = new Map<string, number>();

    data.results.forEach(result => {
        if (result.status === 'fail' && result.wcagNumber) {
            const criterion = `WCAG ${result.wcagNumber}`;
            let count = 0;

            // Calculate exact instances count
            if (result.requirementsFailed && Array.isArray(result.requirementsFailed)) {
                result.requirementsFailed.forEach(req => {
                    if (req.instances && Array.isArray(req.instances)) {
                        count += req.instances.length;
                    }
                });
            }

            // If no instances detail but marked failed, count as at least 1
            if (count === 0) count = 1;

            violationsMap.set(criterion, (violationsMap.get(criterion) || 0) + count);
        }
    });

    const violations: Violation[] = Array.from(violationsMap.entries()).map(([criterion, count]) => ({
        criterion,
        count
    }));

    return sortViolations(violations);
};

/**
 * Converts a File object to a serializable content part for the server endpoint.
 */
async function fileToGenerativePart(file: File) {
  const isText = file.type.startsWith('text/') ||
                 file.type === 'application/json' ||
                 file.type === 'application/xml' ||
                 file.name.match(/\.(html|htm|json|csv|xml|txt|md|svg)$/i);

  if (isText) {
    return new Promise<{ text: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ text: reader.result as string });
        reader.onerror = reject;
        reader.readAsText(file);
    });
  }

  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve({
            inlineData: {
                data: base64Data,
                mimeType: file.type || 'application/pdf'
            },
        });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generates standard pages based on URL patterns if server discovery fails.
 */
const generateHeuristicPages = (baseUrl: string): PageSample[] => {
    const normalized = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const cleanBase = normalized.replace(/\/$/, '');
    return [
        { id: crypto.randomUUID(), name: 'Home Page', url: normalized, category: 'home', description: 'Pagina principale' },
        { id: crypto.randomUUID(), name: 'Chi Siamo', url: `${cleanBase}/chi-siamo`, category: 'document', description: 'Pagina istituzionale' },
        { id: crypto.randomUUID(), name: 'Contatti', url: `${cleanBase}/contatti`, category: 'contact', description: 'Pagina recapiti' },
        { id: crypto.randomUUID(), name: 'Privacy Policy', url: `${cleanBase}/privacy-policy`, category: 'legal', description: 'Pagina legale obbligatoria' },
        { id: crypto.randomUUID(), name: 'Login', url: `${cleanBase}/login`, category: 'login', description: 'Accesso area riservata' },
        { id: crypto.randomUUID(), name: 'Mappa Sito', url: `${cleanBase}/sitemap`, category: 'sitemap', description: 'Elenco contenuti' }
    ];
};

/**
 * Main Discovery Function: calls server-side Hybrid Sitemap Crawler + Gemini Categorization.
 */
export const discoverSiteStructure = async (baseUrl: string): Promise<PageSample[]> => {
  console.log(`Discovering site structure for: ${baseUrl}`);

  try {
    const response = await fetch('/api/discover-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl }),
    });

    if (!response.ok) {
      return generateHeuristicPages(baseUrl);
    }

    const data = await response.json();
    if (Array.isArray(data?.pages) && data.pages.length > 0) {
      return data.pages;
    }

    return generateHeuristicPages(baseUrl);
  } catch (error) {
    console.error("Discovery error:", error);
    return generateHeuristicPages(baseUrl);
  }
};

/**
 * Analyzes an accessibility report file using either Local Adobe Parser, Local JSON Parser, or server-side Gemini API.
 * Returns violations and identifies if the report is web-based or non-web (document).
 */
export const analyzeAccessibilityReport = async (file: File): Promise<{ violations: Violation[], reportType: 'web' | 'non-web' }> => {
  if (!file) throw new Error("No file provided.");

  console.log(`Analyzing file: ${file.name}`);

  // 1. Check if it's an Adobe HTML Report
  if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      try {
          const text = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsText(file);
          });

          if (text.includes('Acrobat') && text.includes('Accessibility Report')) {
              console.log("Detected Adobe Acrobat HTML Report. Using local parser.");
              const adobeViolations = parseAdobeHtmlReport(text);
              return { violations: adobeViolations, reportType: 'non-web' };
          }
      } catch (e) {
          console.warn("Local HTML parsing failed, falling back to Gemini", e);
      }
  }

  // 2. Check if it's a JSON Audit Report (e.g. SortSite structure)
  if (file.type === 'application/json' || file.name.endsWith('.json')) {
      try {
          const text = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsText(file);
          });

          const jsonViolations = parseJsonAuditReport(text);
          if (jsonViolations.length > 0) {
              console.log("Detected Structured JSON Report. Using local parser.");
              // JSON reports usually come from Web Crawlers
              return { violations: jsonViolations, reportType: 'web' };
          }
      } catch (e) {
          console.warn("Local JSON parsing failed/empty, falling back to Gemini", e);
      }
  }

  // 3. Fallback to server-side Gemini for PDF, Images, or other formats
  const inferredType: 'web' | 'non-web' = file.type === 'application/pdf' ? 'non-web' : 'web';

  try {
    const filePart = await fileToGenerativePart(file);
    const response = await fetch('/api/analyze-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePart, reportType: inferredType }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Errore durante l'analisi del file.");
    }

    const violations: Violation[] = Array.isArray(data?.violations) ? sortViolations(data.violations) : [];
    return { violations, reportType: data?.reportType || inferredType };
  } catch (error) {
    console.error("Analysis error:", error);
    throw new Error(error instanceof Error ? error.message : "Errore durante l'analisi del file.");
  }
};
