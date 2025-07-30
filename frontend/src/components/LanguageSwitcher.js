import React from 'react';
import { useTranslation } from 'react-i18next';

// Doğrulanmış ve Estetik Bayrak SVG'leri
const TrFlag = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#e60013" d="M0 0h48v48H0z" /><circle cx="18" cy="24" r="8" fill="#fff" /><circle cx="21" cy="24" r="6" fill="#e60013" /><path fill="#fff" d="m31.32 24.3-3.64-1.92-1.4 3.96 1.4-3.97L24 18.73l1.4 3.96 3.65-1.92-3.64 1.93 2.25 3.3z" /></svg>;
const UsFlag = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7410 3900"><path fill="#b22234" d="M0 0h7410v3900H0z" /><path d="M0 450h7410V300H0zm0 600h7410V750H0zm0 600h7410v-150H0zM0 2250h7410v-150H0zM0 2850h7410v-150H0zm0 600h7410v-150H0z" fill="#fff" /><path fill="#3c3b6e" d="M0 0h2964v2100H0z" /><g fill="#fff"><g id="s18"><g id="s9"><path id="s" d="m1482 1050 42 129-110-79h136l-110 79z" /><use href="#s" x="296.4" /></g><use href="#s9" x="592.8" /><use href="#s" x="148.2" y="210" /><use href="#s9" x="296.4" y="210" /><use href="#s9" x="592.8" y="210" /></g><use href="#s18" y="420" /></g></svg>;

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  return (
    <div className="language-switcher">
      <button onClick={() => changeLanguage('tr')} className={i18n.language === 'tr' ? 'active' : ''} aria-label="Türkçe"><TrFlag /></button>
      <button onClick={() => changeLanguage('en')} className={i18n.language.startsWith('en') ? 'active' : ''} aria-label="English"><UsFlag /></button>
    </div>
  );
}

export default LanguageSwitcher;