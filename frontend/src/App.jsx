import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to summarize video');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>PodCuts</h1>
        <p>YouTube & Podcast Summarizer</p>
      </header>

      <main className="main-layout">

        {/* LEFT PANEL: Input & Transcript */}
        <div className="left-panel">
          <section className="input-section glass-panel">
            <form onSubmit={handleSubmit} className="input-group">
              <input
                type="url"
                className="url-input"
                placeholder="Paste YouTube Video URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                required
              />
              <button type="submit" className="submit-btn" disabled={isLoading || !url}>
                {isLoading ? 'Processing...' : 'Summarize'}
              </button>
            </form>
            {error && <div className="error-message">{error}</div>}
          </section>

          {isLoading && (
            <div className="loading-container glass-panel">
              <div className="spinner"></div>
              <div className="loading-text">
                Fetching transcript and analyzing with AI...
              </div>
            </div>
          )}

          {result && !isLoading && (
            <div className="transcript-content glass-panel">
              <h3>Raw Transcript</h3>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {result.transcript}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: AI Summary */}
        <div className="right-panel">
          {result && !isLoading ? (
            <div className="summary-card glass-panel">
              <div className="summary-header">
                <h2>AI Summary</h2>
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(result.summary);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div className="summary-content">
                <ReactMarkdown>{result.summary}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="summary-card glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              {isLoading ? "Generating summary..." : "Summary will appear here"}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
