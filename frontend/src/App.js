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
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// --- Statik Ikon ve Bileşenler ---
const TypingIndicator = () => <div className="message ai typing"><span></span><span></span><span></span></div>;
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="22" y1="2" x2="11" y2="13"></line> <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon> </svg>);

function App() {
  // --- State & Ref Yönetimi ---
  const { t, i18n } = useTranslation();
  const [cvLanguage, setCvLanguage] = useState('tr');
  const [step, setStep] = useState('upload'); // 'upload', 'scriptedQuestions', 'aiQuestions', 'final'
  const [cvData, setCvData] = useState(null);
  const [questionQueue, setQuestionQueue] = useState([]);
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

  // --- Efektler ---
  useEffect(() => { document.body.className = theme; localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [conversation]);

  // --- Yeni Akışa Uygun Fonksiyonlar ---

  const startScriptedQuestions = (data) => {
    const queue = [];
    const tApp = i18n.getFixedT(i18n.language);

    const hasName = get(data, 'personalInfo.name') || get(data, 'personalInfo.firstName');
    if (!hasName) { queue.push({ key: 'askName', path: 'personalInfo.name' }); }
    if (!get(data, 'personalInfo.email')) { queue.push({ key: 'askEmail', path: 'personalInfo.email' }); }

    setCvData(data);
    setQuestionQueue(queue);
    setStep('scriptedQuestions');

    if (queue.length > 0) {
      setConversation([{ type: 'ai', text: tApp(queue[0].key) }]);
    } else {
      fetchAiQuestions(data); // Script'li soruya gerek yoksa direkt Adım 2'ye geç
    }
  };

  const handleInitialParse = async () => {
    const file = fileInputRef.current?.files?.[0]; if (!file) return;
    setLoadingMessage(t('uploadingButtonLabel')); setError('');
    const formData = new FormData(); formData.append('cv', file);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/extract-raw`, formData, { timeout: 45000 });
      startScriptedQuestions(res.data.parsedData);
    } catch (err) {
      setError(err.response?.data?.message || t('errorOccurred'));
      setLoadingMessage('');
    }
  };

  const fetchAiQuestions = async (currentData) => {
    setLoadingMessage("AI CV'nizi Analiz Ediyor...");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/generate-ai-questions`, { cvData: currentData, appLanguage: i18n.language });
      const aiQuestions = (res.data.questions || []).map(q => ({ key: q, isAi: true }));

      if (aiQuestions.length > 0) {
        setQuestionQueue(aiQuestions);
        setStep('aiQuestions');
        setConversation(prev => [...prev, { type: 'ai', text: aiQuestions[0].key }]);
      } else {
        setConversation(prev => [...prev, { type: 'ai', text: t('finalMessage') }]);
        setStep('final');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('chatError'));
      setConversation(prev => [...prev, { type: 'ai', text: t('finalMessage') }]); // Hata durumunda da final adımına geç
      setStep('final');
    } finally {
      setLoadingMessage('');
    }
  };

  const processNextStep = (skipped = false) => {
    if (questionQueue.length === 0) return;
    const currentQuestion = questionQueue[0];
    const userAnswer = skipped ? '(atlandı)' : currentAnswer;
    if (!userAnswer && !skipped) return;

    const newConversation = [...conversation, { type: 'user', text: userAnswer }];
    let updatedCvData = JSON.parse(JSON.stringify(cvData));

    if (!skipped) {
      if (currentQuestion.path) {
        set(updatedCvData, currentQuestion.path, userAnswer);
      } else if (currentQuestion.isAi) {
        if (!updatedCvData.userAdditions) updatedCvData.userAdditions = [];
        updatedCvData.userAdditions.push({ question: currentQuestion.key, answer: userAnswer });
      }
    }
    setCvData(updatedCvData);

    const remainingQuestions = questionQueue.slice(1);
    setQuestionQueue(remainingQuestions);
    setCurrentAnswer('');

    if (remainingQuestions.length > 0) {
      setConversation([...newConversation, { type: 'ai', text: t(remainingQuestions[0].key) }]);
    } else {
      if (step === 'scriptedQuestions') {
        setConversation([...newConversation]);
        fetchAiQuestions(updatedCvData);
      } else {
        setConversation([...newConversation, { type: 'ai', text: t('finalMessage') }]);
        setStep('final');
      }
    }
  };

  // YENİ ve ÇİFT ADIMLI PDF/ÖN YAZI MANTIĞI
  const handleGeneratePdf = async () => {
    if (!cvData) { setError(t('pdfError')); return; }

    setLoadingMessage(t('generatingPdfButton'));
    setError('');

    try {
      // ADIM 1: PDF'i oluştur ve indir
      const pdfResponse = await axios.post(`${API_BASE_URL}/api/finalize-and-create-pdf`, { cvData, cvLanguage }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([pdfResponse.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const fileName = (get(cvData, 'personalInfo.name') || 'Super_CV').replace(/\s+/g, '_') + '.pdf';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      // PDF indirildikten sonra sohbeti son adıma taşı ve "typing" göster
      setConversation(prev => [...prev, { type: 'ai', text: t('finalMessage') }, { type: 'typing' }]);
      setStep('final');

      // ADIM 2: Arka planda ön yazı metnini iste
      const coverLetterResponse = await axios.post(`${API_BASE_URL}/api/generate-cover-letter`, {
        cvData, // AI'ın son CV'yi kullanması için cvData'yı gönderiyoruz
        appLanguage: i18n.language
      });

      // ADIM 3: Ön yazıyı al ve "typing" göstergesini kaldırarak sohbete ekle
      setConversation(prev => {
        const newConversation = prev.filter(msg => msg.type !== 'typing'); // typing'i kaldır
        if (coverLetterResponse.data.coverLetter) {
          const fullCoverLetterMessage = `${t('coverLetterIntro')}\n\n"${coverLetterResponse.data.coverLetter}"`;
          newConversation.push({ type: 'ai', text: fullCoverLetterMessage });
        }
        return newConversation;
      });

    } catch (err) {
      setConversation(prev => prev.filter(msg => msg.type !== 'typing')); // Hata durumunda da typing'i kaldır
      setError(t('pdfError'));
    } finally {
      setLoadingMessage(''); // Her durumda yükleme mesajını temizle
    }
  };

  return (
    <div className="app-container">
      {step === 'upload' ? (
        <div className="upload-step fade-in">
          <div className="settings-bar"><ThemeSwitcher theme={theme} setTheme={setTheme} /><LanguageSwitcher /></div>
          <Logo />
          <h1>{t('mainTitle')}</h1>
          <p>{t('subtitle')}</p>
          <div className="language-controls"><div className="control-group"><label htmlFor="cv-lang">{t('cvLanguageLabel')}</label><select id="cv-lang" value={cvLanguage} onChange={e => setCvLanguage(e.target.value)} disabled={isLoading}><option value="tr">Türkçe</option><option value="en">English</option></select></div></div>
          <input type="file" id="file-upload" ref={fileInputRef} onChange={handleInitialParse} disabled={isLoading} accept=".pdf,.docx" style={{ display: 'none' }} />
          <label htmlFor="file-upload" className={`file-upload-label ${isLoading ? 'disabled' : ''}`}>{isLoading ? loadingMessage : t('uploadButtonLabel')}</label>
          {error && <p className="error-text">{error}</p>}
          <footer>{`${t('footerText')} - v${packageJson.version}`}</footer>
        </div>
      ) : (
        <div className="chat-step fade-in">
          <div className="chat-header"><Logo /><div className="settings-bar"><ThemeSwitcher theme={theme} setTheme={setTheme} /><LanguageSwitcher /></div></div>
          <div className="chat-window" ref={chatContainerRef}>{conversation.map((msg, index) => msg.type === 'typing' ? <TypingIndicator key={index} /> : <div key={index} className={`message ${msg.type}`}>{msg.text}</div>)}</div>
          <div className="chat-input-area">
            {step !== 'final' && (<textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} placeholder={t('chatPlaceholder')} disabled={isLoading} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), processNextStep())} />)}
            <div className="button-group">
              {step !== 'final' && (<> <button onClick={() => processNextStep()} disabled={isLoading || !currentAnswer} className="reply-button">{t('answerButton')} <SendIcon /></button> <button onClick={() => processNextStep(true)} disabled={isLoading} className="secondary">{t('skipButton')}</button> </>)}
              {(step === 'final' || questionQueue.length === 0) && (
                <button onClick={handleGeneratePdf} disabled={isLoading || !cvData} className="primary">
                  {isLoading ? loadingMessage : t('finishButton')}
                </button>
              )}
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