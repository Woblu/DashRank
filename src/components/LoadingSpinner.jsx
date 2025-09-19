// src/components/LoadingSpinner.jsx
import React from 'react';
import { motion } from 'framer-motion'; // Import motion
import cubeImage from '../assets/loading-cube.webp';
import spikesImage from '../assets/loading-spikes.png';

export default function LoadingSpinner({ text = 'Loading...' }) {
  const jumpAnimation = {
    x: [-80, 0, 80, 160, 240], // Horizontal movement
    y: [0, 0, -80, 0, 0],       // Vertical movement (the jump)
    rotate: [0, 0, 90, 90, 90],
    opacity: [0, 1, 1, 1, 0],
  };

  const jumpTransition = {
    duration: 1.5,
    ease: "easeInOut",
    repeat: Infinity, // Loop forever
    repeatType: "loop",
    times: [0, 0.2, 0.5, 0.8, 1], // Timing for each keyframe
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      {/* Animation Stage */}
      <div className="relative w-64 h-32">
        {/* The Cube */}
        <motion.img
          src={cubeImage}
          alt="Loading..."
          className="absolute bottom-0 left-0 w-12 h-12" // Initial position is now controlled by the animation
          animate={jumpAnimation}
          transition={jumpTransition}
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