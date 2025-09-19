// src/components/LoadingSpinner.jsx
import React from 'react';
import cubeImage from '../assets/loading-cube.webp';
import spikesImage from '../assets/loading-spikes.png';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      {/* Animation Stage */}
      <div className="relative w-64 h-32">
        {/* The Cube */}
        <img
          src={cubeImage}
          alt="Loading..."
          className="absolute bottom-0 left-1/2 w-12 h-12 animate-gd-jump"
        />
        {/* The Spikes */}
        <img
          src={spikesImage}
          alt=""
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-8"
        />
      </div>

      {text && <p className="mt-4 text-xl font-semibold text-gray-400">{text}</p>}
    </div>
  );
}