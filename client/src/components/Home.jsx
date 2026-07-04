import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Gamepad2, Trophy, Settings, RefreshCw, Cpu, Server, Wifi, WifiOff, LogIn, LogOut, Loader2 } from 'lucide-react';
import soundManager from '../game/SoundManager';

const API_BASE = 'http://localhost:5000/api';

export default function Home() {
  const navigate = useNavigate();
  const [serverStatus, setServerStatus] = useState('checking');
  const [dbStatus, setDbStatus] = useState('unknown');
  
  // Auth state
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  const checkHealth = async () => {
    try {
      setServerStatus('checking');
      const res = await axios.get(`${API_BASE}/health`);
      setServerStatus('online');
      setDbStatus(res.data.database);
    } catch {
      setServerStatus('offline');
      setDbStatus('unknown');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    soundManager.playCoin(); // Play a nice feedback sound!
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('DESIGNING LEVEL...');
  const [generatingError, setGeneratingError] = useState(null);

  const handleGenerateLevel = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || generating) return;

    soundManager.playCoin();
    setGenerating(true);
    setGeneratingError(null);
    setGeneratingStatus('COMMUNICATING WITH OPENAI...');

    const statuses = [
      'COMMUNICATING WITH OPENAI...',
      'CRAFTING LEVEL GRID MAP...',
      'SPAWNING ENEMIES AND GOOMBAS...',
      'PLACING GOLD COINS...',
      'SAVING STAGE TO MONGODB...'
    ];
    let statusIndex = 0;
    const interval = setInterval(() => {
      statusIndex = (statusIndex + 1) % statuses.length;
      setGeneratingStatus(statuses[statusIndex]);
    }, 1800);

    try {
      const res = await axios.post(`${API_BASE}/ai/generate-level`, {
        prompt: aiPrompt
      });
      clearInterval(interval);
      if (res.data && res.data._id) {
        setGeneratingStatus('LEVEL COMPLETED! LOADING...');
        soundManager.playCoin();
        navigate(`/game?levelId=${res.data._id}`);
      } else {
        throw new Error("Invalid level ID returned.");
      }
    } catch (err) {
      clearInterval(interval);
      console.error("AI level generation failed:", err);
      let errorMsg = "Failed to generate level. Please verify the server is running and try again.";
      if (err.response) {
        if (err.response.status === 429) {
          errorMsg = "OpenAI rate limit reached. Please wait a moment before trying again.";
        } else if (err.response.data && err.response.data.error) {
          errorMsg = err.response.data.error;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setGeneratingError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.pixelGrid}></div>

      {/* Floating Retro Game Header */}
      <div style={styles.header}>
        <h1 className="retro-text-glow-purple animate-pulse" style={styles.title}>SUPER MERN BROS</h1>
        <p style={styles.subtitle}>
          <Cpu size={16} color="#00e5ff" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          HTML5 Canvas Platformer Engine
        </p>
      </div>

      <div className="main-grid">
        {/* Play Action Panel */}
        <div className="glass-panel" style={styles.panelLeft}>
          <div style={styles.gameCard}>
            <div style={styles.cardHeader}>
              <Gamepad2 size={24} color="#00e5ff" />
              <h2 style={{ ...styles.cardTitle, color: '#00e5ff' }}>
                {user ? `WELCOME, ${(user.name || user.username || user.email || 'HERO').toUpperCase()}!` : 'WELCOME, PLAYER!'}
              </h2>
            </div>
            
            <p style={styles.cardDescription}>
              {user 
                ? `You are logged in as ${user.email}. Jump in and secure your spot on the global leaderboards!`
                : 'Log in or sign up to play, collect coins, and securely upload your high scores to the retro scoreboard!'
              }
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              <button 
                className="btn-neon cyan" 
                onClick={() => {
                  soundManager.playCoin();
                  navigate('/game');
                }} 
                style={styles.actionButton}
              >
                <Gamepad2 size={18} />
                PLAY GAME
              </button>

              <button 
                className="btn-neon purple" 
                onClick={() => {
                  soundManager.playCoin();
                  navigate('/leaderboard');
                }} 
                style={styles.actionButton}
              >
                <Trophy size={18} />
                LEADERBOARD
              </button>

              {user ? (
                <button 
                  className="btn-neon red" 
                  onClick={handleLogout} 
                  style={{ ...styles.actionButton, justifyContent: 'center' }}
                >
                  <LogOut size={18} />
                  SIGN OUT
                </button>
              ) : (
                <button 
                  className="btn-neon cyan" 
                  onClick={() => {
                    soundManager.playCoin();
                    navigate('/login');
                  }} 
                  style={{ ...styles.actionButton, justifyContent: 'center' }}
                >
                  <LogIn size={18} />
                  LOG IN / REGISTER
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info & Health Monitor Panel */}
        <div className="glass-panel" style={styles.panelRight}>
          <div style={styles.sectionHeader}>
            <Settings size={18} color="#bd00ff" />
            <h3 style={styles.sectionTitle}>GAME INFO & CONTROLS</h3>
          </div>

          <div style={styles.controlsInfo}>
            <div style={styles.controlRow}>
              <kbd style={styles.key}>A</kbd> or <kbd style={styles.key}>←</kbd>
              <span style={styles.controlDesc}>Move Left</span>
            </div>
            <div style={styles.controlRow}>
              <kbd style={styles.key}>D</kbd> or <kbd style={styles.key}>→</kbd>
              <span style={styles.controlDesc}>Move Right</span>
            </div>
            <div style={styles.controlRow}>
              <kbd style={styles.key}>Space</kbd> or <kbd style={styles.key}>W</kbd> or <kbd style={styles.key}>↑</kbd>
              <span style={styles.controlDesc}>Jump High</span>
            </div>
            <div style={styles.controlRow}>
              <kbd style={styles.key}>R</kbd>
              <span style={styles.controlDesc}>Restart Current Level</span>
            </div>
            <div style={styles.controlRow}>
              <kbd style={styles.key}>ESC</kbd>
              <span style={styles.controlDesc}>Exit back to Menu</span>
            </div>
          </div>

          {/* Backend / Database Health Monitor */}
          <div style={styles.healthStatus}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} /> Backend Monitor:
              </span>
              <button onClick={checkHealth} style={styles.refreshBtn}>
                <RefreshCw size={14} />
              </button>
            </div>
            <div style={styles.statusBadges}>
              {serverStatus === 'online' ? (
                <div style={{ ...styles.badge, borderColor: '#00e5ff', color: '#00e5ff' }}>
                  <Wifi size={14} /> EXPRESS: ONLINE
                </div>
              ) : serverStatus === 'offline' ? (
                <div style={{ ...styles.badge, borderColor: '#ff3d00', color: '#ff3d00' }}>
                  <WifiOff size={14} /> EXPRESS: OFFLINE
                </div>
              ) : (
                <div style={{ ...styles.badge, borderColor: 'var(--color-text-muted)', color: 'var(--color-text-muted)' }}>
                  CHECKING STATUS...
                </div>
              )}

              {dbStatus === 'connected' ? (
                <div style={{ ...styles.badge, borderColor: '#00ff66', color: '#00ff66' }}>
                  📂 MONGODB: CONNECTED
                </div>
              ) : dbStatus === 'offline_demo_mode' ? (
                <div style={{ ...styles.badge, borderColor: '#ffd600', color: '#ffd600' }}>
                  📂 MONGODB: OFFLINE (DEMO MODE)
                </div>
              ) : (
                <div style={{ ...styles.badge, borderColor: 'var(--color-text-muted)', color: 'var(--color-text-muted)' }}>
                  📂 MONGODB: UNREACHABLE
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI-Powered Level Generator Panel */}
        <div className="glass-panel" style={{ ...styles.panelFullWidth, gridColumn: 'span 2' }}>
          <div style={styles.sectionHeader}>
            <Cpu size={20} color="#00e5ff" className={generating ? "animate-pulse" : ""} />
            <h3 style={{ ...styles.sectionTitle, color: '#00e5ff', fontSize: '0.85rem' }}>🤖 AI-POWERED LEVEL GENERATOR</h3>
          </div>

          <p style={{ ...styles.cardDescription, marginBottom: '20px' }}>
            Type a prompt below describing your ideal stage, and our AI builder will generate a unique, playable level with brick blocks, pipes, enemies, and coins instantly!
          </p>

          <form onSubmit={handleGenerateLevel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your level... (e.g. hard level, lots of gaps, many Goombas)"
                className="form-input"
                style={{ flex: 1, color: '#fff', outline: 'none' }}
                disabled={generating}
                required
              />
            </div>

            {generatingError && (
              <p style={{ color: '#ff3d00', fontSize: '0.8rem', fontFamily: 'var(--font-game)', lineHeight: '1.4' }}>
                ⚠️ {generatingError}
              </p>
            )}

            <button
              type="submit"
              className="btn-neon cyan"
              disabled={generating || !aiPrompt.trim()}
              style={{ ...styles.actionButton, justifyContent: 'center' }}
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  {generatingStatus}
                </>
              ) : (
                <>
                  <Cpu size={14} />
                  GENERATE LEVEL
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    position: 'relative',
    zIndex: 1,
    backgroundColor: '#05050d',
    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(156, 39, 176, 0.04) 0%, transparent 80%)',
  },
  pixelGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0.05) 50%, rgba(0, 0, 0, 0.15) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
    backgroundSize: '100% 6px, 6px 100%',
    zIndex: -1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '12px',
    letterSpacing: '2px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  panelLeft: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '340px',
  },
  panelRight: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '340px',
  },
  panelFullWidth: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '200px',
  },
  gameCard: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'space-between',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.95rem',
    letterSpacing: '1px',
  },
  cardDescription: {
    fontSize: '0.9rem',
    lineHeight: '1.6',
    color: '#bbb',
    marginBottom: '16px',
    fontFamily: 'var(--font-ui)',
  },
  actionButton: {
    width: '100%',
    padding: '14px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.85rem',
    color: '#bd00ff',
  },
  controlsInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  key: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-game)',
    color: '#fff',
    minWidth: '32px',
    textAlign: 'center',
    boxShadow: '0 2px 0 rgba(0,0,0,0.5)',
  },
  controlDesc: {
    fontSize: '0.85rem',
    color: '#ccc',
    fontFamily: 'var(--font-ui)',
  },
  healthStatus: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '20px',
    marginTop: 'auto',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontFamily: 'var(--font-game)',
    border: '1px solid',
  },
};
