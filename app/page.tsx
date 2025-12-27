'use client';

import { useState } from 'react';
import { HealthAnalysis, HealthRecommendation, Evidence } from '@/lib/services/aiService';

export default function Home() {
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze condition');
      }

      setAnalysis(data.analysis);
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

      {/* Activity-specific details - ALWAYS show for activities */}
      {recommendation.type === 'activity' && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
          <strong style={{ color: '#166534', display: 'block', marginBottom: '0.5rem' }}>
            🏃 Exercise Details:
          </strong>
          
          {/* Show exercise details if available */}
          {(recommendation.specificExercises && recommendation.specificExercises.length > 0) || recommendation.reps || recommendation.sets || recommendation.duration || recommendation.frequency ? (
            <>
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
            </>
          ) : (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#92400e', fontStyle: 'italic' }}>
              Exercise details (reps, sets, duration, frequency) unable to be found in paper.
            </div>
          )}
          
          {/* Links to paper sections where exercise details are mentioned */}
          {recommendation.evidence && recommendation.evidence.some(ev => ev.sectionForExercises && ev.exerciseDetailsChunk) ? (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #86efac' }}>
              <strong style={{ color: '#166534', display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                📄 Exercise details from papers:
              </strong>
              {recommendation.evidence
                .filter(ev => ev.sectionForExercises && ev.exerciseDetailsChunk)
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
          ) : (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #86efac' }}>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#92400e', fontStyle: 'italic' }}>
                Exercise details chunk unable to be found in paper.
              </div>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fef3c7',
                  border: '1px solid #fde047',
                  borderRadius: '4px',
                  color: '#92400e',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
                onClick={() => {
                  // TODO: Implement online search for exercise details from less reliable sources
                  alert('Online search feature coming soon');
                }}
              >
                🔍 Search online for exercise details (less reliable sources)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Food/Supplement-specific details - ALWAYS show for foods, but NOT for risky activities */}
      {recommendation.type === 'food' && recommendation.category !== 'risky' && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde047' }}>
          <strong style={{ color: '#92400e', display: 'block', marginBottom: '0.5rem' }}>
            🍎 Intake Details:
          </strong>
          
          {/* Show intake details if available */}
          {recommendation.dosage || recommendation.servingSize || recommendation.frequencyOfIntake ? (
            <>
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
            </>
          ) : (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#92400e', fontStyle: 'italic' }}>
              Intake details (dosage, serving size, frequency) unable to be found in paper.
            </div>
          )}
          
          {/* Links to paper sections where intake details are mentioned */}
          {recommendation.evidence && recommendation.evidence.some(ev => ev.sectionForDosage && ev.dosageDetailsChunk) ? (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fde047' }}>
              <strong style={{ color: '#92400e', display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                📄 Intake details from papers:
              </strong>
              {recommendation.evidence
                .filter(ev => ev.sectionForDosage && ev.dosageDetailsChunk)
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
          ) : (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fde047' }}>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#92400e', fontStyle: 'italic' }}>
                Intake details chunk unable to be found in paper.
              </div>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fef3c7',
                  border: '1px solid #fde047',
                  borderRadius: '4px',
                  color: '#92400e',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
                onClick={() => {
                  // TODO: Implement online search for intake details from less reliable sources
                  alert('Online search feature coming soon');
                }}
              >
                🔍 Search online for intake details (less reliable sources)
              </button>
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
      <div style={{ fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>
        {evidence.paperTitle}
      </div>
      {evidence.impact && (
        <div style={{ 
          padding: '0.75rem', 
          background: '#f0fdf4', 
          borderRadius: '6px', 
          border: '1px solid #86efac',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          <strong style={{ color: '#166534', display: 'block', marginBottom: '0.25rem' }}>
            📊 Study Results:
          </strong>
          <span style={{ color: '#166534' }}>{evidence.impact}</span>
        </div>
      )}
      {evidence.quote && (
        <div className="evidence-quote" style={{ fontSize: '0.9rem', lineHeight: '1.6', padding: '1rem' }}>
          "{evidence.quote}"
        </div>
      )}
      {evidence.relevantSection && (
        <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', fontStyle: 'italic' }}>
          From: {evidence.relevantSection}
        </div>
      )}
      <a
        href={evidence.paperUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="evidence-link"
        style={{ marginTop: '0.75rem', display: 'inline-block' }}
      >
        View Paper →
      </a>
      {evidence.doi && (
        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
          DOI: {evidence.doi}
        </div>
      )}
    </div>
  );
}

