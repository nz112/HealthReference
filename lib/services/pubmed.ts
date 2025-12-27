import axios from 'axios';
import { cache } from '@/lib/utils/cache';

export interface PubMedPaper {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  abstract?: string;
  methods?: string; // Methods section content
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
    const papers = await parsePubMedXML(fetchResponse.data, pmids);

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

async function parsePubMedXML(xml: string, pmids: string[]): Promise<PubMedPaper[]> {
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

    // Try to extract Methods section
    let methods: string | undefined = undefined;
    
    // Check if there's a PMC ID (free full text available)
    const pmcMatch = articleXml.match(/<ArticleId IdType="pmc">([\s\S]*?)<\/ArticleId>/);
    const pmcId = pmcMatch ? cleanXmlText(pmcMatch[1]) : undefined;
    
    // Try to extract methods-related content from abstract
    if (abstract) {
      const methodsInAbstract = extractMethodsFromAbstract(abstract);
      if (methodsInAbstract) {
        methods = methodsInAbstract;
      }
    }
    
    // If we have PMC ID, try to fetch full Methods section (async, non-blocking)
    if (pmcId) {
      fetchMethodsFromPMC(pmcId).then(pmcMethods => {
        if (pmcMethods) {
          // Update methods if found (async, may complete after paper is added)
          const paperIndex = papers.findIndex(p => p.pmid === pmid);
          if (paperIndex >= 0) {
            papers[paperIndex].methods = pmcMethods;
          }
        }
      }).catch(() => {
        // Silently fail - not all papers have accessible full text
      });
    }

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
      methods,
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

/**
 * Fetch Methods section from PubMed Central (PMC) if available
 */
async function fetchMethodsFromPMC(pmcId: string): Promise<string | undefined> {
  try {
    // PMC API endpoint for full text
    const pmcUrl = `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/pmc.fcgi?id=${pmcId}`;
    const response = await axios.get(pmcUrl, { timeout: 5000 });
    
    // If we get XML, try to parse Methods section
    // This is a simplified approach - full PMC XML parsing would be more complex
    const methodsMatch = response.data.match(/<sec sec-type="methods">([\s\S]*?)<\/sec>/i);
    if (methodsMatch) {
      return cleanXmlText(methodsMatch[1]).substring(0, 2000); // Limit to 2000 chars
    }
    
    // Alternative: try to find Methods in any section
    const allMethodsMatches = response.data.match(/<sec[^>]*>[\s\S]*?<title>Methods?<\/title>([\s\S]*?)<\/sec>/i);
    if (allMethodsMatches) {
      return cleanXmlText(allMethodsMatches[1]).substring(0, 2000);
    }
  } catch (error) {
    // Silently fail - not all papers are accessible
  }
  return undefined;
}

/**
 * Try to extract Methods-related content from abstract
 */
function extractMethodsFromAbstract(abstract: string): string | undefined {
  // Look for methods-related keywords in abstract
  const methodsKeywords = [
    'methods:', 'method:', 'intervention:', 'protocol:', 'procedure:',
    'participants were', 'subjects were', 'patients were', 'exercise protocol',
    'training program', 'intervention consisted', 'exercise intervention'
  ];
  
  const lowerAbstract = abstract.toLowerCase();
  for (const keyword of methodsKeywords) {
    if (lowerAbstract.includes(keyword)) {
      // Extract sentence or paragraph containing the keyword
      const keywordIndex = lowerAbstract.indexOf(keyword);
      const start = Math.max(0, keywordIndex - 100);
      const end = Math.min(abstract.length, keywordIndex + 500);
      return abstract.substring(start, end).trim();
    }
  }
  
  return undefined;
}

