// Level class managing the grid structure, scenery blocks, and hit animations
import Goomba from './Goomba';

export const TILE_SIZE = 32;
export const ROWS = 15;
export const COLS = 120;

export const TILE_TYPES = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QUESTION: 3,
  METAL: 4,      // Struck / inert block
  PIPE_TL: 5,    // Pipe Top-Left
  PIPE_TR: 6,    // Pipe Top-Right
  PIPE_BL: 7,    // Pipe Body-Left
  PIPE_BR: 8,    // Pipe Body-Right
  STAIR: 9,      // Solid brick pyramid block
  PIPE: 10       // Custom AI single-tile pipe block
};

export default class Level {
  constructor(onCoinSpawned, customGrid = null) {
    this.onCoinSpawned = onCoinSpawned; // Callback to notify canvas score

    // Bouncing block states: key is 'row,col' -> value is { offset: 0, time: 0 }
    this.bouncingBlocks = new Map();

    // Visual coins that pop up when hitting blocks
    this.floatingCoins = [];

    // Flashing visual timer for Question blocks
    this.flashTimer = 0;

    // Spawning enemies & coins
    this.enemies = [];
    this.coins = [];

    if (customGrid) {
      const originalCols = customGrid[0].length;
      // Pad to 50 columns
      const paddedCols = originalCols + 10;
      this.cols = paddedCols;
      this.width = paddedCols * TILE_SIZE;
      this.height = ROWS * TILE_SIZE;

      this.grid = Array(ROWS).fill(null).map(() => Array(paddedCols).fill(TILE_TYPES.EMPTY));

      // Populate custom grid values
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < originalCols; c++) {
          const val = customGrid[r][c];
          if (val === 1) {
            // Brick or ground
            if (r >= 13) {
              this.grid[r][c] = TILE_TYPES.GROUND;
            } else {
              this.grid[r][c] = TILE_TYPES.BRICK;
            }
          } else if (val === 2) {
            // Pipe
            this.grid[r][c] = TILE_TYPES.PIPE;
          } else if (val === 3) {
            // Enemy (spawn Goomba)
            this.enemies.push(new Goomba(c * TILE_SIZE, r * TILE_SIZE));
          } else if (val === 4) {
            // Coin
            this.coins.push({
              x: c * TILE_SIZE + 8,
              y: r * TILE_SIZE + 4,
              width: 16,
              height: 24
            });
          }
        }
      }

      // Pad remaining columns with ground
      for (let c = originalCols; c < paddedCols; c++) {
        this.grid[13][c] = TILE_TYPES.GROUND;
        this.grid[14][c] = TILE_TYPES.GROUND;
      }

      // Add the flagpole block at paddedCols - 6
      const flagCol = paddedCols - 6;
      this.grid[12][flagCol] = TILE_TYPES.STAIR;

      this.flagpoleCol = flagCol;
      this.flagpoleX = this.flagpoleCol * TILE_SIZE;
      this.castleCol = paddedCols - 2;
      this.castleX = this.castleCol * TILE_SIZE;
      this.checkpointX = this.width / 2;
    } else {
      this.cols = COLS;
      this.width = COLS * TILE_SIZE;
      this.height = ROWS * TILE_SIZE;
      this.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_TYPES.EMPTY));
      this.generateLevel();

      this.flagpoleCol = 114;
      this.flagpoleX = this.flagpoleCol * TILE_SIZE;
      this.castleCol = 118;
      this.castleX = this.castleCol * TILE_SIZE;
      this.checkpointX = 1800;

      this.spawnEnemies();
      this.spawnCoins();
    }
  }

  generateLevel() {
    // 1. Fill ground tiles (bottom two rows)
    for (let col = 0; col < COLS; col++) {
      // Create empty pits to make jumping fun!
      if ((col >= 38 && col <= 40) || (col >= 70 && col <= 72) || (col >= 100 && col <= 102)) {
        continue;
      }
      this.grid[13][col] = TILE_TYPES.GROUND;
      this.grid[14][col] = TILE_TYPES.GROUND;
    }

    // 2. Add Bricks and Question Blocks
    // Row 9 is y = 9 * 32 = 288px (height matches Mario's jumps)
    this.addHorizontalBlocks(9, 14, [
      TILE_TYPES.BRICK,
      TILE_TYPES.QUESTION,
      TILE_TYPES.BRICK,
      TILE_TYPES.QUESTION,
      TILE_TYPES.BRICK
    ]);

    // High floating platforms
    this.addHorizontalBlocks(5, 22, [TILE_TYPES.QUESTION]);
    this.addHorizontalBlocks(5, 48, [TILE_TYPES.BRICK, TILE_TYPES.QUESTION, TILE_TYPES.BRICK]);

    // 3. Add Green Pipes (Pipes are solid obstacles)
    // Pipe 1 (Short)
    this.grid[11][32] = TILE_TYPES.PIPE_TL; this.grid[11][33] = TILE_TYPES.PIPE_TR;
    this.grid[12][32] = TILE_TYPES.PIPE_BL; this.grid[12][33] = TILE_TYPES.PIPE_BR;

    // Pipe 2 (Medium)
    this.grid[10][54] = TILE_TYPES.PIPE_TL; this.grid[10][55] = TILE_TYPES.PIPE_TR;
    this.grid[11][54] = TILE_TYPES.PIPE_BL; this.grid[11][55] = TILE_TYPES.PIPE_BR;
    this.grid[12][54] = TILE_TYPES.PIPE_BL; this.grid[12][55] = TILE_TYPES.PIPE_BR;

    // Pipe 3 (Tall)
    this.grid[9][82] = TILE_TYPES.PIPE_TL; this.grid[9][83] = TILE_TYPES.PIPE_TR;
    this.grid[10][82] = TILE_TYPES.PIPE_BL; this.grid[10][83] = TILE_TYPES.PIPE_BR;
    this.grid[11][82] = TILE_TYPES.PIPE_BL; this.grid[11][83] = TILE_TYPES.PIPE_BR;
    this.grid[12][82] = TILE_TYPES.PIPE_BL; this.grid[12][83] = TILE_TYPES.PIPE_BR;

    // 4. Add Staircase Block Pyramids
    // Left-up pyramid
    this.addStairPyramid(62, 4, 'up');
    // Right-down pyramid
    this.addStairPyramid(68, 4, 'down');

    // 5. Final brick layout near the flag
    this.addHorizontalBlocks(9, 90, [
      TILE_TYPES.BRICK, TILE_TYPES.BRICK, TILE_TYPES.QUESTION, 
      TILE_TYPES.BRICK, TILE_TYPES.BRICK, TILE_TYPES.BRICK
    ]);

    // Flagpole block helper (drawn procedurally)
    this.grid[12][114] = TILE_TYPES.STAIR;
  }

  spawnEnemies() {
    const goombaXCoords = [640, 1120, 1440, 1600, 2464, 2720, 3072, 3392];
    goombaXCoords.forEach(x => {
      this.enemies.push(new Goomba(x, 384));
    });
  }

  spawnCoins() {
    this.coins = [
      // Group 1
      { x: 400, y: 320, width: 16, height: 24 },
      { x: 432, y: 320, width: 16, height: 24 },
      { x: 464, y: 320, width: 16, height: 24 },
      // Group 2 (over first brick platform)
      { x: 15 * 32 + 8, y: 224, width: 16, height: 24 },
      { x: 17 * 32 + 8, y: 224, width: 16, height: 24 },
      // Group 3 (in the air before medium pipe)
      { x: 1300, y: 320, width: 16, height: 24 },
      { x: 1332, y: 320, width: 16, height: 24 },
      { x: 1364, y: 320, width: 16, height: 24 },
      // Group 4 (above high blocks)
      { x: 48 * 32 + 8, y: 96, width: 16, height: 24 },
      { x: 50 * 32 + 8, y: 96, width: 16, height: 24 },
      // Group 5 (after staircase)
      { x: 2300, y: 320, width: 16, height: 24 },
      { x: 2332, y: 320, width: 16, height: 24 },
      { x: 2364, y: 320, width: 16, height: 24 },
      // Group 6 (on bricks before flagpole)
      { x: 91 * 32 + 8, y: 224, width: 16, height: 24 },
      { x: 93 * 32 + 8, y: 224, width: 16, height: 24 },
      { x: 95 * 32 + 8, y: 224, width: 16, height: 24 }
    ];
  }

  addHorizontalBlocks(row, startCol, typesList) {
    typesList.forEach((type, index) => {
      const col = startCol + index;
      if (col < this.cols) {
        this.grid[row][col] = type;
      }
    });
  }

  addStairPyramid(startCol, steps, direction) {
    for (let r = 0; r < steps; r++) {
      const row = 12 - r; // Work upwards from the ground
      for (let c = 0; c < steps - r; c++) {
        const col = direction === 'up' 
          ? startCol + r + c 
          : startCol + c;
        if (col < this.cols && row < ROWS) {
          this.grid[row][col] = TILE_TYPES.STAIR;
        }
      }
    }
  }

  isSolid(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= this.cols) {
      // Bounding box edges: treat off-screen bottom as solid ground (if not pit)
      // but treat off-screen left/right as solid boundaries.
      if (row >= ROWS) return false; // Pits drop you
      return true;
    }
    const type = this.grid[row][col];
    return type !== TILE_TYPES.EMPTY;
  }

  getTileAt(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= this.cols) return TILE_TYPES.EMPTY;
    return this.grid[row][col];
  }

  hitBlock(row, col) {
    const tile = this.getTileAt(row, col);
    const key = `${row},${col}`;

    if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.QUESTION) {
      // Ignore if already bouncing
      if (this.bouncingBlocks.has(key)) return;

      // Start bounce animation
      this.bouncingBlocks.set(key, {
        timer: 0,
        maxTime: 120, // 120ms animation
        yOffset: 0
      });

      // Special box collision effects
      if (tile === TILE_TYPES.QUESTION) {
        // Change Question block to hit metal block
        this.grid[row][col] = TILE_TYPES.METAL;

        // Spawn a coin!
        const coinX = col * TILE_SIZE + 8; // Centered
        const coinY = row * TILE_SIZE - 10;
        this.floatingCoins.push({
          x: coinX,
          y: coinY,
          vy: -6, // shoots up
          timer: 0
        });

        // Trigger parent callback
        if (this.onCoinSpawned) this.onCoinSpawned();
      }
    }
  }

  update(deltaTime) {
    // 1. Update flash timer for question marks
    this.flashTimer += deltaTime;

    // 2. Update bouncing block positions
    for (const [key, block] of this.bouncingBlocks.entries()) {
      block.timer += deltaTime;
      if (block.timer >= block.maxTime) {
        this.bouncingBlocks.delete(key);
      } else {
        // Sine displacement curve (up and back down)
        const progress = block.timer / block.maxTime;
        block.yOffset = -Math.sin(progress * Math.PI) * 8; // Max 8px vertical bounce
      }
    }

    // 3. Update floating coins
    this.floatingCoins.forEach((coin, index) => {
      coin.vy += 0.4; // Local gravity
      coin.y += coin.vy;
      coin.timer += deltaTime;

      if (coin.timer > 400) { // Disappear after 400ms
        this.floatingCoins.splice(index, 1);
      }
    });

    // 4. Update Goombas
    const gravity = 0.6;
    this.enemies.forEach((enemy) => {
      enemy.update(deltaTime, this, gravity);
    });
    this.enemies = this.enemies.filter(enemy => !enemy.isDead);
  }

  draw(ctx, cameraX) {
    // Calculate visible column indices to optimize rendering (culling)
    const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const endCol = Math.min(this.cols, Math.ceil((cameraX + ctx.canvas.width) / TILE_SIZE));

    for (let row = 0; row < ROWS; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile = this.grid[row][col];
        if (tile === TILE_TYPES.EMPTY) continue;

        // Check if this block is currently playing a hit bounce offset
        const key = `${row},${col}`;
        const bounce = this.bouncingBlocks.get(key);
        const yOffset = bounce ? bounce.yOffset : 0;

        const tx = col * TILE_SIZE;
        const ty = row * TILE_SIZE + yOffset;

        this.drawTile(ctx, tile, tx, ty);
      }
    }

    // Draw static collectible coins
    ctx.fillStyle = '#ffd600';
    ctx.strokeStyle = '#ff7c00';
    ctx.lineWidth = 1;
    const coinAnim = Math.floor(Date.now() / 150) % 4;
    const coinScaleX = coinAnim === 0 ? 1 : coinAnim === 1 ? 0.5 : coinAnim === 2 ? 0.15 : 0.5;

    this.coins.forEach((coin) => {
      if (coin.x + coin.width < cameraX || coin.x > cameraX + ctx.canvas.width) return;
      ctx.save();
      ctx.translate(coin.x + 8, coin.y + 12);
      ctx.scale(coinScaleX, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -4, 2, 4);
      ctx.restore();
    });

    // Draw flagpole at the end
    this.drawFlagpole(ctx, this.flagpoleX);

    // Draw active floating coins
    ctx.fillStyle = '#ffd600';
    ctx.strokeStyle = '#ff7c00';
    ctx.lineWidth = 1;
    this.floatingCoins.forEach((coin) => {
      ctx.beginPath();
      // Draw pixelated gold coin oval
      ctx.ellipse(coin.x + 8, coin.y + 8, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw enemies
    this.enemies.forEach((enemy) => {
      if (enemy.x + enemy.width >= cameraX && enemy.x <= cameraX + ctx.canvas.width) {
        enemy.draw(ctx);
      }
    });
  }

  drawTile(ctx, tile, x, y) {
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    switch (tile) {
      case TILE_TYPES.GROUND:
        // Dirt blocks with grass top
        ctx.fillStyle = '#b84418';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        // Grass top edge
        ctx.fillStyle = '#4c9c00';
        ctx.fillRect(x, y, TILE_SIZE, 5);
        break;

      case TILE_TYPES.BRICK:
        // Brick platform blocks
        ctx.fillStyle = '#d85800';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        // Brick texture markings
        ctx.fillStyle = '#fc9c5c';
        ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, 2); // top highlights
        ctx.fillStyle = '#5c1000'; // mortar lines
        ctx.fillRect(x, y + 10, TILE_SIZE, 2);
        ctx.fillRect(x, y + 20, TILE_SIZE, 2);
        ctx.fillRect(x + 8, y, 2, 10);
        ctx.fillRect(x + 22, y, 2, 10);
        ctx.fillRect(x + 15, y + 10, 2, 10);
        ctx.fillRect(x + 8, y + 20, 2, 12);
        ctx.fillRect(x + 22, y + 20, 2, 12);
        break;

      case TILE_TYPES.QUESTION:
        // Flashing yellow question block
        const flash = Math.floor(this.flashTimer / 150) % 3;
        ctx.fillStyle = flash === 0 ? '#fc9c5c' : flash === 1 ? '#fcc45c' : '#ffd600';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // Question Mark '?' text
        ctx.fillStyle = '#a83c00';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + TILE_SIZE/2, y + TILE_SIZE/2);

        // Border details
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 2, y + 2, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 4, y + 2, 2, 2);
        ctx.fillRect(x + 2, y + TILE_SIZE - 4, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 4, y + TILE_SIZE - 4, 2, 2);
        break;

      case TILE_TYPES.METAL:
        // Hit inert block (plain brown with corner dots)
        ctx.fillStyle = '#8c5c00';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        // Corner details
        ctx.fillStyle = '#4c2c00';
        ctx.fillRect(x + 3, y + 3, 3, 3);
        ctx.fillRect(x + TILE_SIZE - 6, y + 3, 3, 3);
        ctx.fillRect(x + 3, y + TILE_SIZE - 6, 3, 3);
        ctx.fillRect(x + TILE_SIZE - 6, y + TILE_SIZE - 6, 3, 3);
        break;

      case TILE_TYPES.STAIR:
        // Stair blocks (brown brick scale texture)
        ctx.fillStyle = '#fc9c5c';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        // Grid pattern
        ctx.fillStyle = '#000';
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        break;

      // Draw pipe parts
      case TILE_TYPES.PIPE_TL:
        ctx.fillStyle = '#00a800';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        // Inner highlight shine
        ctx.fillStyle = '#80e080';
        ctx.fillRect(x + 6, y, 4, TILE_SIZE);
        break;

      case TILE_TYPES.PIPE_TR:
        ctx.fillStyle = '#00a800';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        // Dark pipe shade
        ctx.fillStyle = '#006000';
        ctx.fillRect(x + TILE_SIZE - 8, y, 4, TILE_SIZE);
        break;

      case TILE_TYPES.PIPE_BL:
        ctx.fillStyle = '#008800';
        ctx.fillRect(x + 4, y, TILE_SIZE - 4, TILE_SIZE);
        ctx.strokeRect(x + 4, y, TILE_SIZE - 4, TILE_SIZE);
        // Shine
        ctx.fillStyle = '#80e080';
        ctx.fillRect(x + 8, y, 3, TILE_SIZE);
        break;

      case TILE_TYPES.PIPE_BR:
        ctx.fillStyle = '#008800';
        ctx.fillRect(x, y, TILE_SIZE - 4, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE - 4, TILE_SIZE);
        // Shadow
        ctx.fillStyle = '#006000';
        ctx.fillRect(x + TILE_SIZE - 10, y, 3, TILE_SIZE);
        break;

      case TILE_TYPES.PIPE:
        // Beautiful single-tile classic Mario pipe block
        ctx.fillStyle = '#00a800';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        // Shiny highlight
        ctx.fillStyle = '#80e080';
        ctx.fillRect(x + 4, y, 4, TILE_SIZE);
        // Shadow/dark side
        ctx.fillStyle = '#006000';
        ctx.fillRect(x + TILE_SIZE - 8, y, 4, TILE_SIZE);
        break;
    }

    ctx.restore();
  }

  drawFlagpole(ctx, x) {
    ctx.save();
    
    const groundY = ROWS * TILE_SIZE - 64; // flag base
    
    // Pole
    ctx.fillStyle = '#cccccc';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.fillRect(x + 14, 2 * TILE_SIZE, 4, groundY - 2 * TILE_SIZE);
    ctx.strokeRect(x + 14, 2 * TILE_SIZE, 4, groundY - 2 * TILE_SIZE);

    // Green ball top
    ctx.fillStyle = '#00a800';
    ctx.beginPath();
    ctx.arc(x + 16, 2 * TILE_SIZE - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flag (green canvas triangle/rectangle with skull or star insignia)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + 14, 2.5 * TILE_SIZE);
    ctx.lineTo(x - 16, 3.5 * TILE_SIZE);
    ctx.lineTo(x + 14, 4.5 * TILE_SIZE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Star insignia inside flag
    ctx.fillStyle = '#ffd600';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', x - 2, 3.6 * TILE_SIZE);

    ctx.restore();
  }
}
