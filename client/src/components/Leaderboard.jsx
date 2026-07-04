import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, ArrowLeft, Gamepad2, RefreshCw } from 'lucide-react';
import soundManager from '../game/SoundManager';

const API_BASE = 'http://localhost:5000/api';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/scores/leaderboard`);
      setScores(res.data);
    } catch (err) {
      console.warn("Could not fetch leaderboard, using local demo scores", err);
      // Local fallback list
      setScores([
        { _id: '1', username: 'MARIO', score: 12500, level: 'World 1-1', date: new Date() },
        { _id: '2', username: 'LUIGI', score: 9800, level: 'World 1-1', date: new Date() },
        { _id: '3', username: 'TOAD', score: 4500, level: 'World 1-1', date: new Date() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.pixelGrid}></div>

      {/* Floating Retro Game Header */}
      <div style={styles.header}>
        <h1 className="retro-text-glow-purple" style={styles.title}>SUPER MERN BROS</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={() => { soundManager.playCoin(); navigate('/'); }} 
            style={styles.navBtn}
          >
            <ArrowLeft size={16} /> MAIN MENU
          </button>
          <button 
            onClick={() => { soundManager.playCoin(); navigate('/game'); }} 
            style={{ ...styles.navBtn, color: '#00e5ff' }}
          >
            <Gamepad2 size={16} /> PLAY NOW
          </button>
        </div>
      </div>

      <div className="glass-panel" style={styles.scoreboardPanel}>
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy size={24} color="#ffd600" className="animate-bounce" style={{ animationDuration: '3s' }} />
            <h2 style={styles.cardTitle}>GLOBAL HIGH SCORES</h2>
          </div>
          <button onClick={fetchScores} style={styles.refreshBtn} title="Refresh Scoreboard">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <p style={styles.cardDescription}>
          The top 10 heroes who successfully crossed the castle flagpole and secured their places in history!
        </p>

        {loading ? (
          <div style={styles.loading}>
            <RefreshCw size={24} className="animate-spin" style={{ color: '#00e5ff', marginBottom: '12px' }} />
            <span style={{ fontFamily: 'var(--font-game)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              RETRIEVING HIGHEST RECORDS...
            </span>
          </div>
        ) : (
          <div style={styles.scoreTableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.th, width: '70px', textAlign: 'center' }}>RANK</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>HERO</th>
                  <th style={{ ...styles.th, width: '120px', textAlign: 'center' }}>LEVEL</th>
                  <th style={{ ...styles.th, width: '120px', textAlign: 'right' }}>SCORE</th>
                  <th style={{ ...styles.th, width: '110px', textAlign: 'right' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => (
                  <tr key={score._id || index} style={styles.tr}>
                    <td style={{ ...styles.td, textAlign: 'center', fontFamily: 'var(--font-game)', fontSize: '0.7rem' }}>
                      <span style={{
                        color: index === 0 ? '#ffd600' : index === 1 ? '#e5e5e5' : index === 2 ? '#cd7f32' : 'var(--color-text-muted)'
                      }}>
                        #{index + 1}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'var(--font-game)', fontSize: '0.7rem', color: '#fff' }}>
                      {score.username}
                    </td>
                    <td style={{ ...styles.td, color: '#bbb', textAlign: 'center', fontSize: '0.8rem' }}>
                      {score.level || 'World 1-1'}
                    </td>
                    <td style={{ ...styles.td, color: '#ffd600', textAlign: 'right', fontWeight: 'bold', fontFamily: 'var(--font-game)', fontSize: '0.7rem' }}>
                      {score.score.toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, color: 'var(--color-text-muted)', textAlign: 'right', fontSize: '0.8rem' }}>
                      {formatDate(score.date)}
                    </td>
                  </tr>
                ))}

                {scores.length === 0 && (
                  <tr>
                    <td colSpan={5} style={styles.noScores}>
                      ⚠️ NO HIGH SCORES REGISTERED YET. BE THE FIRST!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
    gap: '12px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '8px',
    letterSpacing: '2px',
    textAlign: 'center',
  },
  navBtn: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-game)',
    fontSize: '0.7rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    transition: 'all 0.2s',
  },
  scoreboardPanel: {
    width: '100%',
    maxWidth: '680px',
    padding: '36px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  cardTitle: {
    fontFamily: 'var(--font-game)',
    fontSize: '1rem',
    letterSpacing: '1px',
    color: '#ffd600',
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
  cardDescription: {
    fontSize: '0.85rem',
    lineHeight: '1.6',
    color: '#bbb',
    marginBottom: '28px',
    fontFamily: 'var(--font-ui)',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  scoreTableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-ui)',
  },
  tableHeaderRow: {
    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
  },
  th: {
    padding: '12px 8px',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-game)',
    color: '#bd00ff',
    fontWeight: 'normal',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'background 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
    }
  },
  td: {
    padding: '14px 8px',
    fontSize: '0.85rem',
  },
  noScores: {
    textAlign: 'center',
    padding: '40px 0',
    fontFamily: 'var(--font-game)',
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
  }
};
