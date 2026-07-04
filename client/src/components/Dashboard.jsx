import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Gamepad2, Trophy, Settings, RefreshCw, Cpu, Server, Wifi, WifiOff } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function Dashboard({ onStartGame }) {
  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [dbStatus, setDbStatus] = useState('unknown'); // 'connected' | 'offline_demo_mode' | 'unknown'
  const [activeTab, setActiveTab] = useState('scores'); // 'scores' | 'controls' | 'about'

  // Authentication states
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  // Auth form input states
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Check backend server status
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

  // Fetch top scores
  const fetchScores = async () => {
    setLoadingScores(true);
    try {
      const res = await axios.get(`${API_BASE}/scores/leaderboard`);
      setScores(res.data);
    } catch {
      console.warn("Could not fetch scores, using client-side fallback list");
      // Fallback local scores
      setScores([
        { _id: '1', username: 'MARIO', score: 12500, level: 'World 1-1' },
        { _id: '2', username: 'LUIGI', score: 9800, level: 'World 1-1' },
        { _id: '3', username: 'TOAD', score: 4500, level: 'World 1-1' }
      ]);
    } finally {
      setLoadingScores(false);
    }
  };

  // Handle Login & Registration submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const url = authMode === 'login' 
        ? `${API_BASE}/auth/login` 
        : `${API_BASE}/auth/register`;
        
      const body = authMode === 'login'
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword };
        
      const res = await axios.post(url, body);
      
      const { token: receivedToken, user: userData } = res.data;
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(receivedToken);
      setUser(userData);
      
      // Reset input fields
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      fetchScores(); // Refresh leaderboard
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  useEffect(() => {
    checkHealth();
    fetchScores();
  }, []);

  return (
    <div style={styles.container}>
      {/* Visual background element */}
      <div style={styles.pixelGrid}></div>

      {/* Floating Retro Game Header */}
      <div style={styles.header}>
        <h1 className="retro-text-glow-purple" style={styles.title}>SUPER MERN BROS</h1>
        <p style={styles.subtitle}>
          <Cpu size={16} color="#00e5ff" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          HTML5 Canvas Platformer Engine
        </p>
      </div>

      <div className="main-grid">
        {/* Play Action Panel */}
        <div className="glass-panel" style={styles.panelLeft}>
          {user ? (
            <div style={styles.gameCard}>
              <div style={styles.cardHeader}>
                <Gamepad2 size={24} color="#00e5ff" />
                <h2 style={{ ...styles.cardTitle, color: '#00e5ff' }}>WELCOME, {user.name.toUpperCase()}!</h2>
              </div>
              <p style={styles.cardDescription}>
                You are logged in as <strong style={{ color: '#00e5ff' }}>{user.email}</strong>. Play the game to set a high score linked to your account!
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn-neon cyan" onClick={onStartGame} style={styles.playButton}>
                  <Gamepad2 size={18} />
                  PLAY NOW
                </button>
                <button className="btn-neon red" onClick={handleLogout} style={{ ...styles.playButton, padding: '12px', justifyContent: 'center' }}>
                  SIGN OUT
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.gameCard}>
              <div style={styles.cardHeader}>
                <Gamepad2 size={24} color="#bd00ff" />
                <h2 style={styles.cardTitle}>
                  {authMode === 'login' ? '🔑 LOGIN TO PLAY' : '📝 REGISTER ACCOUNT'}
                </h2>
              </div>
              <p style={{ ...styles.cardDescription, marginBottom: '16px' }}>
                Log in or sign up to play and save your high scores securely on the MERN leaderboard.
              </p>

              {authError && (
                <div style={{ color: '#ff3d00', fontSize: '0.65rem', marginBottom: '12px', fontFamily: 'var(--font-game)', lineHeight: '1.4' }}>
                  ⚠️ {authError.toUpperCase()}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authMode === 'register' && (
                  <input
                    type="text"
                    placeholder="YOUR NAME"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="form-input"
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="form-input"
                  required
                />
                <input
                  type="password"
                  placeholder="PASSWORD"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="form-input"
                  required
                />
                <button type="submit" disabled={authLoading} className="btn-neon cyan" style={{ ...styles.playButton, marginTop: '8px', justifyContent: 'center' }}>
                  {authLoading ? 'AUTHENTICATING...' : authMode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
                </button>
              </form>

              <div style={{ marginTop: '16px', fontSize: '0.8rem', textAlign: 'center' }}>
                <button 
                  onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
                  className="switch-auth-btn"
                >
                  {authMode === 'login' ? "DON'T HAVE AN ACCOUNT? REGISTER NOW" : "ALREADY HAVE AN ACCOUNT? LOG IN"}
                </button>
              </div>
            </div>
          )}

          {/* Backend / Database Health Monitor */}
          <div style={styles.healthStatus}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} /> Backend & DB Connection:
              </span>
              <button onClick={() => { checkHealth(); fetchScores(); }} style={styles.refreshBtn}>
                <RefreshCw size={14} />
              </button>
            </div>
            <div style={styles.statusBadges}>
              {serverStatus === 'online' ? (
                <div style={{ ...styles.badge, borderColor: '#00e5ff', color: '#00e5ff' }}>
                  <Wifi size={14} /> SERVER: ONLINE
                </div>
              ) : serverStatus === 'offline' ? (
                <div style={{ ...styles.badge, borderColor: '#ff3d00', color: '#ff3d00' }}>
                  <WifiOff size={14} /> SERVER: OFFLINE
                </div>
              ) : (
                <div style={{ ...styles.badge, borderColor: 'var(--color-text-muted)', color: 'var(--color-text-muted)' }}>
                  CHECKING...
                </div>
              )}

              {dbStatus === 'connected' ? (
                <div style={{ ...styles.badge, borderColor: '#00ff66', color: '#00ff66' }}>
                  📂 MONGODB ATLAS: CONNECTED
                </div>
              ) : dbStatus === 'offline_demo_mode' ? (
                <div style={{ ...styles.badge, borderColor: '#ffd600', color: '#ffd600' }}>
                  📂 DB: OFFLINE (DEMO MODE)
                </div>
              ) : (
                <div style={{ ...styles.badge, borderColor: 'var(--color-text-muted)', color: 'var(--color-text-muted)' }}>
                  📂 DB: UNREACHABLE
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Tabs & Leaderboard Panel */}
        <div className="glass-panel" style={styles.panelRight}>
          <div style={styles.tabHeader}>
            <button 
              style={{ ...styles.tabButton, color: activeTab === 'scores' ? '#bd00ff' : 'var(--color-text-muted)', borderBottomColor: activeTab === 'scores' ? '#bd00ff' : 'transparent' }} 
              onClick={() => setActiveTab('scores')}
            >
              <Trophy size={16} /> LEADERBOARD
            </button>
            <button 
              style={{ ...styles.tabButton, color: activeTab === 'controls' ? '#bd00ff' : 'var(--color-text-muted)', borderBottomColor: activeTab === 'controls' ? '#bd00ff' : 'transparent' }} 
              onClick={() => setActiveTab('controls')}
            >
              <Settings size={16} /> CONTROLS
            </button>
          </div>

          <div style={styles.tabContent}>
            {activeTab === 'scores' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontFamily: 'var(--font-game)', fontSize: '0.8rem', color: '#ffd600' }}>TOP HEROES</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MERN Database</span>
                </div>
                {loadingScores ? (
                  <div style={styles.loading}>LOADING HEROES...</div>
                ) : (
                  <div style={styles.scoreList}>
                    {scores.map((score, index) => (
                      <div key={score._id || index} style={styles.scoreItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ ...styles.scoreRank, color: index === 0 ? '#ffd600' : index === 1 ? '#e5e5e5' : index === 2 ? '#cd7f32' : 'var(--color-text-muted)' }}>
                            #{index + 1}
                          </span>
                          <span style={styles.scoreName}>{score.username}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>{score.level}</span>
                          <span style={styles.scorePoints}>{score.score.toLocaleString()} PTS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'controls' && (
              <div style={styles.controlsInfo}>
                <h3 style={{ fontFamily: 'var(--font-game)', fontSize: '0.8rem', color: '#00e5ff', marginBottom: '16px' }}>KEYBOARD MAP</h3>
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
                  <span style={styles.controlDesc}>Jump</span>
                </div>
                <div style={styles.controlRow}>
                  <kbd style={styles.key}>R</kbd>
                  <span style={styles.controlDesc}>Restart Game</span>
                </div>
                <div style={styles.controlRow}>
                  <kbd style={styles.key}>ESC</kbd>
                  <span style={styles.controlDesc}>Exit to Dashboard</span>
                </div>
              </div>
            )}
          </div>
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
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },

  panelLeft: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  panelRight: {
    padding: '30px',
  },
  gameCard: {
    marginBottom: '30px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontFamily: 'var(--font-game)',
    fontSize: '1rem',
    letterSpacing: '1px',
    color: '#bd00ff',
  },
  cardDescription: {
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: '#bbb',
    marginBottom: '24px',
  },
  playButton: {
    width: '100%',
    justifyContent: 'center',
    fontSize: '0.9rem',
    padding: '16px',
  },
  healthStatus: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '20px',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
    transition: 'color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-game)',
    border: '1px solid',
  },
  tabHeader: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '20px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '12px 16px',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-game)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  tabContent: {
    minHeight: '220px',
  },
  loading: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    padding: '40px 0',
  },
  scoreList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '260px',
    overflowY: 'auto',
  },
  scoreItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    fontSize: '0.85rem',
  },
  scoreRank: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.75rem',
    width: '32px',
  },
  scoreName: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.75rem',
    color: '#fff',
  },
  scorePoints: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.75rem',
    color: '#ffd600',
  },
  controlsInfo: {
    lineHeight: '1.6',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  key: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-game)',
    color: '#fff',
    minWidth: '32px',
    textAlign: 'center',
    boxShadow: '0 2px 0 rgba(0,0,0,0.5)',
  },
  controlDesc: {
    fontSize: '0.95rem',
    color: '#ccc',
  }
};
