import React from 'react';
import LayoutSubmissionForm from '../../components/forms/LayoutSubmissionForm';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function CreateLayoutPage() {
  return (
    <div className="max-w-4xl mx-auto text-white">
      <div className="mb-8">
        <Link to="/layouts" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
          <ChevronLeft size={20} />
          Back to Layout Gallery
        </Link>
      </div>
      <h1 className="text-4xl font-bold mb-6 text-center">Submit a New Layout</h1>
      <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">
        Share your unfinished layout with the community to find decorators and get feedback. Please provide a video showcasing the gameplay.
      </p>
      <LayoutSubmissionForm />
    </div>
  );
}