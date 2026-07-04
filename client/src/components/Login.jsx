import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Gamepad2, ArrowLeft, Mail, Lock, User } from 'lucide-react';
import soundManager from '../game/SoundManager';

const API_BASE = 'http://localhost:5000/api';

export default function Login() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    soundManager.playCoin();

    try {
      const url = authMode === 'login' 
        ? `${API_BASE}/auth/login` 
        : `${API_BASE}/auth/register`;
        
      const body = authMode === 'login'
        ? { email, password }
        : { name, email, password };
        
      const res = await axios.post(url, body);
      
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Play retro level complete chirp
      soundManager.playCoin();
      // Redirect to home or game screen
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.pixelGrid}></div>

      {/* Floating Retro Game Header */}
      <div style={styles.header}>
        <h1 className="retro-text-glow-purple" style={styles.title}>SUPER MERN BROS</h1>
        <button 
          onClick={() => { soundManager.playCoin(); navigate('/'); }} 
          style={styles.backBtn}
        >
          <ArrowLeft size={16} /> RETURN TO MAIN MENU
        </button>
      </div>

      <div className="glass-panel" style={styles.authPanel}>
        <div style={styles.cardHeader}>
          <Gamepad2 size={24} color="#bd00ff" />
          <h2 style={styles.cardTitle}>
            {authMode === 'login' ? '🔑 USER LOGIN' : '📝 RETRO REGISTRATION'}
          </h2>
        </div>

        <p style={styles.cardDescription}>
          {authMode === 'login' 
            ? 'Sign in to access custom characters, save level milestones, and submit scoreboard entries!'
            : 'Join the party to start tracking high scores, unlock profile tags, and claim leaderboard ranks!'
          }
        </p>

        {error && (
          <div style={styles.errorAlert}>
            ⚠️ {error.toUpperCase()}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={styles.form}>
          {authMode === 'register' && (
            <div style={styles.inputWrapper}>
              <User style={styles.inputIcon} size={18} />
              <input
                type="text"
                placeholder="YOUR NAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                style={styles.input}
                required
              />
            </div>
          )}

          <div style={styles.inputWrapper}>
            <Mail style={styles.inputIcon} size={18} />
            <input
              type="email"
              placeholder="EMAIL ADDRESS"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputWrapper}>
            <Lock style={styles.inputIcon} size={18} />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              style={styles.input}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn-neon cyan" 
            style={styles.submitBtn}
          >
            {loading ? 'TRANSMITTING...' : authMode === 'login' ? 'INITIALIZE LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => { 
              setAuthMode(authMode === 'login' ? 'register' : 'login'); 
              setError('');
              soundManager.playCoin();
            }}
            className="switch-auth-btn"
            style={styles.switchBtn}
          >
            {authMode === 'login' 
              ? "NEW BROS MEMBER? REGISTER A RECORD HERE" 
              : "EXISTING USER? EXECUTE SYSTEM LOGIN"
            }
          </button>
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
    marginBottom: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '16px',
    letterSpacing: '2px',
    textAlign: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-game)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    transition: 'color 0.2s',
  },
  authPanel: {
    width: '100%',
    maxWidth: '460px',
    padding: '36px',
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
    fontSize: '0.85rem',
    lineHeight: '1.6',
    color: '#bbb',
    marginBottom: '24px',
    fontFamily: 'var(--font-ui)',
  },
  errorAlert: {
    color: '#ff3d00',
    fontSize: '0.7rem',
    marginBottom: '20px',
    fontFamily: 'var(--font-game)',
    lineHeight: '1.4',
    background: 'rgba(255, 61, 0, 0.06)',
    border: '1px solid rgba(255, 61, 0, 0.2)',
    padding: '10px 14px',
    borderRadius: '6px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    padding: '14px',
    fontSize: '0.8rem',
    justifyContent: 'center',
    marginTop: '8px',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#00e5ff',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-game)',
    textDecoration: 'underline',
    lineHeight: '1.4',
  }
};
