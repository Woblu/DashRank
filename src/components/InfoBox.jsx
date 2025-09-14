import React from 'react';
import { X, Info } from 'lucide-react';

export default function InfoBox({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center">
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Info className="w-6 h-6 text-cyan-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Information</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </header>
        
        <div className="p-6 space-y-6 text-base text-gray-700 dark:text-gray-300 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div>
            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200 mb-2">Project Roadmap</h3>
            <div className="space-y-3">
              <p>
                Welcome to <span className="font-bold text-cyan-600 dark:text-cyan-400">DashRank v1.0</span>! As a solo project, your support and feedback are incredibly valuable.
              </p>
              <p>
                The next major update will focus on filling out all the data. I'll be working hard on:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Populating the <span className="font-semibold">Records section</span> for every demon.</li>
                <li>Filling out detailed <span className="font-semibold">player stats</span> for everyone on the leaderboards.</li>
              </ul>
               <p className="font-semibold text-center pt-4">
                Sit tight!
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200 mb-2">Public API</h3>
            <p className="text-sm mb-4">
              The DashRank API is a free and open resource for the community. You can use the following endpoints to pull data directly from the database.
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Get a Full List</h4>
                <code className="block bg-gray-200 dark:bg-gray-900 rounded p-2 mt-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                  GET /api/lists/:listType
                </code>
                <div className="mt-2 text-xs">
                  <p><strong>Example:</strong> <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 font-mono">/api/lists/main</code></p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Get a Single Level</h4>
                <code className="block bg-gray-200 dark:bg-gray-900 rounded p-2 mt-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                  GET /api/level/:levelId
                </code>
               <div className="mt-2 text-xs">
                <p><strong>Example:</strong> <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 font-mono">/api/level/86407629</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
   </div>  
  );
}