import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  return (
    <div className="language-switcher">
      <button
        onClick={() => changeLanguage('tr')}
        className={i18n.language === 'tr' ? 'active' : ''}
        aria-label="Türkçe"
        title="Türkçe"
      >
        🇹🇷
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={i18n.language.startsWith('en') ? 'active' : ''}
        aria-label="English"
        title="English"
      >
        🇺🇸
      </button>
    </div>
  );
}

export default LanguageSwitcher;