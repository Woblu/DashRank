// src/utils/scoring.js

/**
 * Calculates the score for a level based on its placement on the main list.
 * This formula is based on the new "Pro Model" (500-point exponential decay).
 * @param {number} placement - The level's placement (e.g., 1 for #1).
 * @returns {number} The calculated score.
 */
export function calculateScore(placement) {
  if (placement < 1 || placement > 150) {
    return 0; // Only levels 1-150 award score
  }

  // [FIX] Updated formula to the 500-point model
  // Formula: 500 * (0.9801 ^ (placement - 1))
  const score = 500 * Math.pow(0.9801, placement - 1);
  return score;
}

/**
 * Cleans a username by removing clan tags (e.g., "[67] Zoink" -> "zoink").
 * This is crucial for matching records against player names.
 * @param {string} username - The raw username from the records.
 * @returns {string} The cleaned, lowercase username.
 */
export function cleanUsername(username) {
    if (!username) return "";
    // Removes [TAG] prefix and trims whitespace
    return username.replace(/\[.*?\]\s*/, "").toLowerCase();
};