import express from 'express';
import { OpenAI } from 'openai';
import AILevel from '../models/AILevel.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

const router = express.Router();

// Temporary in-memory fallback cache if MongoDB is offline
const mockAILevels = new Map();

router.post('/generate-level', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required and must be a string' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API key is missing. Please set OPENAI_API_KEY in server/.env");
    return res.status(500).json({ error: 'OpenAI API key is not configured on the server. Please add OPENAI_API_KEY to server/.env' });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a Mario level designer. Return ONLY a valid JSON object with a single key "level" containing a 2D array (15 rows x 40 cols).
Use ONLY these numbers:
0 = empty space
1 = brick block
2 = pipe block
3 = enemy (Goomba)
4 = gold coin

Constraints:
- The array must be exactly 15 rows by 40 columns.
- Row 14 (the bottom row) must be all 1s (ground).
- Do not include any explanations, comments, or markdown formatting. The response must be parseable as strict JSON.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const rawContent = response.choices[0].message.content;
    let levelData;
    try {
      levelData = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error("OpenAI returned invalid JSON:", rawContent);
      return res.status(502).json({ error: 'AI returned an invalid JSON response. Please try again.' });
    }

    if (!levelData || !Array.isArray(levelData.level)) {
      return res.status(502).json({ error: 'AI response did not match the expected level format.' });
    }

    const grid = levelData.level;
    if (grid.length !== 15 || !grid.every(row => Array.isArray(row) && row.length === 40)) {
      return res.status(502).json({ error: 'Generated level grid must be exactly 15 rows by 40 columns.' });
    }

    // Save to MongoDB or local cache fallback
    const isDbConnected = mongoose.connection.readyState === 1;
    let savedLevel;

    if (isDbConnected) {
      savedLevel = await AILevel.create({ prompt, grid });
    } else {
      const fakeId = `offline_${crypto.randomUUID()}`;
      savedLevel = {
        _id: fakeId,
        prompt,
        grid,
        createdAt: new Date()
      };
      mockAILevels.set(fakeId, savedLevel);
      console.log(`Saved level in memory cache (offline mode): ${fakeId}`);
    }

    res.status(201).json(savedLevel);
  } catch (err) {
    console.error("Error generating level via OpenAI:", err);
    console.log("Generating a procedural fallback level instead...");
    
    const grid = generateProceduralFallback(prompt);
    const isDbConnected = mongoose.connection.readyState === 1;
    let savedLevel;

    if (isDbConnected) {
      savedLevel = await AILevel.create({ prompt: `${prompt} (Demo Fallback)`, grid });
    } else {
      const fakeId = `offline_${crypto.randomUUID()}`;
      savedLevel = {
        _id: fakeId,
        prompt: `${prompt} (Demo Fallback)`,
        grid,
        createdAt: new Date()
      };
      mockAILevels.set(fakeId, savedLevel);
    }

    // Return the generated fallback stage
    res.status(201).json({
      ...savedLevel.toObject ? savedLevel.toObject() : savedLevel,
      note: "OpenAI API quota exceeded or key invalid. Generated a procedural level as fallback."
    });
  }
});

function generateProceduralFallback(prompt) {
  const ROWS = 15;
  const COLS = 40;
  const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

  // Fill ground with some pits to jump over
  for (let c = 0; c < COLS; c++) {
    if ((c >= 14 && c <= 15) || (c >= 26 && c <= 27)) {
      continue;
    }
    grid[13][c] = 1;
    grid[14][c] = 1;
  }

  // Bricks at row 9
  grid[9][8] = 1;
  grid[9][9] = 1;
  grid[9][10] = 1;
  grid[9][11] = 1;

  // Single tile Pipe at col 12
  grid[12][12] = 2;
  grid[11][12] = 2;

  // Floating platform at row 5
  grid[5][18] = 1;
  grid[5][19] = 1;
  grid[5][20] = 1;

  // Another pipe at col 23
  grid[12][23] = 2;
  grid[11][23] = 2;

  // Bricks near the flag
  grid[9][30] = 1;
  grid[9][31] = 1;
  grid[9][32] = 1;

  // Coins (4)
  grid[8][9] = 4;
  grid[8][10] = 4;
  grid[4][19] = 4;

  // Enemies (3)
  grid[12][6] = 3;
  grid[12][20] = 3;
  grid[12][31] = 3;

  const lowercasePrompt = prompt.toLowerCase();
  const manyEnemies = lowercasePrompt.includes('enemy') || lowercasePrompt.includes('goomba') || lowercasePrompt.includes('hard');
  const isHard = lowercasePrompt.includes('hard') || lowercasePrompt.includes('tricky') || lowercasePrompt.includes('difficult');

  if (manyEnemies) {
    grid[12][10] = 3;
    grid[12][25] = 3;
  }

  if (isHard) {
    // Tricky blocks
    grid[7][14] = 1;
    grid[6][15] = 1;
    grid[5][16] = 1;
    grid[12][33] = 3;
  }

  return grid;
}

router.get('/level/:id', async (req, res) => {
  const { id } = req.params;
  const isDbConnected = mongoose.connection.readyState === 1;

  try {
    let levelDoc;
    if (isDbConnected) {
      levelDoc = await AILevel.findById(id);
    } else {
      levelDoc = mockAILevels.get(id);
    }

    if (!levelDoc) {
      return res.status(404).json({ error: 'Level not found' });
    }

    res.json(levelDoc);
  } catch (err) {
    console.error("Error retrieving level:", err);
    res.status(500).json({ error: 'Failed to retrieve level' });
  }
});

export default router;
