import express from 'express';
import Score from '../models/Score.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Mock data fallback if MongoDB is not connected
let mockScores = [
  { _id: '1', username: 'MARIO', score: 12500, level: 'World 1-1', date: new Date() },
  { _id: '2', username: 'LUIGI', score: 9800, level: 'World 1-1', date: new Date() },
  { _id: '3', username: 'TOAD', score: 4500, level: 'World 1-1', date: new Date() }
];

// GET /api/scores/leaderboard AND GET /api/scores
const getLeaderboard = async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    try {
      const scores = await Score.find()
        .populate('userId', 'name')
        .sort({ score: -1 })
        .limit(10);

      // Map to a cleaner output structure
      const formattedScores = scores.map(s => ({
        _id: s._id,
        username: s.userId ? s.userId.name : 'Unknown',
        score: s.score,
        level: s.level,
        date: s.date
      }));
      return res.json(formattedScores);
    } catch (err) {
      console.error('Error fetching scores:', err);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  } else {
    // Return mock scores in offline mode
    return res.json(mockScores);
  }
};

router.get('/leaderboard', getLeaderboard);
router.get('/', getLeaderboard); // Support legacy dashboard endpoint

// POST /api/scores (requires authentication)
router.post('/', auth, async (req, res) => {
  const { score, level } = req.body;
  
  if (score === undefined) {
    return res.status(400).json({ error: 'Score is required' });
  }

  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    try {
      const newScore = await Score.create({
        userId: req.user.id,
        score,
        level: level || 'World 1-1'
      });
      return res.status(201).json(newScore);
    } catch (err) {
      console.error('Error saving score:', err);
      return res.status(500).json({ error: 'Failed to save score' });
    }
  } else {
    // Save to local mock list in offline mode
    const fakeScore = {
      _id: Date.now().toString(),
      username: req.user.name || 'MAR',
      score,
      level: level || 'World 1-1',
      date: new Date()
    };
    mockScores.push(fakeScore);
    mockScores.sort((a, b) => b.score - a.score);
    mockScores = mockScores.slice(0, 10);
    return res.status(201).json(fakeScore);
  }
});

export default router;
