import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft } from 'lucide-react';
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import futureList from '../data/future-list.json';
import challengeList from '../data/challenge-list.json';
import speedhackList from '../data/speedhack-list.json';
import tslList from '../data/tsl-list.json';
import tslplus from '../data/tslplus.json';

const allLists = {
  main: mainList,
  unrated: unratedList,
  platformer: platformerList,
  future: futureList,
  challenge: challengeList,
  speedhack: speedhackList,
  tsl: tslList,
  tslplus: tslplus,
};

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return urlOrId.split('?')[0].split('&')[0];
};

export default function LevelDetail() {
  const { listType, levelId } = useParams(); // levelId param can be either ID or placement
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isCopied, setIsCopied] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  const level = useMemo(() => {
    const list = allLists[listType] || [];
    // --- MODIFIED: Find by placement for challenge list, by levelId for all others ---
    if (listType === 'challenge') {
      return list.find(l => String(l.placement) === levelId);
    }
    return list.find(l => String(l.levelId) === levelId);
  }, [listType, levelId]);

  useEffect(() => {
    if (level) {
      setCurrentVideoId(getYouTubeVideoId(level.videoId));
    }
  }, [level]);

  const handleCopyClick = () => {
    if (level?.levelId) {
      navigator.clipboard.writeText(level.levelId).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  if (!level) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">Level Not Found</h1>
        <button onClick={() => navigate(-1)} className="mt-4 inline-flex items-center text-cyan-600 hover:underline">
          <ChevronLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const verifierLabel = listType === 'future' ? 'Verification Status:' : 'Verified by:';
  const recordVerifierLabel = listType === 'future' ? '(Status)' : '(Verifier)';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-gray-100">
      <div className="relative bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center mb-4 pt-8 sm:pt-0">
          <h1 className="font-poppins text-5xl font-bold text-cyan-600 dark:text-cyan-400 break-words">
            #{level.placement} - {level.name}
          </h1>
        </div>

        <div className="flex justify-center text-center mb-4 gap-x-8">
          {level.creator && (
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-bold">Created by:</span> {level.creator}
            </p>
          )}
          {level.verifier && (
             <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-bold">{verifierLabel}</span> {level.verifier}
            </p>
          )}
        </div>
        
        {level.levelId && (
          <div className="text-center mb-6">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-bold">Level ID:</span>
              <button
                onClick={handleCopyClick}
                className="ml-2 px-2 py-1 rounded-md font-mono bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {isCopied ? 'Copied!' : level.levelId}
              </button>
            </p>
          </div>
        )}

        {currentVideoId && (
          <div className="aspect-video w-full">
            <iframe
              key={currentVideoId}
              width="100%"
              height="100%"
              src={`https://www.youtube-nocookie.com/embed/${currentVideoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-xl shadow-lg"
            ></iframe>
          </div>
        )}
      </div>

      {level.description && (
        <div className="mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
          <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 text-center mb-2">Description</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-center">
            {level.description}
          </p>
        </div>
      )}

      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-inner">
        <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">{t('records')}</h2>
        
        <ul className="text-center space-y-2 text-lg">
          <li>
            <button onClick={() => setCurrentVideoId(getYouTubeVideoId(level.videoId))} className="text-cyan-600 dark:text-cyan-400 hover:underline">
              <span className="font-bold">{level.verifier}</span>
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400 ml-2">{recordVerifierLabel}</span>
            </button>
          </li>

          {level.records && level.records.map((record, index) => (
            record.videoId && (
              <li key={index}>
                <button onClick={() => setCurrentVideoId(getYouTubeVideoId(record.videoId))} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                  {record.username}
                  <span className="font-mono text-sm text-gray-500 dark:text-gray-400 ml-2">({record.percent}%)</span>
                </button>
              </li>
            )
          ))}
        </ul>
        
        {(!level.records || level.records.length === 0) && (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-4">{t('no_records_yet')}</p>
        )}
      </div>
    </div>
  );
}