import mongoose from 'mongoose';

const aiLevelSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true
  },
  grid: {
    type: [[Number]],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AILevel', aiLevelSchema);
