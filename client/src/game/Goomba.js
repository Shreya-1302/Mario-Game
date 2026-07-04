// Goomba enemy class with patrolling physics and procedural pixel-art renderer

const COLORS = {
  'B': '#a84400', // Brown cap
  'S': '#fec193', // Stem/Face skin
  'E': '#000000', // Black eyes/mouth
  'W': '#ffffff', // White eyes
  'F': '#4c2c00', // Feet (dark brown)
  '.': null
};

const SPRITE_GRIDS = {
  // Frame 0 (Walk 1)
  0: [
    '......BBBB......',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '..BBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBB.',
    '.BWWEEBWWEEBBBB.',
    'BWWEEBBWWEEBBBBB',
    'BBWEEBBWWEEBBBBB',
    'BBBBBBBBBBBBBBBB',
    '..BBBBBBBBBBBB..',
    '...SSSSSSSSSS...',
    '..SSSSSSSSSSSS..',
    '.FFFFSSSSSSFF..',
    'FFFFFSSSSSFFFF.',
    'FFFF.SSSS..FFF.',
    '.FF..SSSS...FF.'
  ],
  // Frame 1 (Walk 2)
  1: [
    '......BBBB......',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '..BBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBB.',
    '.BWWEEBWWEEBBBB.',
    'BWWEEBBWWEEBBBBB',
    'BBWEEBBWWEEBBBBB',
    'BBBBBBBBBBBBBBBB',
    '..BBBBBBBBBBBB..',
    '...SSSSSSSSSS...',
    '..SSSSSSSSSSSS..',
    '..FFSSSSSSFFFF.',
    '.FFFFSSSSSFFFFF',
    '.FFF..SSSS.FFFF',
    '.FF...SSSS..FF.'
  ],
  // Frame 2 (Squished)
  2: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '......BBBB......',
    '....BBBBBBBB....',
    '..BBBBBBBBBBBB..',
    '..BWWEEBWWEEBB..',
    '.BWWEEBBWWEEBBB.',
    'BBBBBBBBBBBBBBBB',
    '..SSSSSSSSSSSS..',
    '.FFFFFFFFFFSSFF.'
  ]
};

export default class Goomba {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 32;
    this.vx = -1.0; // Walk left initially
    this.vy = 0;
    this.isOnGround = false;
    this.isSquished = false;
    this.isDead = false;
    this.squishTimer = 0;

    this.animTimer = 0;
    this.animFrame = 0;
  }

  squish() {
    this.isSquished = true;
    this.vx = 0;
    this.vy = 0;
    this.squishTimer = 500; // Show squished frame for 500ms
  }

  update(deltaTime, level, gravity) {
    const frameFactor = deltaTime / 16.67;

    if (this.isSquished) {
      this.squishTimer -= deltaTime;
      if (this.squishTimer <= 0) {
        this.isDead = true;
      }
      return;
    }

    // 1. Move horizontally
    this.x += this.vx * frameFactor;
    
    // Reverse direction if hit left/right boundaries of level
    if (this.x < 0) {
      this.x = 0;
      this.vx = -this.vx;
    } else if (this.x + this.width > level.width) {
      this.x = level.width - this.width;
      this.vx = -this.vx;
    }

    // Check vertical wall collisions
    this.resolveCollisionsX(level);

    // 2. Apply gravity & move vertically
    this.vy += gravity * frameFactor;
    this.y += this.vy * frameFactor;
    this.isOnGround = false;
    this.resolveCollisionsY(level);

    // 3. Reverse at ledge edges (so they don't fall off platforms)
    if (this.isOnGround) {
      const frontX = this.vx > 0 ? this.x + this.width : this.x;
      const tileBelowCol = Math.floor(frontX / 32);
      const tileBelowRow = Math.floor((this.y + this.height + 2) / 32);
      
      // If the tile immediately under their leading edge is empty, reverse!
      if (!level.isSolid(tileBelowRow, tileBelowCol)) {
        this.vx = -this.vx;
      }
    }

    // 4. Update walk animation frames
    this.animTimer += deltaTime;
    if (this.animTimer > 150) {
      this.animFrame = this.animFrame === 0 ? 1 : 0;
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
            this.vx = -this.vx;
          } else if (this.vx < 0) {
            this.x = (c + 1) * tileS;
            this.vx = -this.vx;
          }
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
            this.y = r * tileS - this.height;
            this.vy = 0;
            this.isOnGround = true;
          } else if (this.vy < 0) {
            this.y = (r + 1) * tileS;
            this.vy = 0;
          }
          return;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Draw relative to Goomba x, y
    ctx.translate(this.x, this.y);

    const frame = this.isSquished ? 2 : this.animFrame;
    const grid = SPRITE_GRIDS[frame] || SPRITE_GRIDS[0];
    const cellW = this.width / 16;
    const cellH = this.height / 16;

    for (let row = 0; row < 16; row++) {
      const line = grid[row];
      for (let col = 0; col < 16; col++) {
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

    ctx.restore();
  }
}
