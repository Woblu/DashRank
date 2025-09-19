// src/components/LoadingSpinner.jsx
import React from 'react';

// You can pass optional text to display below the spinner
export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="w-20 h-20 animate-spin-slow">
        {/* This is an SVG of a GD sawblade */}
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#A7A7A7" strokeWidth="5" />
          <circle cx="50" cy="50" r="30" fill="#737373" />
          <path d="M50 50 L95 50" stroke="#A7A7A7" strokeWidth="5" />
          <path d="M50 50 L5 50" stroke="#A7A7A7" strokeWidth="5" />
          <path d="M50 50 L50 95" stroke="#A7A7A7" strokeWidth="5" />
          <path d="M50 50 L50 5" stroke="#A7A7A7" strokeWidth="5" />
          <path d="M50 50 L82 18" stroke="#A7A7A7" strokeWidth="5" />
          <path d="M50 50 L18 82" stroke="#A7A7A7" strokeWidth="5" />
          <path d="M50 50 L18 18" stroke="#A7A7A7" strokeWidth="5" />
          <path d="M50 50 L82 82" stroke="#A7A7A7" strokeWidth="5" />
          <circle cx="50" cy="50" r="10" fill="#454545" />
        </svg>
      </div>
      {text && <p className="mt-4 text-xl font-semibold text-gray-400">{text}</p>}
    </div>
  );
}