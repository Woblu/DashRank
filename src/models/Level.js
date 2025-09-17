import mongoose from 'mongoose';

const RecordSchema = new mongoose.Schema({
  username: String,
  percent: Number,
  videoId: String,
});

const LevelSchema = new mongoose.Schema({
  placement: Number,
  name: String,
  creator: String,
  verifier: String,
  levelId: { type: Number, unique: true, sparse: true },
  videoId: String,
  description: String,
  records: [RecordSchema],
  list: { type: String, required: true, index: true },
});

export const Level = mongoose.models.Level || mongoose.model('Level', LevelSchema);