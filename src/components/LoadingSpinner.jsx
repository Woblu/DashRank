// src/components/LoadingSpinner.jsx
import React from 'react';
// Step 2a: Import the image file
import sawbladeImage from '../assets/sawblade-spinner.png';

// You can still pass optional text to display below the spinner
export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      {/* Step 2b: Replace the SVG with an <img> tag */}
      <img
        src={sawbladeImage}
        alt="Loading..."
        className="w-20 h-20 animate-spin-slow"
      />
      {text && <p className="mt-4 text-xl font-semibold text-gray-400">{text}</p>}
    </div>
  );
}