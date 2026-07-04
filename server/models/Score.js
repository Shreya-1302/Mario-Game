import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  level: {
    type: String,
    default: 'World 1-1'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Score', scoreSchema);
