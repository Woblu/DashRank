import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  username: { type: String, required: true },
  percent: { type: Number, required: true },
  videoId: { type: String }
});

const levelSchema = new mongoose.Schema({
  listType: { type: String, required: true, index: true }, // 'main', 'platformer', etc.
  placement: { type: Number, required: true },
  name: { type: String, required: true },
  creator: { type: String },
  verifier: { type: String },
  levelId: { type: String, unique: true, sparse: true }, // unique but can be null/empty
  videoId: { type: String },
  description: { type: String },
  records: [recordSchema]
});

const Level = mongoose.model('Level', levelSchema);

export default Level;