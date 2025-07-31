// src/components/UploadStep.js
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import packageJson from '../../package.json';

const UploadStep = ({ onFileSelect, cvLanguage, setCvLanguage, isLoading, loadingMessage, error, theme, setTheme }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  return (
    <div className="upload-step fade-in">
      <div className="settings-bar">
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
        {isLoading ? loadingMessage : t('uploadButtonLabel')}
      </label>
      {error && <p className="error-text">{error}</p>}
      <footer>{`${t('footerText')} - v${packageJson.version}`}</footer>
    </div>
  );
};

export default UploadStep;