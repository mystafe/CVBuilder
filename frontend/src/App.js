import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { set, get } from 'lodash';
import { useTranslation } from 'react-i18next';
import Logo from './components/Logo';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';
import Feedback from './components/Feedback';

// --- API Yapılandırması ---
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// --- Statik Ikon ve Bileşenler ---
const TypingIndicator = () => <div className="text-gray-500">...</div>;
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="22" y1="2" x2="11" y2="13"></line> <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon> </svg>);

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

    const hasName = get(data, 'personalInfo.name') || get(data, 'personalInfo.firstName');
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
      const res = await axios.post(`${API_BASE_URL}/api/extract-raw`, formData, { timeout: 120000 });
      setSessionId(res.data.sessionId);
      startScriptedQuestions(res.data.parsedData);
    } catch (err) {
      setError(err.response?.data?.message || t('errorOccurred'));
    } finally {
      setLoadingMessage('');
    }
  };

  const fetchAiQuestions = async (currentData, maxQuestions = 4) => {
    setLoadingMessage("AI CV'nizi Analiz Ediyor...");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/generate-ai-questions`, {
        cvData: currentData,
        appLanguage: i18n.language,
        askedQuestions: askedAiQuestions,
        maxQuestions,
        sessionId
      });
      const aiQuestions = (res.data.questions || []).map(q => ({ key: q, isAi: true }));

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
      const res = await axios.post(`${API_BASE_URL}/api/score-cv`, { cvData: data, appLanguage: i18n.language });
      setCvScore(res.data.score);
      setConversation(prev => [...prev, { type: 'ai', text: `${t('cvScore', { score: res.data.score })} ${res.data.comment}` }]);
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
          const coverLetterResponse = await axios.post(`${API_BASE_URL}/api/generate-cover-letter`, {
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
            const pdfRes = await axios.post(`${API_BASE_URL}/api/generate-cover-letter-pdf`, {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Feedback open={feedbackOpen} setOpen={setFeedbackOpen} sessionId={sessionId} language={i18n.language} theme={theme} />
      {step === 'upload' ? (
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 space-y-4">
          <div className="flex justify-end gap-2"><ThemeSwitcher theme={theme} setTheme={setTheme} /><LanguageSwitcher /></div>
          <Logo onBadgeClick={() => setFeedbackOpen(true)} />
          <h1 className="text-3xl text-center font-bold">{t('mainTitle')}</h1>
          <p className="text-base text-center">{t('subtitle')}</p>
          <div className="space-y-2">
            <label htmlFor="cv-lang" className="block text-sm font-medium">{t('cvLanguageLabel')}</label>
            <select id="cv-lang" value={cvLanguage} onChange={e => setCvLanguage(e.target.value)} disabled={isLoading} className="w-full border rounded-md p-2">
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>
          <input type="file" id="file-upload" ref={fileInputRef} onChange={handleInitialParse} disabled={isLoading} accept=".pdf,.docx" className="hidden" />
          <label htmlFor="file-upload" className={`block w-full text-center ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'} text-white py-2 rounded-md shadow`}>
            {isLoading ? loadingMessage : t('uploadButtonLabel')}
          </label>
          {error && <p className="text-red-600 text-center">{error}</p>}
          <footer className="text-xs text-center text-gray-500">{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-md flex flex-col p-4 space-y-4">
          <div className="flex justify-between items-center"><Logo onBadgeClick={() => setFeedbackOpen(true)} /><div className="flex gap-2"><ThemeSwitcher theme={theme} setTheme={setTheme} /><LanguageSwitcher /></div></div>
          <div className="flex-1 overflow-y-auto space-y-2" ref={chatContainerRef}>
            {conversation.map((msg, index) =>
              msg.type === 'typing'
                ? <TypingIndicator key={index} />
                : <div key={index} className={`p-2 rounded-md shadow ${msg.type === 'ai' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-600 text-white self-end'}`}>{msg.text}</div>
            )}
          </div>
          <div className="space-y-2">
            {(step === 'scriptedQuestions' || step === 'aiQuestions') && (
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={t('chatPlaceholder')}
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), processNextStep())}
                className="w-full border rounded-md p-2"
              />
            )}
            <div className="flex flex-wrap gap-2">
              {(step === 'scriptedQuestions' || step === 'aiQuestions') && (
                <>
                  <button onClick={() => processNextStep()} disabled={isLoading || !currentAnswer} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 disabled:opacity-50">{t('answerButton')} <SendIcon /></button>
                  <button onClick={() => processNextStep(true)} disabled={isLoading} className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50">{t('skipButton')}</button>
                </>
              )}

              {step === 'review' && (
                <>
                  <button onClick={handleGeneratePdf} disabled={isLoading || !cvData} className={`px-4 py-2 rounded-md shadow text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 ${isLoading ? 'animate-pulse' : ''}`}>{isLoading ? loadingMessage : t('generateCvButton')}</button>
                  {canRefine && <button onClick={handleRefine} disabled={isLoading} className={`px-4 py-2 rounded-md shadow text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 ${cvScore !== null && cvScore < 80 ? 'ring-2 ring-blue-400' : ''}`}>{t('improveButton')}</button>}
                </>
              )}

              {step === 'final' && hasGeneratedPdf && (
                <>
                  <button onClick={handleDownloadCv} disabled={!cvPdfUrl} className={`px-4 py-2 rounded-md shadow text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 ${cvScore !== null && cvScore >= 80 ? 'ring-2 ring-blue-400' : ''}`}>{t('downloadCvButton')}</button>
                  <button onClick={handleDownloadCoverLetter} disabled={!coverLetterPdfUrl} className="px-4 py-2 rounded-md shadow text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{t('downloadCoverLetterButton')}</button>
                  <button onClick={handleRestart} className="px-4 py-2 rounded-md shadow text-white bg-orange-500 hover:bg-orange-600">{t('restartButton')}</button>
                </>
              )}
            </div>
            {error && <p className="text-red-600 text-center">{error}</p>}
          </div>
          <footer className="text-xs text-center text-gray-500">{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      )}
    </div>
  );
}

export default App;
