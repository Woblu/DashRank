// src/pages/LeaderboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/leaderboard');
        setLeaderboard(res.data);
      } catch (err) {
        setError('Failed to load leaderboard. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="text-white max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <Trophy className="mx-auto w-16 h-16 text-yellow-400" />
        <h1 className="text-4xl font-bold mt-4">Global Player Leaderboard</h1>
        <p className="text-gray-400 mt-2">Ranking players based on a weighted score from all lists.</p>
      </div>

      {loading && <div className="text-center py-10">Loading leaderboard...</div>}
      {error && <div className="text-red-400 text-center py-10">{error}</div>}
      
      {!loading && !error && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-900">
              <tr>
                <th className="p-4 w-16 text-center">Rank</th>
                <th className="p-4">Player</th>
                <th className="p-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.id} className={`border-t border-gray-700 ${index < 3 ? 'text-lg' : ''}`}>
                  <td className="p-4 w-16 text-center font-bold">
                    {entry.rank === 1 && '🥇'}
                    {entry.rank === 2 && '🥈'}
                    {entry.rank === 3 && '🥉'}
                    {entry.rank > 3 && `#${entry.rank}`}
                  </td>
                  <td className={`p-4 font-semibold ${entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-yellow-600' : ''}`}>
                    {entry.player}
                  </td>
                  <td className="p-4 text-right font-mono text-cyan-400">{entry.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}