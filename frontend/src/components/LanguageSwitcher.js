import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  return (
    <div className="flex gap-2 bg-white dark:bg-gray-700 rounded-full p-1 shadow">
      <button
        onClick={() => changeLanguage('tr')}
        className={`w-8 h-8 rounded-full flex items-center justify-center ${i18n.language === 'tr' ? 'bg-blue-600 text-white' : 'bg-transparent'}`}
        aria-label="Türkçe"
      >
        🇹🇷
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`w-8 h-8 rounded-full flex items-center justify-center ${i18n.language.startsWith('en') ? 'bg-blue-600 text-white' : 'bg-transparent'}`}
        aria-label="English"
      >
        🇺🇸
      </button>
    </div>
  );
}

export default LanguageSwitcher;