import React from 'react';
import sawblade from '../assets/RegularSawblade01.webp';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col justify-center items-center py-20 text-center">
      <img 
        src={sawblade} 
        alt="Loading..." 
        className="w-24 h-24 animate-spin-slow"
      />
      <p className="text-gray-400 mt-4 text-lg font-semibold">{message}</p>
    </div>
  );
}