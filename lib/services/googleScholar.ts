import axios from 'axios';
import { cache } from '@/lib/utils/cache';

export interface GoogleScholarPaper {
  title: string;
  authors: string[];
  venue?: string;
  year?: string;
  abstract?: string;
  url: string;
  citations?: number;
}

export interface GoogleScholarSearchResult {
  papers: GoogleScholarPaper[];
  total: number;
}

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Search Google Scholar for papers related to a query
 * Uses web scraping since Google Scholar doesn't have a public API
 */
export async function searchGoogleScholar(
  query: string,
  maxResults: number = 10
): Promise<GoogleScholarSearchResult> {
  // Check cache first
  const cacheKey = `googlescholar:${query}:${maxResults}`;
  const cached = cache.get<GoogleScholarSearchResult>('googleScholar', cacheKey);
  if (cached) {
    console.log('Using cached Google Scholar results');
    return cached;
  }

  // Rate limiting: ensure minimum time between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();

  try {
    // Google Scholar search URL
    const searchUrl = 'https://scholar.google.com/scholar';
    const params = new URLSearchParams({
      q: query,
      hl: 'en',
      num: Math.min(maxResults, 20).toString(), // Google Scholar max is 20 per page
    });

    const response = await axios.get(`${searchUrl}?${params.toString()}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 8000,
    });

    // Parse HTML response
    const papers = parseGoogleScholarHTML(response.data, maxResults);

    const result = {
      papers,
      total: papers.length,
    };

    // Cache the result
    cache.set('googleScholar', cacheKey, result);

    return result;
  } catch (error: any) {
    console.error('Google Scholar search error:', error.message || error);
    return { papers: [], total: 0 };
  }
}

/**
 * Parse Google Scholar HTML to extract paper information
 */
function parseGoogleScholarHTML(html: string, maxResults: number): GoogleScholarPaper[] {
  const papers: GoogleScholarPaper[] = [];

  // Match paper entries in Google Scholar HTML
  // Google Scholar structure: <div class="gs_ri"> contains paper info
  const paperRegex = /<div class="gs_ri">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  let count = 0;

  while ((match = paperRegex.exec(html)) !== null && count < maxResults) {
    const paperHtml = match[1];

    // Extract title and URL
    const titleMatch = paperHtml.match(/<h3[^>]*class="gs_rt"[^>]*><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/h3>/);
    if (!titleMatch) continue;

    const title = cleanHtmlText(titleMatch[2]);
    const url = titleMatch[1].startsWith('http') ? titleMatch[1] : `https://scholar.google.com${titleMatch[1]}`;

    // Extract authors, venue, year
    const authorsMatch = paperHtml.match(/<div class="gs_a">([\s\S]*?)<\/div>/);
    let authors: string[] = [];
    let venue = '';
    let year = '';

    if (authorsMatch) {
      const authorsText = cleanHtmlText(authorsMatch[1]);
      // Format: "Author1, Author2 - Journal, Year - Publisher"
      const parts = authorsText.split(' - ');
      if (parts.length > 0) {
        authors = parts[0].split(',').map((a) => a.trim()).filter(Boolean);
      }
      if (parts.length > 1) {
        venue = parts[1].trim();
      }
      if (parts.length > 2) {
        const yearMatch = parts[2].match(/(\d{4})/);
        if (yearMatch) {
          year = yearMatch[1];
        }
      }
    }

    // Extract snippet (abstract preview)
    const snippetMatch = paperHtml.match(/<div class="gs_rs">([\s\S]*?)<\/div>/);
    const abstract = snippetMatch ? cleanHtmlText(snippetMatch[1]) : undefined;

    // Extract citation count
    const citationMatch = paperHtml.match(/Cited by (\d+)/);
    const citations = citationMatch ? parseInt(citationMatch[1]) : undefined;

    papers.push({
      title,
      authors,
      venue,
      year,
      abstract,
      url,
      citations,
    });

    count++;
  }

  return papers;
}

function cleanHtmlText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

