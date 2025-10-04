import React from 'react';
import { X, Info } from 'lucide-react';

export default function InfoBox({ onClose }) {

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
        
        <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="text-gray-700 dark:text-gray-300">
            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">About DashRank</h3>
            <p className="text-sm mb-4">
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">DashRank</span> is the ultimate Geometry Dash demonlist — a community-driven hub that combines multiple demonlists into one powerful and easy-to-use platform. Instead of bouncing between different sites, DashRank brings everything together in one place with a clean interface and fast navigation.
            </p>

            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">Future Plans</h3>
            <ul className="list-disc list-inside text-sm mb-4 space-y-1">
              <li>Expanding all lists to include up to 150 levels.</li>
              <li>Adding records to every level on every list.</li>
              <li>Adding detailed statistics for every player.</li>
            </ul>

            {/* New Section */}
            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">List History</h3>
            <p className="text-sm mb-4">
              Please note: Automated position history tracking for all lists began on <strong>October 4, 2025</strong>. Changes made before this date are not reflected in a level's position history.
            </p>

            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">Public API</h3>
            <p className="text-sm mb-4">
              The <span className="text-cyan-600 dark:text-cyan-400 font-semibold">DashRank</span> API is a free and open resource for the community. You can use the following endpoints to pull data directly from the database.
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">Get a Full List</h4>
                <code className="block bg-gray-200 dark:bg-gray-900 rounded p-2 mt-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                  GET /api/lists/:listType
                </code>
                <div className="mt-2 text-xs">
                  <p><strong>Example:</strong> <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 font-mono">/api/lists/main</code></p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">Get a Single Level</h4>
                <code className="block bg-gray-200 dark:bg-gray-900 rounded p-2 mt-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                  GET /api/level/:levelId
                </code>
               <div className="mt-2 text-xs">
                <p><strong>Example:</strong> <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 font-mono">/api/level/8424015</code></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}