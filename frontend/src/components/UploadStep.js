// src/components/UploadStep.js
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import Feedback from './Feedback';

const UploadStep = ({ onFileSelect, cvLanguage, setCvLanguage, isLoading, loadingMessage, error, theme, setTheme }) => {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);

  return (
    <div className="upload-step fade-in">
      <div className="settings-bar">
        <Feedback sessionId={null} language={i18n.language} theme={theme} />
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
        <LanguageSwitcher />
      </div>
      <Logo />
      <h1>{t('mainTitle')}</h1>
      <p>{t('subtitle')}</p>
      <div className="language-controls">
        <div className="control-group">
          <label htmlFor="cv-lang">{t('cvLanguageLabel')}</label>
          <select id="cv-lang" value={cvLanguage} onChange={e => setCvLanguage(e.target.value)} disabled={isLoading}>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <input
        type="file"
        id="file-upload"
        ref={fileInputRef}
        onChange={() => onFileSelect(fileInputRef.current?.files?.[0])}
        disabled={isLoading}
        accept=".pdf,.docx"
        style={{ display: 'none' }}
      />
      <label htmlFor="file-upload" className={`file-upload-label ${isLoading ? 'disabled' : ''}`}> 
        {isLoading && <span className="button-spinner"></span>}
        {isLoading ? loadingMessage : t('uploadButtonLabel')} 
      </label>
      {error && <p className="error-text">{error}</p>}
      <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
    </div>
  );
};

export default UploadStep;