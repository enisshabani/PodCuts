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
  const [isDarkMode, setIsDarkMode] = useState(false);

  React.useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

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
      <header className="header" style={{ position: 'relative' }}>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            position: 'absolute',
            right: '0',
            top: '0',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isDarkMode ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              Light Mode
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              Dark Mode
            </>
          )}
        </button>
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
