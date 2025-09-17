import mongoose from 'mongoose';

const PlayerStatSchema = new mongoose.Schema({
  demonlistRank: Number,
  name: String,
  clan: String,
  demonlistScore: Number,
  list: { type: String, required: true, index: true },
});

export const PlayerStat = mongoose.models.PlayerStat || mongoose.model('PlayerStat', PlayerStatSchema);