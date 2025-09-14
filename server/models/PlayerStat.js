import mongoose from 'mongoose';

const playerStatSchema = new mongoose.Schema({
  listType: { type: String, required: true, index: true },
  demonlistRank: { type: Number, required: true },
  name: { type: String, required: true },
  clan: { type: String },
  demonlistScore: { type: Number, required: true }
});

const PlayerStat = mongoose.model('PlayerStat', playerStatSchema);

export default PlayerStat;