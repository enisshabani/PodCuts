import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('Bullet Points');
  const [language, setLanguage] = useState('English');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [videoStart, setVideoStart] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setVideoStart(0);

    try {
      // Use environment variable if deployed, otherwise fallback to local backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, format, language }),
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

  const processedSummary = result ? result.summary.replace(/\[(\d{1,2}:\d{2})\]/g, '[$1](#$1)') : '';

  const parseTimeToSeconds = (timeStr) => {
    const cleanTime = timeStr.replace('#', '');
    const parts = cleanTime.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>PodCuts</h1>
        <p>Advanced YouTube Summarizer with Deep Links & Translation</p>
      </header>

      <main className="main-layout">

        {/* TOP SECTION: Input & Video Player Side-by-Side */}
        <div className="top-section">

          <div className="top-left">
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

                <div className="controls-group">
                  <select
                    className="select-input"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="Bullet Points">Bullet Points</option>
                    <option value="Study Notes">Study Notes</option>
                    <option value="Action Items">Action Items</option>
                    <option value="Twitter Thread">Twitter Thread</option>
                    <option value="Blog Post">Blog Post</option>
                  </select>

                  <select
                    className="select-input"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Arabic">Arabic</option>
                  </select>
                </div>

                <button type="submit" className="submit-btn" disabled={isLoading || !url}>
                  {isLoading ? 'Processing...' : 'Summarize'}
                </button>
              </form>
              {error && <div className="error-message">{error}</div>}
            </section>
          </div>

          <div className="top-right">
            {result && !isLoading && (
              <div className="player-card glass-panel">
                <iframe
                  width="100%"
                  height="315"
                  src={`https://www.youtube.com/embed/${result.video_id}?start=${videoStart}&autoplay=${videoStart > 0 ? 1 : 0}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ borderRadius: '1rem' }}
                ></iframe>
              </div>
            )}

            {isLoading && (
              <div className="loading-container glass-panel">
                <div className="spinner"></div>
                <div className="loading-text">
                  Fetching transcript and analyzing with AI...
                </div>
              </div>
            )}

            {!result && !isLoading && (
              <div className="player-card glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                Video Player will appear here
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM SECTION: Full Width AI Summary */}
        <div className="bottom-section">
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
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => {
                      if (props.href && props.href.startsWith('#')) {
                        return (
                          <button
                            className="timestamp-link"
                            onClick={(e) => {
                              e.preventDefault();
                              setVideoStart(parseTimeToSeconds(props.href));
                              // Scroll back to top so user can see the video
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            {props.children}
                          </button>
                        );
                      }
                      return <a {...props} />;
                    }
                  }}
                >
                  {processedSummary}
                </ReactMarkdown>
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
