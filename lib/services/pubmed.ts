import axios from 'axios';
import { cache } from '@/lib/utils/cache';

export interface PubMedPaper {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  abstract?: string;
  doi?: string;
  url: string;
}

export interface PubMedSearchResult {
  papers: PubMedPaper[];
  total: number;
}

/**
 * Search PubMed for papers related to a query
 * Supports caching to reduce API calls
 */
export async function searchPubMed(
  query: string,
  maxResults: number = 10
): Promise<PubMedSearchResult> {
  // Check cache first
  const cacheKey = `pubmed:${query}:${maxResults}`;
  const cached = cache.get<PubMedSearchResult>('pubmed', cacheKey);
  if (cached) {
    console.log('Using cached PubMed results');
    return cached;
  }

  try {
    // PubMed E-utilities API
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`;
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: maxResults.toString(),
      retmode: 'json',
      sort: 'relevance',
    });

    const searchResponse = await axios.get(`${searchUrl}?${searchParams.toString()}`);
    const pmids = searchResponse.data.esearchresult?.idlist || [];

    if (pmids.length === 0) {
      return { papers: [], total: 0 };
    }

    // Fetch details for each paper
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`;
    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml',
    });

    const fetchResponse = await axios.get(`${fetchUrl}?${fetchParams.toString()}`, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'text',
    });

    // Parse XML response (simplified - in production, use proper XML parser)
    const papers = parsePubMedXML(fetchResponse.data, pmids);

    const result = {
      papers,
      total: parseInt(searchResponse.data.esearchresult?.count || '0'),
    };

    // Cache the result
    cache.set('pubmed', cacheKey, result);

    return result;
  } catch (error) {
    console.error('PubMed search error:', error);
    return { papers: [], total: 0 };
  }
}

function parsePubMedXML(xml: string, pmids: string[]): PubMedPaper[] {
  const papers: PubMedPaper[] = [];
  
  // Simple regex-based parsing (in production, use proper XML parser like xml2js)
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match;
  let index = 0;

  while ((match = articleRegex.exec(xml)) !== null && index < pmids.length) {
    const articleXml = match[1];
    const pmid = pmids[index];

    // Extract title
    const titleMatch = articleXml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/);
    const title = titleMatch ? cleanXmlText(titleMatch[1]) : 'No title';

    // Extract abstract
    const abstractMatch = articleXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
    const abstract = abstractMatch ? cleanXmlText(abstractMatch[1]) : undefined;

    // Extract authors
    const authors: string[] = [];
    const authorRegex = /<Author[^>]*>[\s\S]*?<LastName>([\s\S]*?)<\/LastName>[\s\S]*?<ForeName>([\s\S]*?)<\/ForeName>[\s\S]*?<\/Author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(articleXml)) !== null) {
      authors.push(`${authorMatch[2]} ${authorMatch[1]}`);
    }

    // Extract journal
    const journalMatch = articleXml.match(/<Title>([\s\S]*?)<\/Title>/);
    const journal = journalMatch ? cleanXmlText(journalMatch[1]) : 'Unknown journal';

    // Extract year
    const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const year = yearMatch ? yearMatch[1] : 'Unknown';

    // Extract DOI
    const doiMatch = articleXml.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/);
    const doi = doiMatch ? cleanXmlText(doiMatch[1]) : undefined;

    papers.push({
      pmid,
      title,
      authors,
      journal,
      year,
      abstract,
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    });

    index++;
  }

  return papers;
}

function cleanXmlText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

