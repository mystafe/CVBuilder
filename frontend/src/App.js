import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { set, get } from 'lodash';
import { useTranslation } from 'react-i18next';
import Logo from './components/Logo';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';
import packageJson from '../package.json';
import './App.css';

// --- API Yapılandırması ---
// Vercel'de deploy edildiğinde REACT_APP_API_URL değişkenini kullanır,
// yerelde çalışırken ise varsayılan olarak localhost'a bağlanır.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// --- Statik Ikon Bileşenleri ---
const TypingIndicator = () => <div className="message ai typing"><span></span><span></span><span></span></div>;
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

function App() {
  // --- State & Ref Yönetimi ---
  const { t, i18n } = useTranslation();
  const [cvLanguage, setCvLanguage] = useState('tr');
  const [step, setStep] = useState('upload');
  const [cvData, setCvData] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    const userPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return savedTheme || (userPrefersDark ? 'dark' : 'light');
  });

  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isLoading = !!loadingMessage;

  // --- Efektler (Lifecycle) ---
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation]);

  // --- API ve Mantık Fonksiyonları ---

  const handleInitialParse = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setLoadingMessage(t('uploadingButtonLabel'));
    setError('');
    const formData = new FormData();
    formData.append('cv', file);
    // send the language used for follow-up questions
    formData.append('appLanguage', cvLanguage);
    formData.append('cvLanguage', cvLanguage);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/initial-parse`, formData, { timeout: 45000 });
      setCvData(res.data.parsedData);
      const initialMsgs = [];
      const tCv = i18n.getFixedT(cvLanguage);
      if (!res.data.parsedData?.personalInfo?.name && !res.data.parsedData?.personalInfo?.firstName) {
        initialMsgs.push({ type: 'ai', text: tCv('askName') });
      }
      initialMsgs.push({ type: 'ai', text: tCv('welcomeQuestion') });
      setConversation(initialMsgs);
      setStep('chat');
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError("Sunucudan yanıt almak çok uzun sürdü. Lütfen tekrar deneyin.");
      } else {
        setError(err.response?.data?.message || t('errorOccurred'));
      }
    } finally {
      setLoadingMessage('');
    }
  };

  const processNextStep = async (skipped = false) => {
    const userAnswer = skipped ? `(Kullanıcı bu adımı atladı)` : currentAnswer;
    if (!userAnswer && !skipped) return;

    const newConversation = [...conversation, { type: 'user', text: userAnswer }];
    setConversation([...newConversation, { type: 'typing' }]);
    setCurrentAnswer('');
    setLoadingMessage("Geliştiriliyor...");
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/api/next-step`, {
        conversationHistory: JSON.stringify(newConversation),
        cvData,
        // Use the target CV language for follow-up questions
        appLanguage: cvLanguage
      });

      let updatedCvData = JSON.parse(JSON.stringify(cvData));

      if (res.data.updateInstructions && Array.isArray(res.data.updateInstructions)) {
        res.data.updateInstructions.forEach(instruction => {
          if (instruction?.path && instruction.value !== undefined) {
            const target = get(updatedCvData, instruction.path);
            if (Array.isArray(target)) {
              target.push(instruction.value);
            } else {
              set(updatedCvData, instruction.path, instruction.value);
            }
          }
        });
      }
      setCvData(updatedCvData);

      const finalConversation = [...newConversation];
      if (res.data.nextQuestion) {
        finalConversation.push({ type: 'ai', text: res.data.nextQuestion });
      } else {
        finalConversation.push({ type: 'ai', text: t('finalMessage') });
        setStep('final');
      }
      setConversation(finalConversation);
    } catch (err) {
      setError(err.response?.data?.message || t('chatError'));
      setConversation(newConversation);
    } finally {
      setLoadingMessage('');
    }
  };

  const handleGeneratePdf = async () => {
    if (!cvData) { setError(t('pdfError')); return; }
    setLoadingMessage(t('generatingPdfButton'));
    setError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-pdf`, { cvData, cvLanguage }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const fileName = cvData.personalInfo?.name ? `${cvData.personalInfo.name.replace(/\s+/g, '_')}_CV.pdf` : 'Gelistirilmis_CV.pdf';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(t('pdfError'));
    } finally {
      setLoadingMessage('');
    }
  };

  return (
    <div className="app-container">
      {step === 'upload' && (
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
          <input type="file" id="file-upload" ref={fileInputRef} onChange={handleInitialParse} disabled={isLoading} accept=".pdf,.docx" style={{ display: 'none' }} />
          <label htmlFor="file-upload" className={`file-upload-label ${isLoading ? 'disabled' : ''}`}>
            {isLoading ? loadingMessage : t('uploadButtonLabel')}
          </label>
          {error && <p className="error-text">{error}</p>}
          <footer>{`${t('footerText')} - v${packageJson.version}`}</footer>
        </div>
      )}
      {(step === 'chat' || step === 'final') && (
        <div className="chat-step fade-in">
          <div className="chat-header">
            <Logo />
            <div className="settings-bar">
              <ThemeSwitcher theme={theme} setTheme={setTheme} />
              <LanguageSwitcher />
            </div>
          </div>
          <div className="chat-window" ref={chatContainerRef}>
            {conversation.map((msg, index) => msg.type === 'typing' ? <TypingIndicator key={index} /> : <div key={index} className={`message ${msg.type}`}>{msg.text}</div>)}
          </div>
          <div className="chat-input-area">
            {step === 'chat' && (
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={t('chatPlaceholder')}
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), processNextStep())}
              />
            )}
            <div className="button-group">
              {step === 'chat' && (
                <>
                  <button onClick={() => processNextStep()} disabled={isLoading || !currentAnswer} className="reply-button">
                    {t('answerButton')} <SendIcon />
                  </button>
                  <button onClick={() => processNextStep(true)} disabled={isLoading} className="secondary">{t('skipButton')}</button>
                </>
              )}
              <button onClick={handleGeneratePdf} disabled={isLoading || !cvData} className="primary">
                {isLoading ? loadingMessage : t('finishButton')}
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
          <footer>{`${t('footerText')} - v${packageJson.version}`}</footer>
        </div>
      )}
    </div>
  );
}

export default App;