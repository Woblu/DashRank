import React from 'react';
import LayoutSubmissionForm from '../../components/forms/LayoutSubmissionForm';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext'; // 1. Import

export default function CreateLayoutPage() {
  const { t } = useLanguage(); // 2. Initialize

  return (
    <div className="max-w-4xl mx-auto text-text-primary"> {/* THEMED */}
      <div className="mb-8">
        <Link to="/layouts" className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"> {/* THEMED */}
          <ChevronLeft size={20} />
          {t('back_to_layout_gallery')}
        </Link>
      </div>
      <h1 className="text-4xl font-bold mb-6 text-center">{t('submit_new_layout')}</h1>
      <p className="text-center text-text-muted mb-8 max-w-2xl mx-auto"> {/* THEMED */}
        {t('submit_new_layout_desc')}
      </p>
      <LayoutSubmissionForm />
    </div>
  );
}