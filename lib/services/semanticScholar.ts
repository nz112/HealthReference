import axios from 'axios';
import { cache } from '@/lib/utils/cache';

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: Array<{ name: string }>;
  venue?: string;
  year?: number;
  abstract?: string;
  url: string;
  doi?: string;
  citationCount?: number;
}

export interface SemanticScholarSearchResult {
  papers: SemanticScholarPaper[];
  total: number;
}

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests (5 requests/second max)

/**
 * Search Semantic Scholar for papers related to a query
 * Supports caching and API key for higher rate limits
 */
export async function searchSemanticScholar(
  query: string,
  maxResults: number = 10
): Promise<SemanticScholarSearchResult> {
  // Check cache first
  const cacheKey = `semantic:${query}:${maxResults}`;
  const cached = cache.get<SemanticScholarSearchResult>('semanticScholar', cacheKey);
  if (cached) {
    console.log('Using cached Semantic Scholar results');
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
    const apiUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    
    const params = {
      query,
      limit: maxResults,
      fields: 'title,authors,venue,year,abstract,url,doi,citationCount',
    };

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await axios.get(apiUrl, { params, headers });

    const papers: SemanticScholarPaper[] = (response.data.data || []).map((paper: any) => ({
      paperId: paper.paperId,
      title: paper.title || 'No title',
      authors: paper.authors || [],
      venue: paper.venue,
      year: paper.year,
      abstract: paper.abstract,
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      doi: paper.doi,
      citationCount: paper.citationCount,
    }));

    const result = {
      papers,
      total: response.data.total || papers.length,
    };

    // Cache the result
    cache.set('semanticScholar', cacheKey, result);

    return result;
  } catch (error: any) {
    // Handle rate limiting gracefully
    if (error.response?.status === 429) {
      console.warn(
        'Semantic Scholar rate limit reached. ' +
        (process.env.SEMANTIC_SCHOLAR_API_KEY
          ? 'Consider upgrading your API key for higher limits.'
          : 'Get a free API key at https://www.semanticscholar.org/product/api#api-key-form for higher rate limits.')
      );
    } else {
      console.error('Semantic Scholar search error:', error.message || error);
    }
    return { papers: [], total: 0 };
  }
}

