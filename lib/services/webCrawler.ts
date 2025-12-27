import axios from 'axios';
import { cache } from '@/lib/utils/cache';

export interface WebContent {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
}

export interface WebSearchResult {
  contents: WebContent[];
  total: number;
}

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests

/**
 * Search health-related websites for information
 * Uses web scraping from trusted health sources
 */
export async function searchWebContent(
  query: string,
  maxResults: number = 10
): Promise<WebSearchResult> {
  // Check cache first
  const cacheKey = `web:${query}:${maxResults}`;
  const cached = cache.get<WebSearchResult>('webCrawler', cacheKey);
  if (cached) {
    console.log('Using cached web content results');
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
    // Search multiple trusted health sources
    const sources = [
      { name: 'CDC', url: 'https://www.cdc.gov', searchPath: '/search.html' },
      { name: 'NIH', url: 'https://www.nih.gov', searchPath: '/search' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org', searchPath: '/search/results' },
      { name: 'WebMD', url: 'https://www.webmd.com', searchPath: '/search' },
    ];

    const allContents: WebContent[] = [];

    // Search each source (with delays between)
    for (const source of sources.slice(0, 2)) {
      // Limit to 2 sources to avoid too many requests
      try {
        const searchUrl = `${source.url}${source.searchPath}`;
        const params = new URLSearchParams({
          q: query,
        });

        const response = await axios.get(`${searchUrl}?${params.toString()}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 6000,
        });

        // Parse basic content from HTML
        const contents = parseWebContent(response.data, source.name, source.url, query);
        allContents.push(...contents);

        // Small delay between sources
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        // Continue with other sources if one fails
        console.warn(`Failed to search ${source.name}:`, error);
      }
    }

    // Also use DuckDuckGo Instant Answer API as a fallback (no API key needed)
    try {
      const ddgUrl = 'https://api.duckduckgo.com/';
      const ddgParams = new URLSearchParams({
        q: `${query} health`,
        format: 'json',
        no_html: '1',
        skip_disambig: '1',
      });

      const ddgResponse = await axios.get(`${ddgUrl}?${ddgParams.toString()}`, {
        timeout: 5000,
      });

      if (ddgResponse.data.AbstractText) {
        allContents.push({
          title: ddgResponse.data.Heading || query,
          url: ddgResponse.data.AbstractURL || '',
          snippet: ddgResponse.data.AbstractText,
          source: 'DuckDuckGo',
        });
      }
    } catch (error) {
      // DuckDuckGo is optional
    }

    const result = {
      contents: allContents.slice(0, maxResults),
      total: allContents.length,
    };

    // Cache the result
    cache.set('webCrawler', cacheKey, result);

    return result;
  } catch (error: any) {
    console.error('Web crawler error:', error.message || error);
    return { contents: [], total: 0 };
  }
}

/**
 * Parse web content from HTML
 */
function parseWebContent(
  html: string,
  sourceName: string,
  baseUrl: string,
  query: string
): WebContent[] {
  const contents: WebContent[] = [];

  // Try to find article/list items
  // This is a simplified parser - in production, use a proper HTML parser like cheerio
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const matches = Array.from(html.matchAll(linkRegex));

  let count = 0;
  for (const match of matches) {
    if (count >= 5) break; // Limit per source

    const href = match[1];
    const linkText = cleanHtmlText(match[2]);

    // Filter for relevant links
    if (
      linkText.toLowerCase().includes(query.toLowerCase()) ||
      href.includes(query.toLowerCase().split(' ')[0])
    ) {
      const url = href.startsWith('http') ? href : `${baseUrl}${href}`;

      // Try to find nearby snippet
      const snippetMatch = html.substring(match.index || 0, (match.index || 0) + 500).match(
        /<p[^>]*>([\s\S]{0,200})<\/p>/
      );
      const snippet = snippetMatch ? cleanHtmlText(snippetMatch[1]) : linkText;

      contents.push({
        title: linkText || 'Untitled',
        url,
        snippet: snippet.substring(0, 200),
        source: sourceName,
      });

      count++;
    }
  }

  return contents;
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

