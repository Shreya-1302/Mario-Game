import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, RefreshCw, Loader2, Share2 } from 'lucide-react';
import axios from 'axios';
import Player from '../game/Player';
import Level from '../game/Level';
import soundManager from '../game/SoundManager';

// AABB collision detection helper
const checkCollision = (rect1, rect2) => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

export default function GameCanvas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelId = searchParams.get('levelId');
  const [loading, setLoading] = useState(!!levelId);
  const [loadingError, setLoadingError] = useState(null);
  const [customGrid, setCustomGrid] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastTimeRef = useRef(0);
  const [fps, setFps] = useState(60);

  // React state for overlays (avoids re-rendering during active gameplay)
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'gameover' | 'complete'
  const [username, setUsername] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user ? user.name.slice(0, 3).toUpperCase() : 'MAR';
    } catch {
      return 'MAR';
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Triggers visual DOM renders when ref scoreboard values change
  const [, forceUpdate] = useState({});

  // HUD & Game physics refs (allows high-performance canvas draw without React triggers)
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const livesRef = useRef(3);
  const timerRef = useRef(400);
  const timerAccumRef = useRef(0);
  const checkpointRef = useRef(100);

  // State machine for gameplay
  const gameStateRef = useRef('playing'); // 'playing' | 'dead' | 'flagpole' | 'walkcastle' | 'complete' | 'gameover'

  // Keyboard state tracker
  const keysRef = useRef({
    left: false,
    right: false,
    up: false
  });

  // Camera viewport offset
  const cameraXRef = useRef(0);

  // Helper to handle coin collections
  const handleCoinCollect = useCallback(() => {
    coinsRef.current += 1;
    scoreRef.current += 200;
    soundManager.playCoin();
    forceUpdate({});
  }, []);

  // Instantiate Level
  const levelRef = useRef(null);
  if (!levelRef.current) {
    levelRef.current = new Level(handleCoinCollect, customGrid);
  }

  // Instantiate Player
  const playerRef = useRef(new Player(100, 100));

  // Drifting clouds properties
  const cloudsRef = useRef([
    { x: 100, y: 80, scale: 1.2, speed: 0.1 },
    { x: 450, y: 50, scale: 0.8, speed: 0.05 },
    { x: 750, y: 120, scale: 1.0, speed: 0.08 },
    { x: 1100, y: 70, scale: 1.1, speed: 0.06 },
    { x: 1500, y: 90, scale: 0.9, speed: 0.07 }
  ]);

  // Reset helper
  const handleReset = useCallback(() => {
    playerRef.current = new Player(100, 100);
    levelRef.current = new Level(handleCoinCollect, customGrid);
    scoreRef.current = 0;
    coinsRef.current = 0;
    cameraXRef.current = 0;
    livesRef.current = 3;
    timerRef.current = 400;
    timerAccumRef.current = 0;
    gameStateRef.current = 'playing';
    checkpointRef.current = 100;
    setGameState('playing');
    setSubmitted(false);
    setSubmitting(false);
    soundManager.stopBGM();
    soundManager.startBGM();
    forceUpdate({});
  }, [handleCoinCollect, customGrid]);

  // Fetch shared level if levelId is in url query parameters
  useEffect(() => {
    if (!levelId) return;

    const fetchLevel = async () => {
      setLoading(true);
      setLoadingError(null);
      try {
        const res = await axios.get(`http://localhost:5000/api/ai/level/${levelId}`);
        if (res.data && res.data.grid) {
          setCustomGrid(res.data.grid);
        } else {
          setLoadingError("Invalid level data layout.");
        }
      } catch (err) {
        console.error("Failed to load shared AI level:", err);
        setLoadingError("Could not retrieve the shared level. The server might be down or the level ID is incorrect.");
      } finally {
        setLoading(false);
      }
    };

    fetchLevel();
  }, [levelId]);

  // Restart level when custom grid updates
  useEffect(() => {
    handleReset();
  }, [customGrid, handleReset]);

  // Copy unique share level link to clipboard
  const handleShare = () => {
    if (!levelId) return;
    const url = `${window.location.origin}/game?levelId=${levelId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
      });
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      // Block controls if not actively playing
      if (gameStateRef.current !== 'playing') {
        if (key === 'r') handleReset();
        if (e.key === 'Escape') navigate('/');
        return;
      }

      if (e.key === 'ArrowLeft' || key === 'a') {
        keysRef.current.left = true;
      }
      if (e.key === 'ArrowRight' || key === 'd') {
        keysRef.current.right = true;
      }
      if (e.key === 'ArrowUp' || key === 'w' || e.key === ' ') {
        keysRef.current.up = true;
        e.preventDefault();
      }
      if (key === 'r') {
        handleReset();
      }
      if (e.key === 'Escape') {
        navigate('/');
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (e.key === 'ArrowLeft' || key === 'a') {
        keysRef.current.left = false;
      }
      if (e.key === 'ArrowRight' || key === 'd') {
        keysRef.current.right = false;
      }
      if (e.key === 'ArrowUp' || key === 'w' || e.key === ' ') {
        keysRef.current.up = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [navigate, handleReset]);

  // Helper: Draw cloud
  const drawCloud = (ctx, cx, cy, scale) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(20, 20, 15, 0, Math.PI * 2);
    ctx.arc(40, 15, 20, 0, Math.PI * 2);
    ctx.arc(65, 18, 16, 0, Math.PI * 2);
    ctx.rect(20, 15, 45, 18);
    ctx.fill();
    ctx.restore();
  };

  // Helper: Draw hill
  const drawGreenHill = (ctx, hx, hy, width, height) => {
    ctx.save();
    ctx.fillStyle = '#00a800';
    ctx.beginPath();
    ctx.ellipse(hx, hy, width, height, 0, Math.PI, 0);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#004000';
    ctx.stroke();

    ctx.fillStyle = '#004000';
    ctx.fillRect(hx - 8, hy - height/2 + 10, 3, 10);
    ctx.fillRect(hx + 5, hy - height/2 + 10, 3, 10);
    ctx.restore();
  };

  // Memoized drawing routine (never changes identity)
  const draw = useCallback((ctx, width, height) => {
    // 1. Draw static background sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#5c94fc');
    skyGradient.addColorStop(0.7, '#88b4ff');
    skyGradient.addColorStop(1, '#b8f8f8');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw background clouds with slow parallax scrolling (35% speed)
    ctx.save();
    ctx.translate(-cameraXRef.current * 0.35, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    cloudsRef.current.forEach((cloud) => {
      drawCloud(ctx, cloud.x, cloud.y, cloud.scale);
    });
    ctx.restore();

    // 3. Draw middleground green hills with medium parallax (60% speed)
    ctx.save();
    ctx.translate(-cameraXRef.current * 0.6, 0);
    drawGreenHill(ctx, 120, height - 80, 80, 60);
    drawGreenHill(ctx, 600, height - 80, 110, 80);
    drawGreenHill(ctx, 1400, height - 80, 95, 70);
    drawGreenHill(ctx, 2200, height - 80, 80, 60);
    drawGreenHill(ctx, 3000, height - 80, 120, 85);
    ctx.restore();

    // 4. Draw scroll-aligned gameplay elements (translated by -cameraX)
    ctx.save();
    ctx.translate(-cameraXRef.current, 0);

    // Render level tiles, bricks, static coins, and green pipes
    levelRef.current.draw(ctx, cameraXRef.current);

    // Render Player (Mario)
    playerRef.current.draw(ctx);

    ctx.restore();

    // 5. Draw static HUD overlay (non-scrolling)
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'left';

    // Mario Score
    ctx.fillText('MARIO', 40, 30);
    const scoreStr = String(scoreRef.current).padStart(6, '0');
    ctx.fillText(scoreStr, 40, 50);

    // Coins Collected
    ctx.fillText('COINS', 220, 30);
    
    ctx.save();
    ctx.fillStyle = '#ffd600';
    ctx.strokeStyle = '#ff7c00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(225, 45, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Shine mark inside tiny coin
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(224, 43, 1, 2);
    ctx.restore();

    const coinStr = String(coinsRef.current).padStart(2, '0');
    ctx.fillText(`x${coinStr}`, 236, 50);

    // World
    ctx.fillText('WORLD', 380, 30);
    ctx.fillText('1-1', 396, 50);

    // Lives
    ctx.fillText('LIVES', 520, 30);
    ctx.fillText(`x${livesRef.current}`, 536, 50);

    // Timer
    ctx.fillText('TIME', 660, 30);
    const timeStr = String(timerRef.current).padStart(3, '0');
    ctx.fillText(timeStr, 668, 50);
  }, []);

  // Update logic helper
  const update = useCallback((deltaTime) => {
    const canvasWidth = 800;
    const gravity = 0.6;

    if (gameStateRef.current === 'gameover') {
      return;
    }

    // A. Death animation state
    if (gameStateRef.current === 'dead') {
      playerRef.current.update(deltaTime, keysRef.current, levelRef.current, gravity);
      
      // If dead Mario falls off the screen
      if (playerRef.current.y > 480) {
        livesRef.current -= 1;
        
        if (livesRef.current > 0) {
          // Respawn at checkpoint
          playerRef.current = new Player(checkpointRef.current, 100);
          timerRef.current = 400;
          timerAccumRef.current = 0;
          cameraXRef.current = Math.max(0, checkpointRef.current - canvasWidth / 2);
          gameStateRef.current = 'playing';
          forceUpdate({});
        } else {
          // Game Over!
          gameStateRef.current = 'gameover';
          setGameState('gameover');
          forceUpdate({});
        }
      }
      return;
    }

    // B. Flagpole slide state
    if (gameStateRef.current === 'flagpole') {
      playerRef.current.x = levelRef.current.flagpoleX; // align precisely with flagpole pole
      playerRef.current.y += 2.5 * (deltaTime / 16.67); // slide down

      if (playerRef.current.y >= 384) {
        playerRef.current.y = 384; // rest on top of stair
        playerRef.current.isMoving = true;
        playerRef.current.facing = 'right';
        gameStateRef.current = 'walkcastle';
      }
      return;
    }

    // C. Walk off-screen to castle
    if (gameStateRef.current === 'walkcastle') {
      playerRef.current.x += 1.8 * (deltaTime / 16.67);
      
      // Animate walking
      playerRef.current.animTimer += deltaTime;
      if (playerRef.current.animTimer > 100) {
        playerRef.current.animFrame = playerRef.current.animFrame === 1 ? 2 : 1;
        playerRef.current.animTimer = 0;
      }

      // Parallax scroll camera to follow
      let targetCamX = playerRef.current.x - canvasWidth / 2;
      const maxCamX = levelRef.current.width - canvasWidth;
      cameraXRef.current = Math.max(0, Math.min(maxCamX, targetCamX));

      if (playerRef.current.x >= levelRef.current.castleX) {
        playerRef.current.vx = 0;
        playerRef.current.isMoving = false;
        playerRef.current.animFrame = 0;
        gameStateRef.current = 'complete';
        setGameState('complete');
        forceUpdate({});
      }
      return;
    }

    // D. Score tick down at complete
    if (gameStateRef.current === 'complete') {
      if (timerRef.current > 0) {
        const ticks = Math.min(timerRef.current, 4);
        timerRef.current -= ticks;
        scoreRef.current += ticks * 50;
        forceUpdate({});
      }
      return;
    }

    // E. Active gameplay updates
    // Update Level timers, bouncing blocks, particles, and enemies (Goombas)
    levelRef.current.update(deltaTime);

    // Update Player physics & controls
    playerRef.current.update(deltaTime, keysRef.current, levelRef.current, gravity);

    // Timer countdown (1 second increments)
    timerAccumRef.current += deltaTime;
    if (timerAccumRef.current >= 1000) {
      timerRef.current = Math.max(0, timerRef.current - 1);
      timerAccumRef.current -= 1000;
      
      if (timerRef.current === 0) {
        playerRef.current.die();
        gameStateRef.current = 'dead';
      }
      forceUpdate({});
    }

    // Checkpoint updater (midpoint of level)
    if (playerRef.current.x > levelRef.current.checkpointX && checkpointRef.current < levelRef.current.checkpointX) {
      checkpointRef.current = levelRef.current.checkpointX; // Checkpoint reached
    }

    // Pit fall death checker
    if (playerRef.current.y > 480) {
      playerRef.current.die();
      gameStateRef.current = 'dead';
      forceUpdate({});
    }

    // Flagpole touch checker (Flagpole center is around x = flagpoleX)
    if (playerRef.current.x >= levelRef.current.flagpoleX && gameStateRef.current === 'playing') {
      playerRef.current.isCompletingLevel = true;
      scoreRef.current += 2000; // Flag completion bonus
      gameStateRef.current = 'flagpole';
      soundManager.playComplete();
      forceUpdate({});
    }

    // Coin collection checker
    levelRef.current.coins = levelRef.current.coins.filter((coin) => {
      if (checkCollision(playerRef.current, coin)) {
        handleCoinCollect();
        return false; // remove coin
      }
      return true;
    });

    // Goomba collision checker
    levelRef.current.enemies.forEach((enemy) => {
      if (enemy.isDead || enemy.isSquished) return;

      if (checkCollision(playerRef.current, enemy)) {
        // Stomp detection: player is moving downward and player's feet are above enemy's head
        const playerBottom = playerRef.current.y + playerRef.current.height;
        const enemyHead = enemy.y;
        const isStomping = playerRef.current.vy > 0 && (playerBottom - playerRef.current.vy) <= enemyHead + 12;

        if (isStomping) {
          enemy.squish();
          playerRef.current.vy = -8.5; // bounce up
          scoreRef.current += 100;
          soundManager.playStomp();
          forceUpdate({});
        } else {
          // Take damage / Die
          playerRef.current.die();
          gameStateRef.current = 'dead';
          forceUpdate({});
        }
      }
    });

    // Camera scrolling (stops scroll to left, scrolls right to center player)
    let targetCamX = playerRef.current.x - canvasWidth / 2 + playerRef.current.width / 2;
    const maxCamX = levelRef.current.width - canvasWidth;
    cameraXRef.current = Math.max(0, Math.min(maxCamX, targetCamX));

    // Update drifting clouds
    cloudsRef.current.forEach((cloud) => {
      cloud.x -= cloud.speed * (deltaTime / 16.67);
      const cloudLevelWidth = levelRef.current.width + 200;
      if (cloud.x < -120 * cloud.scale) {
        cloud.x = cloudLevelWidth;
      }
    });
  }, [handleCoinCollect]);

  // Game Loop scheduler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = 800;
    canvas.height = 480;

    const gameLoop = (time) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (deltaTime > 0) {
        const currentFps = Math.round(1000 / deltaTime);
        setFps((prev) => Math.round(prev * 0.9 + currentFps * 0.1));
      }

      // Cap deltaTime at 100ms to avoid physics glitches on tab change/load
      const cappedDelta = Math.min(deltaTime, 100);
      update(cappedDelta);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, canvas.width, canvas.height);

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    // Start background music loop
    soundManager.startBGM();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      // Stop background music loop
      soundManager.stopBGM();
    };
  }, [draw, update]);

  // Leaderboard score submission handler
  const handleSubmitScore = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.post('http://localhost:5000/api/scores', {
        score: scoreRef.current,
        level: 'World 1-1'
      }, { headers });
      setSubmitted(true);
    } catch (err) {
      console.warn("Failed to post score to server database. Saving locally as demo.", err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.hudOverlay} className="hud-overlay-container">
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-neon cyan" onClick={() => navigate('/')} style={styles.actionBtn}>
            <LogOut size={14} /> ESC MENU
          </button>
          <button className="btn-neon" onClick={handleReset} style={styles.actionBtn}>
            <RefreshCw size={14} /> RESET (R)
          </button>
          {levelId && !loading && !loadingError && (
            <button 
              className="btn-neon purple" 
              onClick={handleShare} 
              style={{ ...styles.actionBtn, borderColor: '#bd00ff', boxShadow: '0 0 10px rgba(189, 0, 255, 0.4)' }}
            >
              <Share2 size={14} /> {shareCopied ? 'COPIED!' : 'SHARE LEVEL'}
            </button>
          )}
        </div>

        {/* HTML HUD Stats overlay for high visibility */}
        <div style={styles.statsHud} className="stats-hud-container">
          <div style={styles.hudStat}>
            <span style={styles.hudLabel}>SCORE</span>
            <span style={styles.hudValue}>{String(scoreRef.current).padStart(6, '0')}</span>
          </div>
          <div style={styles.hudStat}>
            <span style={styles.hudLabel}>COINS</span>
            <span style={styles.hudValue}>🪙 x{String(coinsRef.current).padStart(2, '0')}</span>
          </div>
          <div style={styles.hudStat}>
            <span style={styles.hudLabel}>LIVES</span>
            <span style={styles.hudValue}>❤️ x{livesRef.current}</span>
          </div>
          <div style={styles.hudStat}>
            <span style={styles.hudLabel}>TIME</span>
            <span style={styles.hudValue}>⏱️ {String(timerRef.current).padStart(3, '0')}</span>
          </div>
        </div>

        <div style={styles.fpsMeter}>
          FPS: <span style={{ color: fps >= 55 ? '#00ff66' : '#ffd600' }}>{fps}</span>
        </div>
      </div>

      <div style={styles.canvasWrapper} className="glass-panel">
        <canvas ref={canvasRef} style={styles.canvas}></canvas>

        {/* Loading Spinner Overlay */}
        {loading && (
          <div style={styles.overlay}>
            <Loader2 size={48} className="animate-spin" color="#00e5ff" />
            <h2 style={{ color: '#00e5ff', fontFamily: 'var(--font-game)', fontSize: '1rem', marginTop: '20px', letterSpacing: '2px' }}>
              LOADING AI LEVEL...
            </h2>
          </div>
        )}

        {/* Loading Error Overlay */}
        {loadingError && (
          <div style={styles.overlay}>
            <h2 style={styles.overlayTitleGameOver} className="retro-text-glow-red">
              LOAD ERROR
            </h2>
            <p style={{ ...styles.overlayText, color: '#ff3d00', margin: '16px 0', maxWidth: '400px', lineHeight: '1.6' }}>
              {loadingError}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-neon cyan" onClick={() => navigate('/')} style={styles.overlayBtn}>
                EXIT TO MENU
              </button>
              <button className="btn-neon" onClick={() => { setLoadingError(null); setCustomGrid(null); navigate('/game'); }} style={styles.overlayBtn}>
                PLAY STANDARD
              </button>
            </div>
          </div>
        )}

        {/* Game Over UI Overlay */}
        {gameState === 'gameover' && (
          <div style={styles.overlay}>
            <h2 style={styles.overlayTitleGameOver} className="retro-text-glow-red">GAME OVER</h2>
            <p style={styles.overlayText}>You ran out of lives!</p>

            <div style={styles.scoreContainer}>
              <div style={styles.scoreRow}>
                <span>FINAL SCORE:</span>
                <span style={styles.scoreVal}>{scoreRef.current.toLocaleString()} PTS</span>
              </div>
              <div style={styles.scoreRow}>
                <span>COINS COLLECTED:</span>
                <span style={styles.coinVal}>🪙 x{coinsRef.current}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-neon red" onClick={handleReset} style={styles.overlayBtn}>
                <RefreshCw size={16} /> REPLAY LEVEL
              </button>
              {levelId && (
                <button className="btn-neon purple" onClick={handleShare} style={styles.overlayBtn}>
                  <Share2 size={16} /> {shareCopied ? 'COPIED!' : 'SHARE LEVEL'}
                </button>
              )}
              <button className="btn-neon cyan" onClick={() => navigate('/')} style={styles.overlayBtn}>
                EXIT TO MENU
              </button>
            </div>
          </div>
        )}

        {/* Level Complete UI Overlay */}
        {gameState === 'complete' && (
          <div style={styles.overlay}>
            <h2 style={styles.overlayTitleComplete} className="retro-text-glow-green">STAGE CLEAR</h2>
            <p style={styles.overlayText}>Congratulations! You reached the castle!</p>
            
            <div style={styles.scoreContainer}>
              <div style={styles.scoreRow}>
                <span>FINAL SCORE:</span>
                <span style={styles.scoreVal}>{scoreRef.current.toLocaleString()} PTS</span>
              </div>
              <div style={styles.scoreRow}>
                <span>COINS COLLECTED:</span>
                <span style={styles.coinVal}>🪙 x{coinsRef.current}</span>
              </div>
            </div>

            {!localStorage.getItem('token') ? (
              <div style={styles.submitForm}>
                <p style={{ fontSize: '0.8rem', color: '#ff3d00', margin: '12px 0', fontFamily: 'var(--font-game)', lineHeight: '1.4' }}>
                  ⚠️ LOGIN REQUIRED TO SAVE SCORE
                </p>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <button className="btn-neon cyan" onClick={() => navigate('/login')} style={styles.submitBtn}>
                    LOG IN / REGISTER
                  </button>
                  {levelId && (
                    <button type="button" className="btn-neon purple" onClick={handleShare} style={{ ...styles.submitBtn, marginTop: '8px' }}>
                      <Share2 size={14} /> {shareCopied ? 'COPIED!' : 'SHARE LEVEL'}
                    </button>
                  )}
                  <button className="btn-neon" onClick={() => navigate('/')} style={{ ...styles.submitBtn, marginTop: '8px' }}>
                    EXIT TO MENU
                  </button>
                </div>
              </div>
            ) : !submitted ? (
              <form onSubmit={handleSubmitScore} style={styles.submitForm}>
                <p style={{ fontSize: '0.8rem', color: '#aaa', margin: '12px 0', fontFamily: 'var(--font-ui)' }}>
                  ENTER YOUR INITIALS TO JOIN THE RETRO LEADERBOARD
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value.toUpperCase().slice(0, 3))}
                    style={styles.scoreInput}
                    placeholder="MAR"
                    maxLength={3}
                    required
                  />
                  <button type="submit" disabled={submitting} className="btn-neon cyan" style={styles.submitBtn}>
                    {submitting ? 'SAVING...' : 'SUBMIT'}
                  </button>
                </div>
                {levelId && (
                  <button type="button" className="btn-neon purple" onClick={handleShare} style={{ ...styles.submitBtn, marginTop: '12px' }}>
                    <Share2 size={14} /> {shareCopied ? 'COPIED!' : 'SHARE LEVEL'}
                  </button>
                )}
              </form>
            ) : (
              <div style={styles.successMessage}>
                <p>💚 SCORE SAVED SUCCESSFULLY!</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                  <button className="btn-neon cyan" onClick={() => navigate('/leaderboard')}>
                    BACK TO LEADERBOARD
                  </button>
                  {levelId && (
                    <button className="btn-neon purple" onClick={handleShare}>
                      <Share2 size={14} /> {shareCopied ? 'COPIED!' : 'SHARE LEVEL'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile/On-Screen Touch Controls */}
      <div style={styles.touchControlsContainer} className="touch-controls-container">
        {/* D-Pad Directional Controls */}
        <div style={styles.dpad}>
          <button 
            style={{ 
              ...styles.touchBtn, 
              ...styles.touchBtnDirection,
              background: keysRef.current.left ? 'var(--color-accent-cyan)' : 'rgba(0, 0, 0, 0.5)',
              color: keysRef.current.left ? 'var(--color-bg-darker)' : '#fff'
            }}
            onTouchStart={(e) => { e.preventDefault(); keysRef.current.left = true; forceUpdate({}); }}
            onTouchEnd={(e) => { e.preventDefault(); keysRef.current.left = false; forceUpdate({}); }}
            onMouseDown={(e) => { e.preventDefault(); keysRef.current.left = true; forceUpdate({}); }}
            onMouseUp={(e) => { e.preventDefault(); keysRef.current.left = false; forceUpdate({}); }}
            onMouseLeave={(e) => { e.preventDefault(); keysRef.current.left = false; forceUpdate({}); }}
          >
            ◀
          </button>
          <button 
            style={{ 
              ...styles.touchBtn, 
              ...styles.touchBtnDirection,
              background: keysRef.current.right ? 'var(--color-accent-cyan)' : 'rgba(0, 0, 0, 0.5)',
              color: keysRef.current.right ? 'var(--color-bg-darker)' : '#fff'
            }}
            onTouchStart={(e) => { e.preventDefault(); keysRef.current.right = true; forceUpdate({}); }}
            onTouchEnd={(e) => { e.preventDefault(); keysRef.current.right = false; forceUpdate({}); }}
            onMouseDown={(e) => { e.preventDefault(); keysRef.current.right = true; forceUpdate({}); }}
            onMouseUp={(e) => { e.preventDefault(); keysRef.current.right = false; forceUpdate({}); }}
            onMouseLeave={(e) => { e.preventDefault(); keysRef.current.right = false; forceUpdate({}); }}
          >
            ▶
          </button>
        </div>

        {/* Jump Action Button */}
        <div style={styles.actionPad}>
          <button 
            style={{ 
              ...styles.touchBtn, 
              ...styles.touchBtnJump,
              background: keysRef.current.up ? 'var(--color-accent-purple)' : 'rgba(0, 0, 0, 0.5)',
              boxShadow: keysRef.current.up ? '0 0 20px var(--color-accent-purple)' : '0 0 10px rgba(156, 39, 176, 0.3)'
            }}
            onTouchStart={(e) => { e.preventDefault(); keysRef.current.up = true; forceUpdate({}); }}
            onTouchEnd={(e) => { e.preventDefault(); keysRef.current.up = false; forceUpdate({}); }}
            onMouseDown={(e) => { e.preventDefault(); keysRef.current.up = true; forceUpdate({}); }}
            onMouseUp={(e) => { e.preventDefault(); keysRef.current.up = false; forceUpdate({}); }}
            onMouseLeave={(e) => { e.preventDefault(); keysRef.current.up = false; forceUpdate({}); }}
          >
            A
          </button>
          <span style={styles.touchBtnLabel}>JUMP</span>
        </div>
      </div>

      <div style={styles.footerNote}>
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '4s' }} /> 
          Defeat Goombas, gather gold coins, and grab the finish flag to top the leaderboards!
        </p>
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
    padding: '20px',
    backgroundColor: '#05050d',
    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(156, 39, 176, 0.05) 0%, transparent 80%)',
    width: '100vw',
  },
  hudOverlay: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '820px',
    marginBottom: '16px',
    alignItems: 'center',
  },
  statsHud: {
    display: 'flex',
    gap: '24px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '8px 20px',
    borderRadius: '8px',
    fontFamily: 'var(--font-game)',
    fontSize: '0.65rem',
  },
  hudStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  hudLabel: {
    color: 'var(--color-text-muted)',
    fontSize: '0.5rem',
  },
  hudValue: {
    color: '#ffd600',
  },
  actionBtn: {
    padding: '8px 16px',
    fontSize: '0.65rem',
  },
  fpsMeter: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '6px 12px',
    borderRadius: '6px',
  },
  canvasWrapper: {
    position: 'relative', // enables child absolute layouts
    padding: '10px',
    background: 'rgba(20, 20, 35, 0.85)',
    border: '2px solid rgba(156, 39, 176, 0.4)',
    boxShadow: '0 0 30px rgba(156, 39, 176, 0.25)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    maxWidth: '800px',
    height: 'auto',
    aspectRatio: '16/10',
    display: 'block',
    imageRendering: 'pixelated',
    borderRadius: '6px',
  },
  footerNote: {
    marginTop: '20px',
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-ui)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    color: '#fff',
    fontFamily: 'var(--font-game)',
    textAlign: 'center',
    padding: '20px',
  },
  overlayTitleGameOver: {
    fontSize: '2.5rem',
    color: '#ff3d00',
    marginBottom: '16px',
    letterSpacing: '3px',
  },
  overlayTitleComplete: {
    fontSize: '2rem',
    color: '#00ff66',
    marginBottom: '16px',
    letterSpacing: '3px',
  },
  overlayText: {
    fontSize: '0.85rem',
    color: '#ccc',
    marginBottom: '24px',
    fontFamily: 'var(--font-ui)',
  },
  overlayBtn: {
    padding: '12px 24px',
    fontSize: '0.8rem',
  },
  scoreContainer: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '16px 24px',
    width: '100%',
    maxWidth: '360px',
    marginBottom: '20px',
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '8px 0',
    fontSize: '0.75rem',
  },
  scoreVal: {
    color: '#ffd600',
  },
  coinVal: {
    color: '#00e5ff',
  },
  submitForm: {
    width: '100%',
    maxWidth: '360px',
  },
  scoreInput: {
    background: 'rgba(0,0,0,0.5)',
    border: '2px solid rgba(156, 39, 176, 0.5)',
    borderRadius: '6px',
    color: '#fff',
    fontFamily: 'var(--font-game)',
    fontSize: '1.2rem',
    padding: '8px',
    width: '100px',
    textAlign: 'center',
    outline: 'none',
    textTransform: 'uppercase',
  },
  submitBtn: {
    padding: '10px 20px',
    fontSize: '0.75rem',
  },
  successMessage: {
    fontSize: '0.85rem',
    color: '#00ff66',
    marginTop: '10px',
  },
  touchControlsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '820px',
    marginTop: '20px',
    padding: '16px 24px',
    background: 'rgba(20, 20, 35, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
  },
  dpad: {
    display: 'flex',
    gap: '20px',
  },
  touchBtn: {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    outline: 'none',
    cursor: 'pointer',
    border: '2px solid',
    fontFamily: 'var(--font-game)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s ease',
  },
  touchBtnDirection: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    borderColor: 'var(--color-accent-cyan)',
    fontSize: '1.25rem',
    boxShadow: '0 0 10px rgba(0, 229, 255, 0.25)',
  },
  actionPad: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  touchBtnJump: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    borderColor: 'var(--color-accent-purple)',
    color: '#fff',
    fontSize: '1.2rem',
  },
  touchBtnLabel: {
    fontFamily: 'var(--font-game)',
    fontSize: '0.55rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '1px',
  }
};
