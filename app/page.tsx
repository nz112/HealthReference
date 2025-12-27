'use client';

import { useState } from 'react';
import { HealthAnalysis, HealthRecommendation, Evidence } from '@/lib/services/aiService';

export default function Home() {
  const [condition, setCondition] = useState('');
  const [includeBudget, setIncludeBudget] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchStats, setSearchStats] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condition.trim()) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          condition: condition.trim(),
          includeBudget,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze condition');
      }

      setAnalysis(data.analysis);
      setSearchStats(data.searchStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const beneficial = analysis?.recommendations.filter((r) => r.category === 'beneficial') || [];
  const risky = analysis?.recommendations.filter((r) => r.category === 'risky') || [];

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#333' }}>
          Health References
        </h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Get evidence-based health recommendations from scientific publications
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="condition">Enter a health condition:</label>
            <input
              id="condition"
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g., diabetes, hypertension, arthritis"
              disabled={loading}
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="budget"
              checked={includeBudget}
              onChange={(e) => setIncludeBudget(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="budget">Include budget-friendly options</label>
          </div>

          <button type="submit" className="button" disabled={loading || !condition.trim()}>
            {loading ? 'Analyzing...' : 'Analyze Condition'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {loading && (
          <div className="loading">
            <p>Searching scientific publications...</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
              This may take a minute
            </p>
          </div>
        )}
      </div>

      {analysis && (
        <>
          {searchStats && (
            <div className="card">
              <h2 style={{ marginBottom: '1rem', color: '#333' }}>Search Results</h2>
              <div className="stats">
                <div className="stat-item">
                  <div className="stat-value">{searchStats.pubmed}</div>
                  <div className="stat-label">PubMed Papers</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{searchStats.semanticScholar}</div>
                  <div className="stat-label">Semantic Scholar Papers</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{searchStats.analyzed}</div>
                  <div className="stat-label">Analyzed</div>
                </div>
              </div>
            </div>
          )}

          {analysis.mechanisms.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: '1rem', color: '#333' }}>Biological Mechanisms</h2>
              <div className="mechanisms-list">
                {analysis.mechanisms.map((mechanism, idx) => (
                  <span key={idx} className="mechanism-tag">
                    {mechanism}
                  </span>
                ))}
              </div>
            </div>
          )}

          {beneficial.length > 0 && (
            <div className="card benefits-section">
              <h2 className="section-title">✓ Beneficial Foods & Activities</h2>
              {beneficial.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </div>
          )}

          {risky.length > 0 && (
            <div className="card risks-section">
              <h2 className="section-title">⚠ Risky Foods & Activities</h2>
              {risky.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </div>
          )}

          {analysis.budgetOptions && analysis.budgetOptions.length > 0 && (
            <div className="card budget-section">
              <h2 className="section-title" style={{ color: '#0369a1' }}>
                💰 Budget-Friendly Options
              </h2>
              {analysis.budgetOptions.map((option, idx) => (
                <div key={idx} className="budget-option">
                  <h4>{option.name}</h4>
                  <p style={{ color: '#555', marginBottom: '0.5rem' }}>{option.description}</p>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    <strong>Source:</strong>{' '}
                    <a
                      href={option.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0369a1', textDecoration: 'underline' }}
                    >
                      {option.source}
                    </a>
                    {option.cost && (
                      <span style={{ marginLeft: '1rem' }}>
                        <strong>Cost:</strong> {option.cost}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: HealthRecommendation }) {
  return (
    <div className={`recommendation-card ${recommendation.category}`}>
      <div className="recommendation-header">
        <span className="recommendation-name">{recommendation.name}</span>
        <span className="recommendation-type">
          {recommendation.type === 'food' ? '🍎 Food' : '🏃 Activity'}
        </span>
      </div>

      {recommendation.mechanism && (
        <div className="recommendation-mechanism">
          <strong>How it works:</strong>{' '}
          {recommendation.mechanismSimplified || recommendation.mechanism}
          {recommendation.mechanismSimplified && recommendation.mechanismSimplified !== recommendation.mechanism && (
            <details style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
              <summary style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                Show technical version
              </summary>
              <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                {recommendation.mechanism}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Activity-specific details - only show if exercise details AND chunks exist */}
      {recommendation.type === 'activity' && 
       ((recommendation.specificExercises && recommendation.specificExercises.length > 0) || recommendation.reps || recommendation.sets || recommendation.duration || recommendation.frequency) &&
       recommendation.evidence?.some(ev => ev.exerciseDetailsChunk) && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
          <strong style={{ color: '#166534', display: 'block', marginBottom: '0.5rem' }}>
            🏃 Exercise Details:
          </strong>
          {recommendation.specificExercises && recommendation.specificExercises.length > 0 && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#166534' }}>Specific exercises:</strong>{' '}
              {recommendation.specificExercises.join(', ')}
            </div>
          )}
          {recommendation.reps && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#166534' }}>Reps:</strong> {recommendation.reps}
            </div>
          )}
          {recommendation.sets && !recommendation.reps && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#166534' }}>Sets:</strong> {recommendation.sets}
            </div>
          )}
          {recommendation.duration && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#166534' }}>Duration:</strong> {recommendation.duration}
            </div>
          )}
          {recommendation.frequency && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#166534' }}>Frequency:</strong> {recommendation.frequency}
            </div>
          )}
          
          {/* Links to paper sections where exercise details are mentioned */}
          {recommendation.evidence && recommendation.evidence.some(ev => ev.sectionForExercises) && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #86efac' }}>
              <strong style={{ color: '#166534', display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                📄 Exercise details from papers:
              </strong>
              {recommendation.evidence
                .filter(ev => ev.sectionForExercises)
                .map((evidence, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <a
                        href={evidence.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#166534', textDecoration: 'underline', fontWeight: 500 }}
                      >
                        {evidence.paperTitle}
                      </a>
                      <span style={{ color: '#166534', marginLeft: '0.5rem' }}>
                        → {evidence.sectionForExercises}
                      </span>
                    </div>
                    {evidence.exerciseDetailsChunk && (
                      <div style={{ 
                        padding: '0.75rem', 
                        background: '#ffffff', 
                        borderRadius: '4px', 
                        border: '1px solid #86efac',
                        fontStyle: 'italic',
                        color: '#166534',
                        lineHeight: '1.5'
                      }}>
                        "{evidence.exerciseDetailsChunk}"
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Food/Supplement-specific details - only show if details AND chunks exist */}
      {recommendation.type === 'food' && 
       (recommendation.dosage || recommendation.servingSize || recommendation.frequencyOfIntake) &&
       recommendation.evidence?.some(ev => ev.dosageDetailsChunk) && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde047' }}>
          <strong style={{ color: '#92400e', display: 'block', marginBottom: '0.5rem' }}>
            🍎 Intake Details:
          </strong>
          {recommendation.dosage && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#92400e' }}>Dosage:</strong> {recommendation.dosage}
            </div>
          )}
          {recommendation.servingSize && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#92400e' }}>Serving size:</strong> {recommendation.servingSize}
            </div>
          )}
          {recommendation.frequencyOfIntake && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#92400e' }}>Frequency:</strong> {recommendation.frequencyOfIntake}
            </div>
          )}
          
          {/* Links to paper sections where intake details are mentioned */}
          {recommendation.evidence && recommendation.evidence.some(ev => ev.sectionForDosage) && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fde047' }}>
              <strong style={{ color: '#92400e', display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                📄 Intake details from papers:
              </strong>
              {recommendation.evidence
                .filter(ev => ev.sectionForDosage)
                .map((evidence, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <a
                        href={evidence.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#92400e', textDecoration: 'underline', fontWeight: 500 }}
                      >
                        {evidence.paperTitle}
                      </a>
                      <span style={{ color: '#92400e', marginLeft: '0.5rem' }}>
                        → {evidence.sectionForDosage}
                      </span>
                    </div>
                    {evidence.dosageDetailsChunk && (
                      <div style={{ 
                        padding: '0.75rem', 
                        background: '#ffffff', 
                        borderRadius: '4px', 
                        border: '1px solid #fde047',
                        fontStyle: 'italic',
                        color: '#92400e',
                        lineHeight: '1.5'
                      }}>
                        "{evidence.dosageDetailsChunk}"
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="recommendation-summary">
        {recommendation.summarySimplified || recommendation.summary}
        {recommendation.summarySimplified && (
          <details style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            <summary style={{ cursor: 'pointer', textDecoration: 'underline' }}>
              Show technical version
            </summary>
            <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
              {recommendation.summary}
            </div>
          </details>
        )}
      </div>

      {recommendation.technicalTerms && recommendation.technicalTerms.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
          <strong style={{ color: '#0369a1', display: 'block', marginBottom: '0.5rem' }}>
            📚 Terms Explained:
          </strong>
          {recommendation.technicalTerms.map((term, idx) => (
            <div key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong style={{ color: '#0369a1' }}>{term.term}:</strong>{' '}
              <span style={{ color: '#555' }}>{term.explanation}</span>
            </div>
          ))}
        </div>
      )}

      {recommendation.evidence && recommendation.evidence.length > 0 && (
        <div className="evidence-list">
          <strong style={{ color: '#333', display: 'block', marginBottom: '0.5rem' }}>
            Scientific Evidence:
          </strong>
          {recommendation.evidence.map((evidence, idx) => (
            <EvidenceItem key={idx} evidence={evidence} />
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceItem({ evidence }: { evidence: Evidence }) {
  return (
    <div className="evidence-item">
      <div style={{ fontWeight: 600, color: '#333', marginBottom: '0.25rem' }}>
        {evidence.paperTitle}
      </div>
      {evidence.quote && (
        <div className="evidence-quote">"{evidence.quote}"</div>
      )}
      {evidence.relevantSection && (
        <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
          Section: {evidence.relevantSection}
        </div>
      )}
      <a
        href={evidence.paperUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="evidence-link"
      >
        View Paper →
      </a>
      {evidence.doi && (
        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
          DOI: {evidence.doi}
        </div>
      )}
    </div>
  );
}

