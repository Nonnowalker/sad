import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import type { Violation, PageSample, AgidCategory } from './types.ts';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

let cachedAi: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAi;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.code;
      const isRetryable = status === 429 || (typeof status === 'number' && status >= 500 && status < 600);
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      const delayMs = 500 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function sortViolations(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) => {
    const aNum = a.criterion.replace('WCAG ', '').split('.').map(Number);
    const bNum = b.criterion.replace('WCAG ', '').split('.').map(Number);
    for (let i = 0; i < Math.max(aNum.length, bNum.length); i++) {
      if ((aNum[i] || 0) !== (bNum[i] || 0)) return (aNum[i] || 0) - (bNum[i] || 0);
    }
    return 0;
  });
}

function generateHeuristicPages(baseUrl: string): PageSample[] {
  const cleanBase = baseUrl.replace(/\/$/, '');
  return [
    { id: crypto.randomUUID(), name: 'Home Page', url: baseUrl, category: 'home', description: 'Pagina principale' },
    { id: crypto.randomUUID(), name: 'Chi Siamo', url: `${cleanBase}/chi-siamo`, category: 'document', description: 'Pagina istituzionale' },
    { id: crypto.randomUUID(), name: 'Contatti', url: `${cleanBase}/contatti`, category: 'contact', description: 'Pagina recapiti' },
    { id: crypto.randomUUID(), name: 'Privacy Policy', url: `${cleanBase}/privacy-policy`, category: 'legal', description: 'Pagina legale obbligatoria' },
    { id: crypto.randomUUID(), name: 'Login', url: `${cleanBase}/login`, category: 'login', description: 'Accesso area riservata' },
    { id: crypto.randomUUID(), name: 'Mappa Sito', url: `${cleanBase}/sitemap`, category: 'sitemap', description: 'Elenco contenuti' },
  ];
}

function extractLocsFromXml(xmlText: string): string[] {
  const locs: string[] = [];
  const regex = /<loc[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xmlText)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http')) {
      locs.push(url);
    }
  }
  return locs;
}

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const candidates = [
    `${cleanBase}/sitemap.xml`,
    `${cleanBase}/wp-sitemap.xml`,
    `${cleanBase}/sitemap_index.xml`,
    `${cleanBase}/sitemap.php`,
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WCAG-Audit-Bot/1.0)',
          Accept: 'application/xml, text/xml, */*',
        },
      });
      if (!response.ok) continue;

      const text = await response.text();
      if (!text.includes('<loc')) continue;

      const sitemapMatch = text.match(/<sitemap[\s>][\s\S]*?<loc[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/i);
      if (sitemapMatch?.[1]) {
        const subUrl = sitemapMatch[1].trim();
        if (subUrl.startsWith('http')) {
          const subResponse = await fetch(subUrl, {
            signal: AbortSignal.timeout(5000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; WCAG-Audit-Bot/1.0)',
              Accept: 'application/xml, text/xml, */*',
            },
          });
          if (subResponse.ok) {
            const subText = await subResponse.text();
            const subUrls = extractLocsFromXml(subText).slice(0, 50);
            if (subUrls.length > 0) return subUrls;
          }
        }
      }

      const urls = extractLocsFromXml(text).slice(0, 50);
      if (urls.length > 0) return urls;
    } catch {
      // Ignore individual sitemap fetch errors and try next candidate
    }
  }

  return [];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.post('/api/discover-site', async (req: Request, res: Response) => {
    const rawUrl = typeof req.body?.baseUrl === 'string' ? req.body.baseUrl.trim() : '';
    if (!rawUrl) {
      res.status(400).json({ error: 'URL base mancante.' });
      return;
    }

    const baseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

    try {
      const realUrls = await fetchSitemapUrls(baseUrl);
      const promptContext =
        realUrls.length > 0
          ? `
      HO TROVATO I SEGUENTI URL REALI DALLA SITEMAP DEL SITO. 
      USALI PER COMPILARE IL CAMPIONE. NON INVENTARE URL SE PUOI USARE QUESTI:
      ${realUrls.join('\n')}
      `
          : 'Non ho trovato una sitemap. Usa Google Search o deduci gli URL standard.';

      const prompt = `Analizza il sito web: ${baseUrl}.
    
    ${promptContext}
    
    Il tuo compito è creare un elenco delle pagine principali per un preventivo di audit accessibilità (AgID).
    
    Restituisci un elenco JSON di oggetti con questa struttura:
    [
      { "name": "Nome Pagina", "url": "URL Completo", "description": "Breve descrizione", "category": "categoria_agid" }
    ]

    Le categorie_agid ammesse sono: 'home', 'login', 'sitemap', 'contact', 'legal', 'search', 'process', 'document'.

    Seleziona le pagine più rilevanti (massimo 10-12) coprendo queste categorie se presenti:
    1. Home Page (category: 'home')
    2. Chi Siamo / Azienda (category: 'document')
    3. Contatti (category: 'contact')
    4. Privacy / Termini (category: 'legal')
    5. Login / Area Riservata (category: 'login')
    6. Mappa del sito (category: 'sitemap')
    7. Una pagina di ricerca (category: 'search')
    8. Un esempio di processo (es. checkout/carrello) se e-commerce (category: 'process')
    
    IMPORTANTE: Restituisci SOLO il JSON array valido.
    `;

      const ai = getAiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: realUrls.length === 0 ? { tools: [{ googleSearch: {} }] } : undefined,
        })
      );

      let jsonText = response.text?.trim();
      if (!jsonText) {
        res.json({ pages: generateHeuristicPages(baseUrl) });
        return;
      }

      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(json)?\n?/i, '').replace(/\n?```$/, '');
      }

      let rawPages: unknown = [];
      try {
        rawPages = JSON.parse(jsonText);
      } catch {
        res.json({ pages: generateHeuristicPages(baseUrl) });
        return;
      }

      if (Array.isArray(rawPages) && rawPages.length > 0) {
        const validPages: PageSample[] = rawPages.map((p: any) => {
          let cat: AgidCategory = 'document';
          const rawCat = String(p?.category || '').toLowerCase();
          const rawName = String(p?.name || '').toLowerCase();

          if (rawCat === 'home' || rawName.includes('home')) cat = 'home';
          else if (rawCat === 'login' || rawName.includes('login') || rawName.includes('accedi')) cat = 'login';
          else if (rawCat === 'contact' || rawName.includes('contat')) cat = 'contact';
          else if (rawCat === 'legal' || rawName.includes('privacy') || rawName.includes('condizioni')) cat = 'legal';
          else if (rawCat === 'sitemap' || rawName.includes('mappa')) cat = 'sitemap';
          else if (rawCat === 'search' || rawName.includes('cerca') || rawName.includes('risultati')) cat = 'search';
          else if (rawCat === 'process' || rawName.includes('cassa') || rawName.includes('checkout')) cat = 'process';

          const rawPageUrl = typeof p?.url === 'string' ? p.url : '';
          return {
            id: crypto.randomUUID(),
            name: typeof p?.name === 'string' && p.name ? p.name : 'Pagina',
            url: rawPageUrl.startsWith('http')
              ? rawPageUrl
              : `${baseUrl}/${rawPageUrl}`.replace(/([^:]\/)\/+/g, '$1'),
            category: cat,
            description: typeof p?.description === 'string' && p.description ? p.description : 'Pagina rilevata',
          };
        });

        if (!validPages.some((p) => p.category === 'home')) {
          validPages.unshift({
            id: crypto.randomUUID(),
            name: 'Home Page',
            url: baseUrl,
            category: 'home',
            description: 'Home page',
          });
        }

        res.json({ pages: validPages });
        return;
      }

      res.json({ pages: generateHeuristicPages(baseUrl) });
    } catch (error) {
      console.error('Discovery error:', error);
      res.json({ pages: generateHeuristicPages(baseUrl) });
    }
  });

  app.post('/api/analyze-report', async (req: Request, res: Response) => {
    const filePart = req.body?.filePart;
    const reportType: 'web' | 'non-web' = req.body?.reportType === 'non-web' ? 'non-web' : 'web';

    if (!filePart || (typeof filePart.text !== 'string' && !filePart.inlineData?.data)) {
      res.status(400).json({ error: 'Contenuto del file mancante o non valido.' });
      return;
    }

    try {
      const ai = getAiClient();
      const textPart = {
        text: `Analizza il report di accessibilità ed estrai un elenco JSON delle violazioni WCAG.
      Per ogni criterio (es. 'WCAG 1.1.1'), conta il numero TOTALE di violazioni riportate nel documento sommando tutte le occorrenze.
      Restituisci SOLO un array JSON: [{"criterion": "WCAG x.y.z", "count": 12}, ...]`,
      };

      const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            criterion: { type: Type.STRING },
            count: { type: Type.INTEGER },
          },
          required: ['criterion', 'count'],
        },
      };

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: { parts: [filePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        })
      );

      const jsonText = response.text?.trim();
      if (!jsonText) {
        res.json({ violations: [], reportType });
        return;
      }

      const parsed = JSON.parse(jsonText);
      const violations: Violation[] = Array.isArray(parsed) ? sortViolations(parsed) : [];

      res.json({ violations, reportType });
    } catch (error: any) {
      console.error('Analysis error:', error);
      const status = typeof error?.status === 'number' && error.status >= 400 && error.status < 600 ? error.status : 500;
      res.status(status).json({
        error: error instanceof Error ? error.message : "Errore durante l'analisi del file.",
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
