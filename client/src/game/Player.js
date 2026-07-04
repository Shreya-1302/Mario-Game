// Mario Player Class with Procedural Pixel-Art Renderer and Physics
import soundManager from './SoundManager';

const COLORS = {
  'R': '#e60012',  // Mario Red
  'B': '#002fbe',  // Mario Blue Overalls
  'P': '#fec193',  // Peach Skin
  'H': '#7b4300',  // Hair / Boots Brown
  'Y': '#ffcc00',  // Yellow Buttons
  'K': '#000000',  // Black eyes / mustache
  '.': null        // Transparent
};

// 12 columns x 16 rows pixel definitions for Mario
const SPRITE_GRIDS = {
  // Standing frame (Frame 0)
  0: [
    '....RRRRR...',
    '...RRRRRRRR.',
    '...HHRPPKP..',
    '..HRPKPKKHP.',
    '..HRPKPPKKK.',
    '..HHPKPPPP..',
    '....PPPPPP..',
    '...RRBRB....',
    '..RRRBBBRRR.',
    '.RRRRBBBRRRR',
    'PPRRYBBYBRPP',
    'PPBBBBBBBBPP',
    '.BBBBBBBBBB.',
    '..BBB..BBB..',
    '..HHH..HHH..',
    '.HHHH..HHHH.'
  ],
  // Walking frame 1 (Frame 1)
  1: [
    '....RRRRR...',
    '...RRRRRRRR.',
    '...HHRPPKP..',
    '..HRPKPKKHP.',
    '..HRPKPPKKK.',
    '..HHPKPPPP..',
    '....PPPPPP..',
    '...RRBRB....',
    '..RRRBBBRRR.',
    '.RRRRBBBRRRR',
    'PPRRYBBYBR..',
    '.PBBBBBBBB..',
    '..BBBBBBBB..',
    '..BBB..BBB..',
    '..HHH...HHH.',
    '.HHHH....HHH'
  ],
  // Walking frame 2 (Frame 2)
  2: [
    '....RRRRR...',
    '...RRRRRRRR.',
    '...HHRPPKP..',
    '..HRPKPKKHP.',
    '..HRPKPPKKK.',
    '..HHPKPPPP..',
    '....PPPPPP..',
    '...RRBRB....',
    '..RRRBBBRRR.',
    '.RRRRBBBRRRR',
    '..RYBBYBRPP.',
    '..BBBBBBBBPP',
    '..BBBBBBBB.P',
    '..BBB..BBB..',
    '.HHH...HHH..',
    'HHH.....HHHH'
  ],
  // Jumping frame (Frame 3)
  3: [
    '....RRRRR...',
    '...RRRRRRRR.',
    '...HHRPPKP..',
    '..HRPKPKKHP.',
    '..HRPKPPKKK.',
    '..HHPKPPPP..',
    '....PPPPPP..',
    '...RRBRB....',
    '.HRRRBBBRRRH',
    'H.RRRBBBRRRH',
    '..RRYBBYBR..',
    '..BBBBBBBB..',
    '.BBBBBBBBBB.',
    'HHH......HHH',
    'HHH......HHH',
    'HHH......HHH'
  ],
  // Death frame (Frame 4) - shocked eyes and hands up/out
  4: [
    '....RRRRR...',
    '...RRRRRRRR.',
    '...HHRPPKP..',
    '..HRKKKKKHP.', // X eyes / dark lines
    '..HRKPPPKKK.',
    '..HHKPPPPPP.',
    '....PPPPPP..',
    '..H.RRRR.H..', // Hands up
    '.H.RRBRBR.H.',
    'H.RRRRRRRR.H',
    '..RRYBBYBR..',
    '..BBBBBBBB..',
    '.BBBBBBBBBB.',
    '..BBB..BBB..',
    '..HHH..HHH..',
    '.HHHH..HHHH.'
  ]
};

// Pre-load and process spritesheet for Mario
const marioImage = new Image();
marioImage.src = '/mario_spritesheet.png';

let transparentCanvas = null;
let imageLoaded = false;

marioImage.onload = () => {
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = marioImage.naturalWidth;
    offscreen.height = marioImage.naturalHeight;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(marioImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgData.data;

    // Sample the top-left pixel (0,0) as the transparent color key
    const keyR = data[0];
    const keyG = data[1];
    const keyB = data[2];

    // Replace background color key with full transparency
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.abs(r - keyR) + Math.abs(g - keyG) + Math.abs(b - keyB);
      if (diff < 40) {
        data[i + 3] = 0; // Alpha = 0
      }
    }

    ctx.putImageData(imgData, 0, 0);
    transparentCanvas = offscreen;
    imageLoaded = true;
  } catch (e) {
    console.error('Failed to process Mario spritesheet background keying:', e);
  }
};

export default class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 48; // Aspect ratio of 2:3 fits a 12x16 grid
    this.vx = 0;
    this.vy = 0;
    this.speed = 4;
    this.jumpForce = -16.5;
    this.isOnGround = false;
    this.facing = 'right';
    this.isMoving = false;
    this.isDead = false;
    this.isCompletingLevel = false;

    // Animation states
    this.animTimer = 0;
    this.animFrame = 0; // 0: stand, 1: walk1, 2: walk2, 3: jump, 4: death
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.vy = -10; // Hop up
    this.vx = 0;
    this.isOnGround = false;
    soundManager.playDie();
  }

  update(deltaTime, keys, level, gravity) {
    const frameFactor = deltaTime / 16.67;

    if (this.isDead) {
      this.vy += gravity * frameFactor;
      this.y += this.vy * frameFactor;
      this.animFrame = 4;
      return;
    }

    const activeKeys = this.isCompletingLevel ? { left: false, right: false, up: false } : keys;

    // 1. Apply Horizontal Controls
    this.isMoving = false;
    if (activeKeys.left) {
      this.vx = -this.speed;
      this.facing = 'left';
      this.isMoving = true;
    } else if (activeKeys.right) {
      this.vx = this.speed;
      this.facing = 'right';
      this.isMoving = true;
    } else {
      this.vx = 0;
    }

    // Apply horizontal motion & resolve collisions
    this.x += this.vx * frameFactor;
    this.resolveCollisionsX(level);

    // Constrain within Level boundaries
    if (this.x < 0) {
      this.x = 0;
    } else if (this.x + this.width > level.width) {
      this.x = level.width - this.width;
    }

    // 2. Apply Vertical Physics (Gravity)
    this.vy += gravity * frameFactor;
    this.y += this.vy * frameFactor;
    this.isOnGround = false; // Will set to true if landing on a solid block
    this.resolveCollisionsY(level);

    // 3. Apply Jump trigger
    if (keys.up && this.isOnGround) {
      this.vy = this.jumpForce;
      this.isOnGround = false;
      soundManager.playJump();
    }

    // 4. Update Animation Frames
    if (!this.isOnGround) {
      this.animFrame = 3; // Jumping frame
    } else if (this.isMoving) {
      this.animTimer += deltaTime;
      if (this.animTimer > 100) { // Cycle walking frame every 100ms
        this.animFrame = this.animFrame === 1 ? 2 : 1;
        this.animTimer = 0;
      }
    } else {
      this.animFrame = 0; // Standing frame
      this.animTimer = 0;
    }
  }

  resolveCollisionsX(level) {
    const tileS = 32;
    const startCol = Math.floor(this.x / tileS);
    const endCol = Math.floor((this.x + this.width - 0.1) / tileS);
    const startRow = Math.max(0, Math.floor(this.y / tileS));
    const endRow = Math.min(14, Math.floor((this.y + this.height - 0.1) / tileS));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (level.isSolid(r, c)) {
          if (this.vx > 0) {
            this.x = c * tileS - this.width;
          } else if (this.vx < 0) {
            this.x = (c + 1) * tileS;
          }
          this.vx = 0;
          return;
        }
      }
    }
  }

  resolveCollisionsY(level) {
    const tileS = 32;
    const startCol = Math.floor(this.x / tileS);
    const endCol = Math.floor((this.x + this.width - 0.1) / tileS);
    const startRow = Math.max(0, Math.floor(this.y / tileS));
    const endRow = Math.min(14, Math.floor((this.y + this.height - 0.1) / tileS));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (level.isSolid(r, c)) {
          if (this.vy > 0) {
            // Landed on block top
            this.y = r * tileS - this.height;
            this.vy = 0;
            this.isOnGround = true;
          } else if (this.vy < 0) {
            // Hit block bottom
            this.y = (r + 1) * tileS;
            this.vy = 0;
            level.hitBlock(r, c);
          }
          return;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Flip drawing horizontally if Mario is facing left
    if (this.facing === 'left') {
      ctx.translate(this.x + this.width, this.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(this.x, this.y);
    }

    if (imageLoaded && transparentCanvas) {
      // The spritesheet is a horizontal strip of 5 frames
      const frameWidth = transparentCanvas.width / 5;
      const frameHeight = transparentCanvas.height;
      const sx = (this.animFrame >= 0 && this.animFrame <= 4 ? this.animFrame : 0) * frameWidth;

      ctx.drawImage(
        transparentCanvas,
        sx, 0, frameWidth, frameHeight, // source
        0, 0, this.width, this.height   // destination
      );
    } else {
      // Render Mario from the selected grid array (procedural fallback)
      const grid = SPRITE_GRIDS[this.animFrame] || SPRITE_GRIDS[0];
      const cellW = this.width / 12;
      const cellH = this.height / 16;

      for (let row = 0; row < 16; row++) {
        const line = grid[row];
        for (let col = 0; col < 12; col++) {
          const char = line[col];
          const color = COLORS[char];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(
              Math.floor(col * cellW),
              Math.floor(row * cellH),
              Math.ceil(cellW),
              Math.ceil(cellH)
            );
          }
        }
      }
    }
    ctx.restore();
  }
}
