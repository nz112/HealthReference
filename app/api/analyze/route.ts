import { NextRequest, NextResponse } from 'next/server';
import { searchPubMed } from '@/lib/services/pubmed';
import { searchGoogleScholar } from '@/lib/services/googleScholar';
import { searchWebContent } from '@/lib/services/webCrawler';
import { analyzeHealthPapers } from '@/lib/services/aiService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { condition, includeBudget = false } = body;

    if (!condition || typeof condition !== 'string') {
      return NextResponse.json(
        { error: 'Condition is required' },
        { status: 400 }
      );
    }

    // Detect if condition includes a cause/context
    const conditionParts = condition.toLowerCase().split(/\s+(?:after|from|due to|caused by|following)\s+/i);
    const hasCause = conditionParts.length > 1;
    const baseCondition = hasCause ? conditionParts[0].trim() : condition;
    const cause = hasCause ? conditionParts.slice(1).join(' ').trim() : null;

    // Build search queries - include both specific cause+condition and general condition
    let pubmedQuery: string;
    let scholarQuery: string;
    let webQuery: string;

    if (hasCause) {
      // Search for specific cause+condition AND general condition, but prioritize the specific cause
      pubmedQuery = `${condition} OR ${baseCondition} health benefits risks foods activities`;
      scholarQuery = `${condition} OR ${baseCondition} health nutrition exercise`;
      webQuery = `${condition} OR ${baseCondition} health benefits risks`;
    } else {
      pubmedQuery = `${condition} health benefits risks foods activities`;
      scholarQuery = `${condition} health nutrition exercise`;
      webQuery = `${condition} health benefits risks`;
    }

    // Increase results for better coverage, especially for specific cause queries
    const resultCount = hasCause ? 12 : 8;
    const [pubmedResults, googleScholarResults, webResults] = await Promise.all([
      searchPubMed(pubmedQuery, resultCount),
      searchGoogleScholar(scholarQuery, resultCount),
      searchWebContent(webQuery, resultCount),
    ]);

    // Analyze all sources with AI
    const analysis = await analyzeHealthPapers(
      condition,
      pubmedResults.papers,
      [], // No Semantic Scholar papers
      googleScholarResults.papers,
      webResults.contents,
      includeBudget
    );

    return NextResponse.json({
      success: true,
      analysis,
      searchStats: {
        pubmed: pubmedResults.total,
        googleScholar: googleScholarResults.total,
        web: webResults.total,
        analyzed: pubmedResults.papers.length + googleScholarResults.papers.length + webResults.contents.length,
      },
    });
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze condition', details: String(error) },
      { status: 500 }
    );
  }
}

