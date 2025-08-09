import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { set, get } from 'lodash';
import { useTranslation } from 'react-i18next';
import Logo from './components/Logo';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';
import Feedback from './components/Feedback';
import './App.css';

// --- API Yapılandırması ---
const getApiBaseUrl = () => {
  // Öncelik: Environment variable (REACT_APP_API_BASE)
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }

  // İkinci öncelik: Local development otomatik tespit
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  // Son çare: Production URL
  return 'https://cvbuilder-451v.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

// Debug: API URL'yi ve kaynağını console'da göster
console.log('API Configuration:');
console.log('- Environment REACT_APP_API_BASE:', process.env.REACT_APP_API_BASE);
console.log('- Window hostname:', window.location.hostname);
console.log('- Final API Base URL:', API_BASE_URL);

// --- Statik Ikon ve Bileşenler ---
const TypingIndicator = () => <div className="message ai typing"><span></span><span></span><span></span></div>;
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="22" y1="2" x2="11" y2="13"></line> <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon> </svg>);

function App() {
  // --- State & Ref Yönetimi ---
  const { t, i18n } = useTranslation();
  const [cvLanguage, setCvLanguage] = useState('tr');
  const [step, setStep] = useState('upload'); // 'upload', 'scriptedQuestions', 'aiQuestions', 'review', 'final'
  const [cvData, setCvData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [questionQueue, setQuestionQueue] = useState([]);
  const [askedAiQuestions, setAskedAiQuestions] = useState([]);
  const [canRefine, setCanRefine] = useState(true);
  const [conversation, setConversation] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [coverLetterPdfUrl, setCoverLetterPdfUrl] = useState('');
  const [cvPdfUrl, setCvPdfUrl] = useState('');
  const [hasGeneratedPdf, setHasGeneratedPdf] = useState(false);
  const [cvScore, setCvScore] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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

    // Debug: CV data'sını console'da göster
    console.log('startScriptedQuestions called with data:', data);
    console.log('CV Parsing Result:', data);
    console.log('PersonalInfo:', data?.personalInfo);
    console.log('Name field:', get(data, 'personalInfo.name'));

    const hasName = get(data, 'personalInfo.name') || get(data, 'personalInfo.firstName');
    console.log('hasName:', hasName);
    if (!hasName) { queue.push({ key: 'askName', path: 'personalInfo.name' }); }
    if (!get(data, 'personalInfo.email')) { queue.push({ key: 'askEmail', path: 'personalInfo.email' }); }
    if (!get(data, 'personalInfo.location')) { queue.push({ key: 'askLocation', path: 'personalInfo.location' }); }
    if (!get(data, 'personalInfo.phone')) { queue.push({ key: 'askPhone', path: 'personalInfo.phone' }); }

    setCvData(data);
    setQuestionQueue(queue);
    setAskedAiQuestions([]);
    setCanRefine(true);
    setStep('scriptedQuestions');
    setHasGeneratedPdf(false);

    console.log('Queue length:', queue.length);
    console.log('Queue items:', queue);

    if (queue.length > 0) {
      console.log('Queue has items, showing first question');
      setConversation([{ type: 'ai', text: tApp(queue[0].key) }]);
    } else {
      console.log('Queue is empty, calling fetchAiQuestions with data:', data);
      fetchAiQuestions(data); // Script'li soruya gerek yoksa direkt Adım 2'ye geç
    }
  };

  const handleInitialParse = async (retryCount = 0) => {
    const file = fileInputRef.current?.files?.[0]; if (!file) return;
    const maxRetries = 2;

    setLoadingMessage(retryCount > 0 ? `${t('uploadingButtonLabel')} (Retry ${retryCount + 1})` : t('uploadingButtonLabel'));
    setError('');

    const formData = new FormData();
    formData.append('cv', file);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/upload-parse`, formData, {
        timeout: 120000,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      // Debug: Backend response'u kontrol et
      console.log('Backend Response:', res);
      console.log('Response Data:', res.data);

      // Backend direkt CV data'sını döndürüyor, sessionId yok
      // Kendimiz bir sessionId oluşturalım
      const sessionId = Date.now().toString();
      console.log('Generated Session ID:', sessionId);
      console.log('CV Data:', res.data);

      setSessionId(sessionId);
      startScriptedQuestions(res.data);
    } catch (err) {
      console.error('API request error:', err);

      // Handle QUIC protocol errors with retry
      if (err.message && err.message.includes('ERR_QUIC_PROTOCOL_ERROR') && retryCount < maxRetries) {
        console.warn(`QUIC protocol error detected, retrying in 1 second... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return handleInitialParse(retryCount + 1);
      }

      // Show user-friendly error messages
      let errorMessage = t('errorOccurred');
      if (err.message && err.message.includes('ERR_QUIC_PROTOCOL_ERROR')) {
        errorMessage = 'Network protocol error. Please try again in a moment.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setLoadingMessage('');
    }
  };

  const fetchAiQuestions = async (currentData, maxQuestions = 4) => {
    setLoadingMessage("AI CV'nizi Analiz Ediyor...");
    try {
      console.log('fetchAiQuestions called with data:', currentData);
      if (!currentData || Object.keys(currentData).length === 0) {
        console.log('fetchAiQuestions: Invalid data, skipping...');
        return;
      }
      const res = await axios.post(`${API_BASE_URL}/api/ai/questions`, {
        cvData: currentData,
        appLanguage: i18n.language,
        askedQuestions: askedAiQuestions,
        maxQuestions,
        sessionId
      });

      console.log('AI Questions Response:', res.data);
      console.log('AI Questions Array:', res.data.questions);

      const aiQuestions = (res.data.questions || []).map(q => ({ key: q.question, isAi: true, id: q.id, category: q.category, hint: q.hint }));

      if (aiQuestions.length > 0) {
        setQuestionQueue(aiQuestions);
        setAskedAiQuestions(prev => [...prev, ...aiQuestions.map(q => q.key)]);
        setStep('aiQuestions');
        setConversation(prev => [...prev, { type: 'ai', text: aiQuestions[0].key }]);
      } else {
        setCanRefine(false);
        setConversation(prev => [
          ...prev,
          { type: 'ai', text: t('noContentError') },
          { type: 'ai', text: t('finalMessage') }
        ]);
        setStep('review');
        scoreCv(cvData);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('chatError'));
      setConversation(prev => [
        ...prev,
        { type: 'ai', text: t('chatError') },
        { type: 'ai', text: t('finalMessage') }
      ]);
      setStep('review');
      scoreCv(cvData);
    } finally {
      setLoadingMessage('');
    }
  };

  const processNextStep = (skipped = false, presetAnswer) => {
    if (questionQueue.length === 0) return;
    const currentQuestion = questionQueue[0];
    const userAnswer = presetAnswer !== undefined ? presetAnswer : (skipped ? t('skipButton') : currentAnswer);
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
        setStep('review');
        scoreCv(updatedCvData);
      }
    }
  };

  const applyUserAdditions = (data) => {
    if (!data || !Array.isArray(data.userAdditions)) {
      return data;
    }

    if (!data.languages || data.languages.length === 0) {
      const langEntry = data.userAdditions.find(u => /language|dil/i.test(u.question));
      if (langEntry) {
        const parts = langEntry.answer.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          data.languages = parts.map(p => {
            const m = p.match(/(.+?)\s*\((.+)\)/);
            if (m) {
              return { language: m[1].trim(), proficiency: m[2].trim() };
            }
            return { language: p, proficiency: '' };
          });
        }
      }
    }

    if (!data.references || data.references.length === 0) {
      const refEntry = data.userAdditions.find(u => /referans|reference/i.test(u.question));
      if (refEntry) {
        const refs = refEntry.answer.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
        if (refs.length > 0) {
          data.references = refs.map(r => ({ name: r, contact: '', relationship: '' }));
        }
      }
    }

    return data;
  };

  const scoreCv = async (data) => {
    try {
      console.log('scoreCv called with data:', data);
      if (!data || Object.keys(data).length === 0) {
        console.log('scoreCv: Invalid data, skipping...');
        return;
      }
      const res = await axios.post(`${API_BASE_URL}/api/ai/score`, { cvData: data, appLanguage: i18n.language });
      console.log('Score Response:', res.data);
      setCvScore(res.data.overall || res.data.score);
      // Backend returns {overall, strengths, weaknesses, suggestions} format
      const comment = res.data.strengths ? res.data.strengths.slice(0, 2).join(', ') : 'CV analizi tamamlandı.';
      setConversation(prev => [...prev, { type: 'ai', text: `${t('cvScore', { score: res.data.overall || res.data.score })} ${comment}` }]);
    } catch (err) {
      // ignore scoring errors
    }
  };

  // YENİ ve ÇİFT ADIMLI PDF/ÖN YAZI MANTIĞI
  const handleGeneratePdf = async () => {
    if (!cvData || hasGeneratedPdf) { return; }

    setConversation(prev => [...prev, { type: 'user', text: t('generateCvButton') }]);
    setLoadingMessage(t('generatingPdfButton'));
    setError('');
    setCoverLetterPdfUrl('');
    if (cvPdfUrl) window.URL.revokeObjectURL(cvPdfUrl);
    setCvPdfUrl('');

    try {
      const preparedData = applyUserAdditions(JSON.parse(JSON.stringify(cvData)));
      const pdfResponse = await axios.post(`${API_BASE_URL}/api/finalize-and-create-pdf`, { cvData: preparedData, cvLanguage, sessionId }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([pdfResponse.data], { type: 'application/pdf' }));
      setCvPdfUrl(url);
      window.open(url, '_blank');

      // PDF indirildikten sonra sadece bir "typing" mesajı göster
      setConversation(prev => [...prev, { type: 'typing' }]);
      setStep('final');
      setHasGeneratedPdf(true);

      // ADIM 2: Arka planda ön yazı metnini iste
      try {
        const coverLetterResponse = await axios.post(`${API_BASE_URL}/api/ai/coverletter`, {
          cvData: preparedData,
          appLanguage: cvLanguage,
          sessionId
        });

        // ADIM 3: Ön yazıyı al ve "typing" göstergesini kaldırarak sohbete ekle
        let coverLetterText = coverLetterResponse.data.coverLetter;
        setConversation(prev => {
          const newConversation = prev.filter(msg => msg.type !== 'typing'); // typing'i kaldır
          if (coverLetterText) {
            const fullCoverLetterMessage = `${t('coverLetterIntro')}\n\n"${coverLetterText}"`;
            newConversation.push({ type: 'ai', text: fullCoverLetterMessage });
          }
          return newConversation;
        });

        // ADIM 4: Ön yazı PDF'ini yeni sekmede aç ve indirme bağlantısını hazırla
        if (coverLetterText) {
          try {
            const pdfRes = await axios.post(`${API_BASE_URL}/api/ai/coverletter`, {
              cvData: preparedData,
              appLanguage: cvLanguage,
              sessionId
            }, { responseType: 'blob' });
            const pdfUrl = window.URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
            window.open(pdfUrl, '_blank');
            setCoverLetterPdfUrl(pdfUrl);
          } catch (pdfErr) {
            // ignore PDF download errors
          }
        }
      } catch (coverErr) {
        // Ön yazı alınamazsa sadece typing'i kaldır, hata göstermeye gerek yok
        setConversation(prev => prev.filter(msg => msg.type !== 'typing'));
      }

    } catch (err) {
      setConversation(prev => prev.filter(msg => msg.type !== 'typing')); // Hata durumunda da typing'i kaldır
      setError(t('pdfError'));
    } finally {
      setLoadingMessage(''); // Her durumda yükleme mesajını temizle
    }
  };

  const handleDownloadCoverLetter = () => {
    if (!coverLetterPdfUrl) return;
    window.open(coverLetterPdfUrl, '_blank');
  };

  const handleDownloadCv = () => {
    if (!cvPdfUrl) return;
    window.open(cvPdfUrl, '_blank');
  };

  const handleRefine = () => {
    if (!cvData) return;
    setConversation(prev => [...prev, { type: 'user', text: t('improveButton') }]);
    fetchAiQuestions(cvData, 2);
  };

  const handleRestart = () => {
    if (cvPdfUrl) window.URL.revokeObjectURL(cvPdfUrl);
    if (coverLetterPdfUrl) window.URL.revokeObjectURL(coverLetterPdfUrl);
    setCvPdfUrl('');
    setCoverLetterPdfUrl('');
    setCvData(null);
    setSessionId(null);
    setQuestionQueue([]);
    setConversation([]);
    setCurrentAnswer('');
    setLoadingMessage('');
    setError('');
    setHasGeneratedPdf(false);
    setAskedAiQuestions([]);
    setCanRefine(true);
    setCvScore(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-container">
      <Feedback open={feedbackOpen} setOpen={setFeedbackOpen} sessionId={sessionId} language={i18n.language} theme={theme} />
      {step === 'upload' ? (
        <div className="upload-step fade-in">
          <div className="settings-bar"><ThemeSwitcher theme={theme} setTheme={setTheme} /><LanguageSwitcher /></div>
          <Logo onBadgeClick={() => setFeedbackOpen(true)} />
          <h1><span>{t('mainTitle')}</span></h1>
          <p>{t('subtitle')}</p>
          <div className="language-controls"><div className="control-group"><label htmlFor="cv-lang">{t('cvLanguageLabel')}</label><select id="cv-lang" value={cvLanguage} onChange={e => setCvLanguage(e.target.value)} disabled={isLoading}><option value="tr">Türkçe</option><option value="en">English</option></select></div></div>
          <input type="file" id="file-upload" ref={fileInputRef} onChange={handleInitialParse} disabled={isLoading} accept=".pdf,.docx" style={{ display: 'none' }} />
          <label htmlFor="file-upload" className={`file-upload-label ${isLoading ? 'loading disabled' : ''}`}>
            {isLoading && <span className="button-spinner"></span>}
            {isLoading ? loadingMessage : t('uploadButtonLabel')}
          </label>
          {error && <p className="error-text">{error}</p>}
          <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      ) : (
        <div className="chat-step fade-in">
          <div className="chat-header"><Logo onBadgeClick={() => setFeedbackOpen(true)} /><div className="settings-bar"><ThemeSwitcher theme={theme} setTheme={setTheme} /><LanguageSwitcher /></div></div>
          <div className="chat-window" ref={chatContainerRef}>{conversation.map((msg, index) => msg.type === 'typing' ? <TypingIndicator key={index} /> : <div key={index} className={`message ${msg.type}`}>{msg.text}</div>)}</div>
          <div className="chat-input-area">
            {(step === 'scriptedQuestions' || step === 'aiQuestions') && (
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={t('chatPlaceholder')}
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), processNextStep())}
              />
            )}
            <div className="button-group">
              {(step === 'scriptedQuestions' || step === 'aiQuestions') && (
                <>
                  <button onClick={() => processNextStep()} disabled={isLoading || !currentAnswer} className="reply-button">{t('answerButton')} <SendIcon /></button>
                  <button onClick={() => processNextStep(true)} disabled={isLoading} className="secondary">{t('skipButton')}</button>
                </>
              )}

              {step === 'review' && (
                <>
                  <button onClick={handleGeneratePdf} disabled={isLoading || !cvData} className={`primary ${isLoading ? 'loading' : ''}`}>
                    {isLoading ? loadingMessage : t('generateCvButton')}
                  </button>
                  {canRefine && <button onClick={handleRefine} disabled={isLoading} className={`accent ${cvScore !== null && cvScore < 80 ? 'highlight' : ''}`}>{t('improveButton')}</button>}
                </>
              )}

              {step === 'final' && hasGeneratedPdf && (
                <>
                  <button onClick={handleDownloadCv} disabled={!cvPdfUrl} className={`primary ${cvScore !== null && cvScore >= 80 ? 'highlight' : ''}`}>{t('downloadCvButton')}</button>
                  <button onClick={handleDownloadCoverLetter} disabled={!coverLetterPdfUrl} className="blue">{t('downloadCoverLetterButton')}</button>
                  <button onClick={handleRestart} className="accent">{t('restartButton')}</button>
                </>
              )}
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
          <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      )}
    </div>
  );
}

export default App;
