import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('Bullet Points');
  const [language, setLanguage] = useState('English');
  const [customPrompt, setCustomPrompt] = useState('');
  const [inputType, setInputType] = useState('youtube');
  const [audioFile, setAudioFile] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [videoStart, setVideoStart] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputType === 'youtube' && !url) return;
    if (inputType === 'audio' && !audioFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setVideoStart(0);
    setChatHistory([]);
    setStatusMessage('Starting request...');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      let fetchUrl = '';
      let fetchOptions = {};

      if (inputType === 'youtube') {
        fetchUrl = `${apiUrl}/api/summarize`;
        fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, format, language, custom_prompt: customPrompt }),
        };
      } else {
        fetchUrl = `${apiUrl}/api/upload`;
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('format', format);
        formData.append('language', language);
        if (customPrompt) formData.append('custom_prompt', customPrompt);
        fetchOptions = { method: 'POST', body: formData };
      }

      const response = await fetch(fetchUrl, fetchOptions);

      if (!response.ok) {
        throw new Error('Failed to process request');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep the last incomplete chunk

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.replace('data: ', '');
            try {
              const data = JSON.parse(dataStr);
              if (data.status === 'error') {
                throw new Error(data.message);
              } else if (data.status === 'complete') {
                setResult(data);
                setIsLoading(false);
              } else {
                setStatusMessage(data.message);
              }
            } catch (err) {
              console.error('Error parsing SSE:', err);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !result) return;

    const newMsg = { role: 'user', content: chatInput };
    const currentHistory = [...chatHistory, newMsg];
    setChatHistory(currentHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: result.transcript,
          chat_history: currentHistory,
          new_message: newMsg.content
        })
      });

      if (!response.ok) throw new Error('Chat failed');
      const data = await response.json();
      setChatHistory([...currentHistory, { role: 'ai', content: data.answer }]);
    } catch (err) {
      setChatHistory([...currentHistory, { role: 'ai', content: 'Error: Could not fetch response.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById('summary-content-export');
    element.classList.add('pdf-export-mode');
    
    const opt = {
      margin:       1,
      filename:     'podcuts-summary.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(element).save();
    
    element.classList.remove('pdf-export-mode');
  };

  const exportMarkdown = () => {
    const blob = new Blob([result.summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'podcuts-summary.md';
    a.click();
    URL.revokeObjectURL(url);
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
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="dark-mode-btn"
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
        <div className="top-section">
          <div className="top-left">
            <section className="input-section glass-panel">
              <div className="tabs">
                <button 
                  className={`copy-btn ${inputType === 'youtube' ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', background: inputType === 'youtube' ? 'var(--accent-hover)' : '', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => setInputType('youtube')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                  </svg>
                  YouTube
                </button>
                <button 
                  className={`copy-btn ${inputType === 'audio' ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', background: inputType === 'audio' ? 'var(--accent-hover)' : '', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => setInputType('audio')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                  </svg>
                  Audio File
                </button>
              </div>

              <form onSubmit={handleSubmit} className="input-group">
                {inputType === 'youtube' ? (
                  <input
                    type="url"
                    className="url-input"
                    placeholder="Paste YouTube Video URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                ) : (
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      id="audio-upload"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      disabled={isLoading}
                      required
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="audio-upload" className="file-upload-label">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      {audioFile ? audioFile.name : 'Click or drop to select an audio file'}
                    </label>
                  </div>
                )}

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
                    <option value="Custom">Custom Prompt</option>
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

                {format === 'Custom' && (
                  <textarea
                    className="url-input"
                    placeholder="E.g. Summarize focusing on diet advice..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                  />
                )}

                <button type="submit" className="submit-btn" disabled={isLoading || (inputType === 'youtube' && !url) || (inputType === 'audio' && !audioFile)}>
                  {isLoading ? 'Processing...' : 'Summarize'}
                </button>
              </form>
              {error && <div className="error-message">{error}</div>}
            </section>
          </div>

          <div className="top-right">
            {result && !isLoading && inputType === 'youtube' && result.video_id !== 'audio_upload' && (
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

            {result && !isLoading && (inputType === 'audio' || result.video_id === 'audio_upload') && (
              <div className="player-card glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h3>Audio Processed Successfully 🎧</h3>
              </div>
            )}

            {isLoading && (
              <div className="loading-container glass-panel">
                <div className="spinner"></div>
                <div className="loading-text">
                  {statusMessage || 'Initializing...'}
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

        <div className="bottom-section">
          {result && !isLoading ? (
            <div className="summary-card glass-panel">
              <div className="summary-header">
                <h2>AI Summary</h2>
                <div className="export-controls">
                  <button className="copy-btn" onClick={exportPDF}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    PDF
                  </button>
                  <button className="copy-btn" onClick={exportMarkdown}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    MD
                  </button>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(result.summary);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!</>
                    ) : (
                      <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy</>
                    )}
                  </button>
                </div>
              </div>
              <div className="summary-content" id="summary-content-export">
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

              {/* Chat Interface */}
              <div className="chat-section" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                <h3>💬 Ask about the video</h3>
                <div className="chat-history" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1rem 0', maxHeight: '400px', overflowY: 'auto', padding: '1rem', background: 'var(--input-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                  {chatHistory.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No messages yet. Ask me anything about the transcript!</p>}
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`chat-bubble ${msg.role}`} style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.role === 'user' ? 'var(--accent-hover)' : 'var(--bg-color)',
                      padding: '1rem',
                      borderRadius: '1rem',
                      maxWidth: '80%',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ))}
                  {chatLoading && <div className="chat-bubble ai loading" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Thinking...</div>}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChatSubmit} className="chat-input-form" style={{ display: 'flex', gap: '1rem' }}>
                  <input
                    type="text"
                    className="url-input"
                    style={{ flex: 1 }}
                    placeholder="Ask a question..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button type="submit" className="copy-btn" disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 2rem' }}>
                    Send
                  </button>
                </form>
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
