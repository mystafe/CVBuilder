import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { set, get } from 'lodash';
import { useTranslation } from 'react-i18next';
import Logo from './components/Logo';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';
import Feedback from './components/Feedback';
import './App.css';

// --- Debug System Functions ---
// DEBUG fonksiyonlarını component dışında tanımlayıp, parametreli hale getirelim

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

// API Debug info will be shown when component mounts

// --- Statik Ikon ve Bileşenler ---
const TypingIndicator = () => <div className="message ai typing"><span></span><span></span><span></span></div>;
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="22" y1="2" x2="11" y2="13"></line> <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon> </svg>);

function App() {
  // --- State & Ref Yönetimi ---
  const { t, i18n } = useTranslation();

  // Debug state'ini dinamik hale getirelim
  const [frontendDebug, setFrontendDebug] = useState(() => {
    return localStorage.getItem('frontendDebug') === 'true';
  });
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
  const [superMode, setSuperMode] = useState(() => {
    return localStorage.getItem('superMode') === 'true';
  });
  const [clickCount, setClickCount] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [backendDebug, setBackendDebug] = useState(() => {
    return localStorage.getItem('backendDebug') === 'true';
  });
  const [configAppLanguage, setConfigAppLanguage] = useState(i18n.language);
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [frontendLogs, setFrontendLogs] = useState([]);
  const [backendLogs, setBackendLogs] = useState([]);

  // DEBUG değişkenini component içinde tanımlayalım
  const DEBUG = frontendDebug;

  // Debug fonksiyonları - Log collector ile
  const addToFrontendLogs = useCallback((level, message) => {
    if (superMode) {
      const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        level,
        message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message)
      };
      setFrontendLogs(prev => [...prev.slice(-49), logEntry]); // Son 50 log tut
    }
  }, [superMode]);

  const debugLog = useCallback((...args) => {
    const message = args.join(' ');
    if (DEBUG) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
      addToFrontendLogs('DEBUG', message);
    }
  }, [DEBUG, addToFrontendLogs]);

  const infoLog = useCallback((...args) => {
    const message = args.join(' ');
    console.log('[INFO]', new Date().toISOString(), ...args);
    addToFrontendLogs('INFO', message);
  }, [addToFrontendLogs]);

  const errorLog = useCallback((...args) => {
    const message = args.join(' ');
    console.error('[ERROR]', new Date().toISOString(), ...args);
    addToFrontendLogs('ERROR', message);
  }, [addToFrontendLogs]);

  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isLoading = !!loadingMessage;

  // --- Efektler ---
  useEffect(() => { document.body.className = theme; localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [conversation]);
  useEffect(() => { localStorage.setItem('superMode', superMode.toString()); }, [superMode]);
  useEffect(() => { localStorage.setItem('frontendDebug', frontendDebug.toString()); }, [frontendDebug]);
  useEffect(() => { localStorage.setItem('backendDebug', backendDebug.toString()); }, [backendDebug]);

  // API Configuration Debug
  useEffect(() => {
    debugLog('API Configuration:');
    debugLog('- Environment REACT_APP_API_BASE:', process.env.REACT_APP_API_BASE);
    debugLog('- Window hostname:', window.location.hostname);
    debugLog('- Final API Base URL:', API_BASE_URL);
    debugLog('- Frontend Debug mode:', DEBUG ? 'ENABLED' : 'DISABLED');
  }, [DEBUG, debugLog]);

  // Backend config'i al ve initialize et
  useEffect(() => {
    const initializeBackendConfig = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/config`);
        const { debug, aiModel } = response.data;

        setBackendDebug(debug);
        setAiModel(aiModel);

        debugLog('Backend config initialized:', { debug, aiModel });
      } catch (error) {
        debugLog('Failed to fetch backend config:', error);
        // Sessizce devam et, config alınamazsa varsayılan değerler kullanılır
      }
    };

    // Sadece süper mod aktifken backend config'i al
    if (superMode) {
      initializeBackendConfig();
    }
  }, [superMode, debugLog]);

  // --- Yeni Akışa Uygun Fonksiyonlar ---

  const startScriptedQuestions = (data) => {
    const queue = [];
    const tApp = i18n.getFixedT(i18n.language);

    // Debug: CV data'sını göster
    debugLog('startScriptedQuestions called with data:', data);
    debugLog('CV Parsing Result:', data);
    debugLog('PersonalInfo:', data?.personalInfo);
    debugLog('Name field:', get(data, 'personalInfo.name'));

    // KİŞİSEL BİLGİLER - Temel alanlar
    const hasName = get(data, 'personalInfo.name') || get(data, 'personalInfo.firstName');
    debugLog('hasName:', hasName);
    if (!hasName) { queue.push({ key: 'askName', path: 'personalInfo.name' }); }
    if (!get(data, 'personalInfo.email')) { queue.push({ key: 'askEmail', path: 'personalInfo.email' }); }
    if (!get(data, 'personalInfo.location')) { queue.push({ key: 'askLocation', path: 'personalInfo.location' }); }
    if (!get(data, 'personalInfo.phone')) { queue.push({ key: 'askPhone', path: 'personalInfo.phone' }); }

    // ÖZET - Kendini anlatma sorusu (CV yüklü olsa bile geliştirebilir)
    if (!get(data, 'summary') || get(data, 'summary').length < 100) {
      queue.push({ key: 'askSummary', path: 'summary' });
    }

    // DENEYİM - Eksik detaylar varsa sor
    const experiences = get(data, 'experience') || [];
    if (experiences.length === 0) {
      queue.push({ key: 'askExperience', isComplex: true });
    } else {
      // Mevcut deneyimlerde eksik lokasyon varsa sor
      const hasIncompleteExp = experiences.some(exp =>
        !exp.location || exp.location === 'undened' || exp.location === 'undefined' || exp.location.trim() === ''
      );
      if (hasIncompleteExp) {
        queue.push({ key: 'askExperienceLocation', path: 'experience', isLocationFix: true });
      }
    }

    // EĞİTİM - En az 1 eğitim bilgisi
    if (!get(data, 'education') || get(data, 'education').length === 0) {
      queue.push({ key: 'askEducation', isComplex: true });
    }

    // YETENEKLER - Yetersizse sor
    const skills = get(data, 'skills') || [];
    if (skills.length < 5) {
      queue.push({ key: 'askSkills', path: 'skills', isArray: true });
    }

    // DİLLER - En az 1 dil bilgisi
    if (!get(data, 'languages') || get(data, 'languages').length === 0) {
      queue.push({ key: 'askLanguages', isComplex: true });
    }

    setCvData(data);
    setQuestionQueue(queue);
    setAskedAiQuestions([]);
    setCanRefine(true);
    setStep('scriptedQuestions');
    setHasGeneratedPdf(false);

    debugLog('Queue length:', queue.length);
    debugLog('Queue items:', queue);

    if (queue.length > 0) {
      debugLog('Queue has items, showing first question');
      setConversation([{ type: 'ai', text: tApp(queue[0].key) }]);
    } else {
      debugLog('Queue is empty, calling fetchAiQuestions with data:', data);
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
      debugLog('Backend Response:', res);
      debugLog('Response Data:', res.data);

      // Backend direkt CV data'sını döndürüyor, sessionId yok
      // Kendimiz bir sessionId oluşturalım
      const sessionId = Date.now().toString();
      debugLog('Generated Session ID:', sessionId);
      debugLog('CV Data:', res.data);

      setSessionId(sessionId);
      startScriptedQuestions(res.data);
    } catch (err) {
      errorLog('API request error:', err);

      // Handle QUIC protocol errors with retry
      if (err.message && err.message.includes('ERR_QUIC_PROTOCOL_ERROR') && retryCount < maxRetries) {
        infoLog(`QUIC protocol error detected, retrying in 1 second... (${retryCount + 1}/${maxRetries})`);
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
      debugLog('fetchAiQuestions called with data:', currentData);
      if (!currentData || Object.keys(currentData).length === 0) {
        debugLog('fetchAiQuestions: Invalid data, skipping...');
        return;
      }
      const res = await axios.post(`${API_BASE_URL}/api/ai/questions`, {
        cvData: currentData,
        appLanguage: i18n.language,
        askedQuestions: askedAiQuestions,
        maxQuestions,
        sessionId
      });

      debugLog('AI Questions Response:', res.data);
      debugLog('AI Questions Array:', res.data.questions);

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
        if (currentQuestion.isArray) {
          // Yetenekler gibi array alanlar için
          const skills = userAnswer.split(',').map(s => s.trim()).filter(Boolean);
          set(updatedCvData, currentQuestion.path, skills);
        } else {
          set(updatedCvData, currentQuestion.path, userAnswer);
        }
      } else if (currentQuestion.isComplex) {
        // Karmaşık objeler için (deneyim, eğitim, dil)
        if (currentQuestion.key === 'askExperience') {
          const exp = {
            position: userAnswer.split(' - ')[0] || userAnswer,
            company: userAnswer.split(' - ')[1] || 'Belirtilmemiş',
            location: '',
            startDate: '',
            endDate: '',
            description: userAnswer
          };
          updatedCvData.experience = [...(updatedCvData.experience || []), exp];
        } else if (currentQuestion.key === 'askEducation') {
          const edu = {
            degree: userAnswer.split(' - ')[0] || userAnswer,
            institution: userAnswer.split(' - ')[1] || 'Belirtilmemiş',
            location: '',
            startDate: '',
            endDate: '',
            gpa: ''
          };
          updatedCvData.education = [...(updatedCvData.education || []), edu];
        } else if (currentQuestion.key === 'askLanguages') {
          const langs = userAnswer.split(',').map(l => {
            const parts = l.trim().split(' ');
            return {
              language: parts[0] || l.trim(),
              proficiency: parts[1] || 'Orta'
            };
          });
          updatedCvData.languages = [...(updatedCvData.languages || []), ...langs];
        }
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
      debugLog('scoreCv called with data:', data);
      if (!data || Object.keys(data).length === 0) {
        debugLog('scoreCv: Invalid data, skipping...');
        return;
      }
      const res = await axios.post(`${API_BASE_URL}/api/ai/score`, { cvData: data, appLanguage: i18n.language });
      debugLog('Score Response:', res.data);
      setCvScore(res.data.overall || res.data.score);
      // Backend returns {overall, strengths, weaknesses, suggestions} format
      // Focus on improvement areas rather than just strengths
      const improvementComment = res.data.suggestions && res.data.suggestions.length > 0
        ? 'Bazı alanlarda gelişim fırsatları mevcut.'
        : res.data.weaknesses && res.data.weaknesses.length > 0
          ? 'Çeşitli konularda iyileştirme yapılabilir.'
          : 'CV\'niz genel olarak iyi durumda.';

      setConversation(prev => [...prev, { type: 'ai', text: `${t('cvScore', { score: res.data.overall || res.data.score })} ${improvementComment}` }]);
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

      // Try backend PDF generation first (uses your original template system)
      try {
        const pdfResponse = await axios.post(`${API_BASE_URL}/api/finalize-and-create-pdf`, { cvData: preparedData, cvLanguage, sessionId }, { responseType: 'blob' });

        // Check if backend wants frontend to handle it
        if (pdfResponse.headers['content-type']?.includes('application/json')) {
          const responseData = JSON.parse(await pdfResponse.data.text());
          if (responseData.generateOnFrontend) {
            throw new Error('Backend requests frontend generation: ' + responseData.fallbackReason);
          }
        }

        // Success - backend generated PDF
        const url = window.URL.createObjectURL(new Blob([pdfResponse.data], { type: 'application/pdf' }));
        setCvPdfUrl(url);
        window.open(url, '_blank');
        infoLog('PDF generated using backend template system');
      } catch (backendError) {
        errorLog('Backend PDF generation failed, trying frontend:', backendError);

        // Fallback to frontend PDF system
        try {
          const { getCVPDFBlob } = await import('./lib/pdf.tsx');
          const blob = await getCVPDFBlob(preparedData);
          const url = window.URL.createObjectURL(blob);
          setCvPdfUrl(url);
          window.open(url, '_blank');
          infoLog('PDF generated using frontend fallback system');
        } catch (frontendError) {
          errorLog('Both backend and frontend PDF generation failed:', frontendError);
          throw new Error('PDF generation failed on both backend and frontend');
        }
      }

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
            // Try backend PDF generation first (more reliable)
            const pdfRes = await axios.post(`${API_BASE_URL}/api/ai/coverletter-pdf`, {
              cvData: preparedData,
              appLanguage: cvLanguage,
              sessionId
            }, { responseType: 'blob' });

            const pdfUrl = window.URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
            window.open(pdfUrl, '_blank');
            setCoverLetterPdfUrl(pdfUrl);
            infoLog('Cover letter PDF generated using backend system');
          } catch (backendError) {
            errorLog('Backend cover letter PDF failed, trying frontend:', backendError);

            // Fallback to frontend if backend fails
            try {
              const { getCoverLetterPDFBlob } = await import('./lib/pdf.tsx');
              const blob = await getCoverLetterPDFBlob(preparedData, coverLetterText);
              const pdfUrl = window.URL.createObjectURL(blob);
              window.open(pdfUrl, '_blank');
              setCoverLetterPdfUrl(pdfUrl);
              infoLog('Cover letter PDF generated using frontend fallback');
            } catch (frontendError) {
              errorLog('Both backend and frontend cover letter PDF failed:', frontendError);
              debugLog('Cover letter PDF generation completely failed, but text is available');
            }
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

  const handleSkipUpload = () => {
    debugLog('User skipped CV upload, starting with empty CV');

    // Boş CV data'sı oluştur
    const emptyCvData = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: ''
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      links: [],
      certificates: [],
      languages: [],
      references: []
    };

    // Session ID oluştur
    const sessionId = Date.now().toString();
    setSessionId(sessionId);

    // Boş CV ile script sorularını başlat
    startScriptedQuestions(emptyCvData);
  };

  // Süper Mod Kontrolü
  const handleLogoClick = () => {
    setClickCount(prev => {
      const newCount = prev + 1;
      debugLog('Logo click count:', newCount);

      if (newCount === 5) {
        const newSuperMode = !superMode;
        setSuperMode(newSuperMode);
        debugLog('Super mode toggled:', newSuperMode);
        return 0; // Reset counter
      }

      // Reset counter after 3 seconds if not reaching 5
      setTimeout(() => {
        setClickCount(0);
      }, 3000);

      return newCount;
    });

    // Normal restart functionality (only if not in middle of super mode activation)
    if (clickCount < 3) {
      handleRestart();
    }
  };

  // Config fonksiyonları
  const handleAppLanguageChange = (newLang) => {
    setConfigAppLanguage(newLang);
    i18n.changeLanguage(newLang);
    debugLog('App language changed to:', newLang);
  };

  const handleCvLanguageChange = (newLang) => {
    setCvLanguage(newLang);
    debugLog('CV language changed to:', newLang);
  };

  const handleFrontendDebugToggle = () => {
    const newValue = !frontendDebug;
    setFrontendDebug(newValue);
    debugLog('Frontend debug mode:', newValue ? 'ENABLED' : 'DISABLED');
  };

  const handleBackendDebugToggle = async () => {
    const newValue = !backendDebug;
    setBackendDebug(newValue);
    debugLog('Backend debug mode change requested:', newValue ? 'ENABLED' : 'DISABLED');

    try {
      // Backend'e debug mode değişikliğini bildir
      await axios.post(`${API_BASE_URL}/api/config/debug`, {
        debug: newValue
      });
      infoLog('Backend debug mode updated successfully');
    } catch (err) {
      errorLog('Failed to update backend debug mode:', err);
      // Hata durumunda state'i geri al
      setBackendDebug(!newValue);
    }
  };

  const handleAiModelChange = async (newModel) => {
    const oldModel = aiModel;
    setAiModel(newModel);
    debugLog('AI model change requested:', newModel);

    try {
      // Backend'e AI model değişikliğini bildir
      await axios.post(`${API_BASE_URL}/api/config/ai-model`, {
        model: newModel
      });
      infoLog('AI model updated successfully to:', newModel);
    } catch (err) {
      errorLog('Failed to update AI model:', err);
      // Hata durumunda state'i geri al
      setAiModel(oldModel);
    }
  };

  // Backend log fetcher
  const fetchBackendLogs = useCallback(async () => {
    if (!superMode) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/logs`);
      setBackendLogs(response.data.logs || []);
    } catch (error) {
      debugLog('Failed to fetch backend logs:', error.message);
    }
  }, [superMode, debugLog]);

  // Backend log polling
  useEffect(() => {
    if (superMode) {
      const interval = setInterval(fetchBackendLogs, 2000); // Her 2 saniyede bir
      fetchBackendLogs(); // İlk fetch
      return () => clearInterval(interval);
    }
  }, [superMode, fetchBackendLogs]);

  const LogViewer = () => {
    if (!superMode) return null;

    return (
      <div className="log-viewer">
        <div className="log-header">
          <h4>📊 Live Logs</h4>
          <div className="log-controls">
            <button
              onClick={() => setFrontendLogs([])}
              className="clear-logs-btn"
              title="Clear Frontend Logs"
            >
              🗑️ Clear Frontend
            </button>
            <button
              onClick={async () => {
                try {
                  await axios.delete(`${API_BASE_URL}/api/logs`);
                  setBackendLogs([]);
                  infoLog('Backend logs cleared');
                } catch (error) {
                  errorLog('Failed to clear backend logs:', error.message);
                }
              }}
              className="clear-logs-btn"
              title="Clear Backend Logs"
            >
              🗑️ Clear Backend
            </button>
          </div>
        </div>
        <div className="log-panels">
          <div className="log-panel frontend-logs">
            <div className="log-panel-header">
              <span className="log-title">🌐 Frontend</span>
              <span className="log-count">{frontendLogs.length}</span>
            </div>
            <div className="log-content">
              {frontendLogs.length === 0 ? (
                <div className="no-logs">No frontend logs</div>
              ) : (
                frontendLogs.map(log => (
                  <div key={log.id} className={`log-entry log-${log.level.toLowerCase()}`}>
                    <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="log-panel backend-logs">
            <div className="log-panel-header">
              <span className="log-title">⚙️ Backend</span>
              <span className="log-count">{backendLogs.length}</span>
            </div>
            <div className="log-content">
              {backendLogs.length === 0 ? (
                <div className="no-logs">No backend logs</div>
              ) : (
                backendLogs.map((log, index) => (
                  <div key={index} className={`log-entry log-${log.level?.toLowerCase() || 'info'}`}>
                    <span className="log-time">{new Date(log.timestamp || Date.now()).toLocaleTimeString()}</span>
                    <span className={`log-level level-${log.level?.toLowerCase() || 'info'}`}>{log.level || 'INFO'}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ConfigModal = () => (
    <div className={`modal-overlay ${showConfig ? 'show' : ''}`} onClick={() => setShowConfig(false)}>
      <div className="modal-content config-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ Super Mode Settings</h3>
          <button className="modal-close" onClick={() => setShowConfig(false)}>×</button>
        </div>
        <div className="modal-body">
          {/* Language Settings */}
          <div className="config-section">
            <h4>🌍 Language Settings</h4>
            <div className="config-item">
              <label>App Language:</label>
              <select
                value={configAppLanguage}
                onChange={(e) => handleAppLanguageChange(e.target.value)}
                className="config-select"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="config-item">
              <label>CV Language:</label>
              <select
                value={cvLanguage}
                onChange={(e) => handleCvLanguageChange(e.target.value)}
                className="config-select"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="config-section">
            <h4>🎨 Theme Settings</h4>
            <div className="config-item">
              <label>Theme Mode:</label>
              <ThemeSwitcher theme={theme} setTheme={setTheme} />
            </div>
          </div>

          {/* Debug Settings */}
          <div className="config-section">
            <h4>🐛 Debug Settings</h4>
            <div className="config-item">
              <label>Frontend Debug:</label>
              <button
                onClick={handleFrontendDebugToggle}
                className={`toggle-button ${frontendDebug ? 'active' : 'inactive'}`}
              >
                {frontendDebug ? '✅ Enabled' : '❌ Disabled'}
              </button>
            </div>
            <div className="config-item">
              <label>Backend Debug:</label>
              <button
                onClick={handleBackendDebugToggle}
                className={`toggle-button ${backendDebug ? 'active' : 'inactive'}`}
              >
                {backendDebug ? '✅ Enabled' : '❌ Disabled'}
              </button>
            </div>
          </div>

          {/* AI Settings */}
          <div className="config-section">
            <h4>🤖 AI Settings</h4>
            <div className="config-item">
              <label>AI Model:</label>
              <select
                value={aiModel}
                onChange={(e) => handleAiModelChange(e.target.value)}
                className="config-select"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
          </div>

          {/* System Info */}
          <div className="config-section">
            <h4>📊 System Info</h4>
            <div className="config-item">
              <label>API Base URL:</label>
              <span className="code-text">{API_BASE_URL}</span>
            </div>
            <div className="config-item">
              <label>Session ID:</label>
              <span className="code-text">{sessionId || 'None'}</span>
            </div>
            <div className="config-item">
              <label>Super Mode:</label>
              <span className="status-badge active">🦸‍♂️ Active</span>
            </div>
            <div className="config-item">
              <label>Frontend Version:</label>
              <span className="status-badge">0.2508.091400</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Feedback open={feedbackOpen} setOpen={setFeedbackOpen} sessionId={sessionId} language={i18n.language} theme={theme} />
      <ConfigModal />
      {step === 'upload' ? (
        <div className="upload-step fade-in">
          <div className="settings-bar">{superMode ? <button className="config-button" onClick={() => setShowConfig(true)} title="Super Mode Settings">⚙️</button> : <ThemeSwitcher theme={theme} setTheme={setTheme} />}<LanguageSwitcher /></div>
          <Logo onBadgeClick={() => setFeedbackOpen(true)} onLogoClick={handleLogoClick} superMode={superMode} />
          <h1><span>{t('mainTitle')}</span></h1>
          <p>{t('subtitle')}</p>
          <div className="language-controls"><div className="control-group"><label htmlFor="cv-lang">{t('cvLanguageLabel')}</label><select id="cv-lang" value={cvLanguage} onChange={e => setCvLanguage(e.target.value)} disabled={isLoading}><option value="tr">Türkçe</option><option value="en">English</option></select></div></div>
          <input type="file" id="file-upload" ref={fileInputRef} onChange={handleInitialParse} disabled={isLoading} accept=".pdf,.docx" style={{ display: 'none' }} />
          <label htmlFor="file-upload" className={`file-upload-label ${isLoading ? 'loading disabled' : ''}`}>
            {isLoading && <span className="button-spinner"></span>}
            {isLoading ? loadingMessage : t('uploadButtonLabel')}
          </label>
          {error && <p className="error-text">{error}</p>}

          {/* CV olmadan devam etme butonu - küçük ve dikkat çekmeyen */}
          {!isLoading && (
            <div className="skip-upload-container">
              <button
                onClick={handleSkipUpload}
                className="skip-upload-button"
                aria-label={t('skipUploadButton')}
              >
                {t('skipUploadButton')}
              </button>
            </div>
          )}

          <LogViewer />
          <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      ) : (
        <div className="chat-step fade-in">
          <div className="chat-header"><Logo onBadgeClick={() => setFeedbackOpen(true)} onLogoClick={handleLogoClick} superMode={superMode} /><div className="settings-bar">{superMode ? <button className="config-button" onClick={() => setShowConfig(true)} title="Super Mode Settings">⚙️</button> : <ThemeSwitcher theme={theme} setTheme={setTheme} />}<LanguageSwitcher /></div></div>
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
          <LogViewer />
          <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      )}
    </div>
  );
}

export default App;
