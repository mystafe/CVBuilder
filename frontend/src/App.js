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
  const [showCoverLetterForm, setShowCoverLetterForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [positionName, setPositionName] = useState('');
  const [adminStats, setAdminStats] = useState(null);
  const [showLogViewer, setShowLogViewer] = useState(() => {
    const saved = localStorage.getItem('showLogViewer');
    return saved ? JSON.parse(saved) : true;
  });
  const [chatBackground, setChatBackground] = useState(() => {
    const saved = localStorage.getItem('chatBackground');
    return saved || 'default';
  });
  const [customBackgroundImage, setCustomBackgroundImage] = useState(() => {
    const saved = localStorage.getItem('customBackgroundImage');
    return saved || '';
  });
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
  const [logViewMode, setLogViewMode] = useState('tail'); // 'tail' or 'scroll'
  const [logExpanded, setLogExpanded] = useState(false);
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'frontend', 'backend'

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
  }, [superMode, debugLog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save log viewer preference
  useEffect(() => {
    localStorage.setItem('showLogViewer', JSON.stringify(showLogViewer));
  }, [showLogViewer]);

  // Save background preferences
  useEffect(() => {
    localStorage.setItem('chatBackground', chatBackground);
  }, [chatBackground]);

  useEffect(() => {
    localStorage.setItem('customBackgroundImage', customBackgroundImage);
  }, [customBackgroundImage]);

  // Fetch admin stats only when config opens - moved to ConfigModal button click

  // Background style helper
  const getChatBackgroundStyle = () => {
    debugLog('Background style requested:', chatBackground, customBackgroundImage);
    switch (chatBackground) {
      case 'gradient1':
        return 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.05) 100%)';
      case 'gradient2':
        return 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(196, 181, 253, 0.05) 100%)';
      case 'pattern1':
        return 'radial-gradient(circle at 2px 2px, rgba(59, 130, 246, 0.1) 1px, transparent 0)';
      case 'pattern2':
        return 'linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)';
      case 'custom':
        return customBackgroundImage ? `url(${customBackgroundImage})` : 'none';
      default:
        return 'none';
    }
  };

  // --- Validation Functions ---
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const validateInput = (value, validationType) => {
    switch (validationType) {
      case 'email':
        return validateEmail(value);
      default:
        return true;
    }
  };

  // --- Yeni Akışa Uygun Fonksiyonlar ---

  const startScriptedQuestions = (data, cvWasUploaded = true) => {
    const queue = [];
    const tApp = i18n.getFixedT(i18n.language);

    // Debug: CV data'sını göster
    debugLog('startScriptedQuestions called with data:', data);
    debugLog('CV was uploaded:', cvWasUploaded);
    debugLog('CV Parsing Result:', data);
    debugLog('PersonalInfo:', data?.personalInfo);
    debugLog('Name field:', get(data, 'personalInfo.name'));

    // KİŞİSEL BİLGİLER - Temel alanlar
    const hasName = get(data, 'personalInfo.name') || get(data, 'personalInfo.firstName');
    debugLog('hasName:', hasName);
    if (!hasName) {
      // CV yüklendi mi yüklenmedi mi ona göre farklı soru metni kullan
      const nameQuestionKey = cvWasUploaded ? 'askName' : 'askNameDirect';
      queue.push({ key: nameQuestionKey, path: 'personalInfo.name' });
    }
    if (!get(data, 'personalInfo.email')) {
      queue.push({
        key: 'askEmail',
        path: 'personalInfo.email',
        requiresValidation: 'email'
      });
    }
    if (!get(data, 'personalInfo.location')) { queue.push({ key: 'askLocation', path: 'personalInfo.location' }); }
    if (!get(data, 'personalInfo.phone')) { queue.push({ key: 'askPhone', path: 'personalInfo.phone' }); }

    // ÖZET - Kendini anlatma sorusu (HER ZAMAN sor, CV yüklü olsa bile geliştirebilir)
    if (!get(data, 'summary') || get(data, 'summary').length < 150) {
      queue.push({ key: 'askSummary', path: 'summary' });
    }

    // DENEYİM - Eksik detaylar varsa sor
    const experiences = get(data, 'experience') || [];
    if (experiences.length === 0) {
      queue.push({ key: 'askExperience', isComplex: true });
    } else {
      // Son iş deneyiminin güncel olup olmadığını kontrol et
      const latestExp = experiences[0]; // En son deneyim
      const needsCurrentJobCheck = !latestExp.endDate ||
        latestExp.endDate === '' ||
        latestExp.endDate === 'Present' ||
        latestExp.endDate === 'Günümüz' ||
        latestExp.endDate === 'Halen';

      if (!needsCurrentJobCheck) {
        // End date varsa, son iş deneyiminin güncel olup olmadığını sor
        queue.push({
          key: 'askCurrentJob',
          isMultipleChoice: true,
          choices: ['Halen çalışıyorum', '2024'],
          path: 'experience[0].endDate'
        });
      }

      // Mevcut deneyimlerde eksik lokasyon varsa sor
      const hasIncompleteExp = experiences.some(exp =>
        !exp.location || exp.location === 'undened' || exp.location === 'undefined' || exp.location.trim() === ''
      );
      if (hasIncompleteExp) {
        queue.push({ key: 'askExperienceLocation', path: 'experience', isLocationFix: true });
      }
    }

    // EĞİTİM - En az 1 eğitim bilgisi (HER ZAMAN kontrol et)
    if (!get(data, 'education') || get(data, 'education').length === 0) {
      queue.push({ key: 'askEducation', isComplex: true });
    }

    // YETENEKLER - Yetersizse sor (daha yüksek threshold)
    const skills = get(data, 'skills') || [];
    if (skills.length < 8) {
      queue.push({ key: 'askSkills', path: 'skills', isArray: true });
    }

    // DİLLER - En az 1 dil bilgisi (HER ZAMAN kontrol et)
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
      startScriptedQuestions(res.data, true); // CV uploaded
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

      const allQuestions = (res.data.questions || []).map(q => ({
        key: q.question,
        isAi: true,
        id: q.id,
        category: q.category,
        hint: q.hint,
        isMultipleChoice: q.isMultipleChoice || false,
        choices: q.choices || []
      }));

      // Typo correction soruları ile normal soruları ayır
      const typoQuestions = allQuestions.filter(q => q.category === 'typo_correction');
      const normalQuestions = allQuestions.filter(q => q.category !== 'typo_correction');

      debugLog('Normal AI questions:', normalQuestions.length, 'Typo questions:', typoQuestions.length);

      // Typo soruları önce, sonra normal sorular (typo soruları soru sayısından sayılmaz)
      const aiQuestions = [...typoQuestions, ...normalQuestions];

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

    // Validation check
    if (!skipped && currentQuestion.requiresValidation) {
      const isValid = validateInput(userAnswer, currentQuestion.requiresValidation);
      if (!isValid) {
        // Show error message for invalid input
        if (currentQuestion.requiresValidation === 'email') {
          setError('Lütfen geçerli bir e-posta adresi girin (örn: isim@domain.com)');
          return;
        }
      } else {
        // Clear error if validation passes
        setError('');
      }
    }

    const newConversation = [...conversation, { type: 'user', text: userAnswer }];
    let updatedCvData = JSON.parse(JSON.stringify(cvData));

    if (!skipped) {
      if (currentQuestion.path) {
        if (currentQuestion.isArray) {
          // Yetenekler gibi array alanlar için
          const skills = userAnswer.split(',').map(s => s.trim()).filter(Boolean);
          set(updatedCvData, currentQuestion.path, skills);
        } else if (currentQuestion.key === 'askCurrentJob') {
          // Son iş deneyimi için özel işleme
          if (userAnswer === 'Halen çalışıyorum') {
            set(updatedCvData, 'experience[0].endDate', 'Present');
          } else if (userAnswer === '2024' || userAnswer === '2023') {
            set(updatedCvData, 'experience[0].endDate', userAnswer);
          } else {
            // "Bunların dışında" seçeneği için kullanıcı girişi
            set(updatedCvData, 'experience[0].endDate', userAnswer);
          }
        } else {
          set(updatedCvData, currentQuestion.path, userAnswer);
          debugLog(`Updated CV data path: ${currentQuestion.path} with value:`, userAnswer);
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
    debugLog('CV Data updated, summary:', get(updatedCvData, 'summary'));

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

      // PDF indirildikten sonra success mesajı göster
      setStep('final');
      setHasGeneratedPdf(true);
      setShowCoverLetterForm(true);

      // Cover letter generation removed from here - will be triggered by user action

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

  const handleGenerateCoverLetterWithInfo = async () => {
    if (!cvData) return;

    setLoadingMessage("Ön yazı oluşturuluyor...");
    setError('');

    try {
      const preparedData = applyUserAdditions(JSON.parse(JSON.stringify(cvData)));

      const coverLetterResponse = await axios.post(`${API_BASE_URL}/api/ai/coverletter`, {
        cvData: preparedData,
        appLanguage: cvLanguage,
        sessionId,
        companyName: companyName || '',
        positionName: positionName || ''
      });

      let coverLetterText = coverLetterResponse.data.coverLetter;
      setConversation(prev => [
        ...prev,
        { type: 'ai', text: `${t('coverLetterIntro')}\n\n"${coverLetterText}"` }
      ]);

      // Generate cover letter PDF
      try {
        const coverLetterPdfResponse = await axios.post(`${API_BASE_URL}/api/ai/coverletter-pdf`, {
          cvData: preparedData,
          appLanguage: cvLanguage,
          sessionId,
          companyName: companyName || '',
          positionName: positionName || ''
        }, { responseType: 'blob' });

        const coverLetterUrl = window.URL.createObjectURL(new Blob([coverLetterPdfResponse.data], { type: 'application/pdf' }));
        setCoverLetterPdfUrl(coverLetterUrl);
        infoLog('Cover letter PDF generated successfully');
      } catch (pdfError) {
        errorLog('Cover letter PDF generation failed:', pdfError);
        setError('Ön yazı PDF\'i oluşturulamadı. Metin olarak kullanabilirsiniz.');
      }

    } catch (error) {
      errorLog('Cover letter generation failed:', error);
      setError('Ön yazı oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoadingMessage('');
    }
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
    setShowCoverLetterForm(false);
    setCompanyName('');
    setPositionName('');
    setAskedAiQuestions([]);
    setCanRefine(true);
    setCvScore(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
    debugLog('Application restarted - all states reset');
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
    startScriptedQuestions(emptyCvData, false); // No CV uploaded
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

  const fetchAdminStats = useCallback(async () => {
    if (!superMode) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/stats`);
      setAdminStats(response.data);
      debugLog('Admin stats fetched:', response.data);
    } catch (error) {
      debugLog('Admin stats fetch failed:', error.message);
    }
  }, [debugLog, superMode]); // Keep necessary dependencies

  // Backend log polling
  useEffect(() => {
    if (superMode) {
      const interval = setInterval(fetchBackendLogs, 2000); // Her 2 saniyede bir
      fetchBackendLogs(); // İlk fetch
      return () => clearInterval(interval);
    }
  }, [superMode, fetchBackendLogs]);

  // Log viewer auto-scroll effect
  const logContentRef = useRef(null);
  useEffect(() => {
    if (superMode && logViewMode === 'tail' && logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [frontendLogs, backendLogs, logViewMode, superMode]);

  const LogViewer = () => {
    if (!superMode || !showLogViewer) return null;

    const displayFrontendLogs = logViewMode === 'tail' ? frontendLogs.slice(-15) : frontendLogs;
    const displayBackendLogs = logViewMode === 'tail' ? backendLogs.slice(-15) : backendLogs;
    const totalLogs = displayFrontendLogs.length + displayBackendLogs.length;

    const clearAllLogs = () => {
      setFrontendLogs([]);
      setBackendLogs([]);
      debugLog('All logs cleared by user');
    };

    const scrollToTop = () => {
      if (logContentRef.current) {
        logContentRef.current.scrollTop = 0;
      }
    };

    const scrollToBottom = () => {
      if (logContentRef.current) {
        logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
      }
    };

    return (
      <div className="log-viewer-v2">
        <div className="log-header-v2">
          <div className="log-header-left">
            <div className="log-title-v2">
              <span className="log-icon">📋</span>
              <h3>Live Logs</h3>
              <div className="log-badge">{totalLogs}</div>
            </div>
          </div>

          <div className="log-header-center">
            <div className="filter-pills">
              <button
                onClick={() => setLogFilter('all')}
                className={`filter-pill ${logFilter === 'all' ? 'active' : ''}`}
              >
                <span className="pill-icon">🌍</span>
                All
              </button>
              <button
                onClick={() => setLogFilter('frontend')}
                className={`filter-pill ${logFilter === 'frontend' ? 'active' : ''}`}
              >
                <span className="pill-icon">🎨</span>
                Frontend
              </button>
              <button
                onClick={() => setLogFilter('backend')}
                className={`filter-pill ${logFilter === 'backend' ? 'active' : ''}`}
              >
                <span className="pill-icon">⚙️</span>
                Backend
              </button>
            </div>
          </div>

          <div className="log-header-right">
            <div className="log-controls-v2">
              <button
                onClick={() => setLogViewMode(logViewMode === 'tail' ? 'scroll' : 'tail')}
                className={`control-btn mode-btn ${logViewMode === 'tail' ? 'active' : ''}`}
                title={logViewMode === 'tail' ? 'Switch to scroll mode' : 'Switch to tail mode'}
              >
                <span className="btn-icon">{logViewMode === 'tail' ? '📜' : '📋'}</span>
              </button>

              <button
                onClick={scrollToTop}
                className="control-btn scroll-btn"
                title="Scroll to top"
              >
                <span className="btn-icon">⬆️</span>
              </button>

              <button
                onClick={scrollToBottom}
                className="control-btn scroll-btn"
                title="Scroll to bottom"
              >
                <span className="btn-icon">⬇️</span>
              </button>

              <button
                onClick={() => setLogExpanded(!logExpanded)}
                className="control-btn expand-btn"
                title={logExpanded ? 'Compact view' : 'Expanded view'}
              >
                <span className="btn-icon">{logExpanded ? '📐' : '📏'}</span>
              </button>

              <button
                onClick={clearAllLogs}
                className="control-btn clear-btn"
                title="Clear all logs"
              >
                <span className="btn-icon">🗑️</span>
              </button>
            </div>
          </div>
        </div>

        <div className="log-content-v2" ref={logContentRef}>
          {totalLogs === 0 ? (
            <div className="no-logs-v2">
              <div className="no-logs-icon">📭</div>
              <div className="no-logs-text">No logs available</div>
              <div className="no-logs-subtext">Logs will appear here as they are generated</div>
            </div>
          ) : (
            <div className="log-entries-v2">
              {[...displayFrontendLogs.map(log => ({ ...log, source: 'frontend' })), ...displayBackendLogs.map(log => ({ ...log, source: 'backend' }))].map(log => (
                <div key={log.id} className={`log-entry-v2 ${log.level?.toLowerCase() || 'info'} ${log.source}`}>
                  <div className="log-entry-header">
                    <div className="log-timestamp">
                      {new Date(log.timestamp).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
                    </div>
                    <div className={`log-source-badge ${log.source}`}>
                      <span className="source-icon">
                        {log.source === 'frontend' ? '🎨' : '⚙️'}
                      </span>
                      <span className="source-text">{log.source}</span>
                    </div>
                    <div className={`log-level-badge ${log.level?.toLowerCase() || 'info'}`}>
                      {log.level || 'INFO'}
                    </div>
                  </div>
                  <div className="log-message-v2">
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {logViewMode === 'tail' && totalLogs > 20 && (
          <div className="log-footer-v2">
            <div className="tail-info">
              <span className="tail-text">Showing last 20 of {totalLogs} logs</span>
              <button
                onClick={() => setLogViewMode('scroll')}
                className="view-all-btn"
              >
                View All
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ConfigModal = () => {
    // Fetch admin stats only once when modal opens
    useEffect(() => {
      if (showConfig && superMode && !adminStats) {
        fetchAdminStats();
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!showConfig) return null;

    return (
      <div className="modal-overlay show" onClick={() => setShowConfig(false)}>
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

              <div className="config-item">
                <label>Show Log Viewer:</label>
                <button
                  onClick={() => setShowLogViewer(!showLogViewer)}
                  className={`toggle-button ${showLogViewer ? 'active' : 'inactive'}`}
                >
                  {showLogViewer ? '✅ Enabled' : '❌ Disabled'}
                </button>
              </div>

              <div className="config-item">
                <label>Admin Mode:</label>
                <button
                  onClick={() => setSuperMode(!superMode)}
                  className={`toggle-button ${superMode ? 'active' : 'inactive'}`}
                >
                  {superMode ? '✅ Enabled' : '❌ Disabled'}
                </button>
              </div>
            </div>

            {/* Background Settings */}
            <div className="config-section">
              <h4>🎨 Background Settings</h4>
              <div className="config-item">
                <label>Chat Background:</label>
                <select
                  value={chatBackground}
                  onChange={(e) => setChatBackground(e.target.value)}
                  className="config-select"
                >
                  <option value="default">Default</option>
                  <option value="gradient1">Gradient Blue</option>
                  <option value="gradient2">Gradient Purple</option>
                  <option value="pattern1">Dots Pattern</option>
                  <option value="pattern2">Grid Pattern</option>
                  <option value="custom">Custom Image</option>
                </select>
              </div>

              {chatBackground === 'custom' && (
                <div className="config-item">
                  <label>Custom Image URL:</label>
                  <input
                    type="text"
                    value={customBackgroundImage}
                    onChange={(e) => setCustomBackgroundImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="config-input"
                  />
                </div>
              )}
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
                <span className="status-badge">0.2508.091851</span>
              </div>
            </div>

            {adminStats && (
              <div className="config-section">
                <h3>📊 Server Statistics</h3>
                <div className="config-item">
                  <label>Total Sessions:</label>
                  <span className="status-badge">{adminStats.stats?.totalSessions || 0}</span>
                </div>
                <div className="config-item">
                  <label>Finalized CVs:</label>
                  <span className="status-badge">{adminStats.stats?.totalFinalizations || 0}</span>
                </div>
                <div className="config-item">
                  <label>Server Uptime:</label>
                  <span className="status-badge">{Math.floor((adminStats.serverInfo?.uptime || 0) / 60)} minutes</span>
                </div>
                <div className="config-item">
                  <label>Memory Usage:</label>
                  <span className="status-badge">{Math.floor((adminStats.serverInfo?.memory?.rss || 0) / 1024 / 1024)} MB</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Feedback open={feedbackOpen} setOpen={setFeedbackOpen} sessionId={sessionId} language={i18n.language} theme={theme} />
      <ConfigModal fetchAdminStats={fetchAdminStats} />
      {step === 'upload' ? (
        <div className="upload-step fade-in" style={{
          backgroundImage: getChatBackgroundStyle(),
          backgroundSize: chatBackground === 'pattern1' ? '20px 20px' : chatBackground === 'pattern2' ? '20px 20px' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: chatBackground.startsWith('pattern') ? 'repeat' : 'no-repeat',
          backgroundAttachment: 'fixed'
        }}>
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
        <div className="chat-step fade-in" style={{
          backgroundImage: getChatBackgroundStyle(),
          backgroundSize: chatBackground === 'pattern1' ? '20px 20px' : chatBackground === 'pattern2' ? '20px 20px' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: chatBackground.startsWith('pattern') ? 'repeat' : 'no-repeat',
          backgroundAttachment: 'fixed'
        }}>
          <div className="chat-header"><Logo onBadgeClick={() => setFeedbackOpen(true)} onLogoClick={handleLogoClick} superMode={superMode} /><div className="settings-bar">{superMode ? <button className="config-button" onClick={() => setShowConfig(true)} title="Super Mode Settings">⚙️</button> : <ThemeSwitcher theme={theme} setTheme={setTheme} />}<LanguageSwitcher /></div></div>
          <div className="chat-window" ref={chatContainerRef}>{conversation.map((msg, index) => msg.type === 'typing' ? <TypingIndicator key={index} /> : <div key={index} className={`message ${msg.type}`}>{msg.text}</div>)}</div>
          <div className="chat-input-area">
            {(step === 'scriptedQuestions' || step === 'aiQuestions') && (() => {
              const currentQuestion = questionQueue[0];
              const isMultipleChoice = currentQuestion?.isMultipleChoice;

              return (
                <>
                  {isMultipleChoice ? (
                    <div className="enhanced-choice-container">
                      <div className="preset-choices">
                        {currentQuestion.choices.filter(choice =>
                          !choice.includes('Bunların dışında') &&
                          !choice.includes('Custom input') &&
                          !choice.includes('Farklı bir yanıt')
                        ).map((choice, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentAnswer(choice);
                              processNextStep(false, choice);
                            }}
                            className="preset-choice-button"
                            disabled={isLoading}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>

                      <div className="custom-choice-section">
                        <label className="custom-choice-label">
                          Farklı bir yanıt:
                        </label>
                        <div className="custom-input-group">
                          <input
                            type="text"
                            value={currentAnswer}
                            onChange={(e) => {
                              setCurrentAnswer(e.target.value);
                              // Clear any existing error when user starts typing
                              if (error) setError('');
                            }}
                            placeholder="Kendi yanıtınızı yazın..."
                            disabled={isLoading}
                            className="custom-choice-input"
                          />
                          <button
                            onClick={() => processNextStep(false, currentAnswer)}
                            disabled={isLoading || !currentAnswer.trim()}
                            className={`custom-send-btn ${currentAnswer.trim() ? 'active' : ''}`}
                          >
                            <SendIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={currentAnswer}
                      onChange={(e) => {
                        setCurrentAnswer(e.target.value);
                        // Clear any existing error when user starts typing
                        if (error) setError('');
                      }}
                      placeholder={t('chatPlaceholder')}
                      disabled={isLoading}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), processNextStep())}
                    />
                  )}
                </>
              );
            })()}
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
                  {showCoverLetterForm && (
                    <div className="cover-letter-form">
                      <div className="success-message">
                        <div className="success-icon">✅</div>
                        <h3>CV'niz Başarıyla Hazırlandı!</h3>
                        <p>CV'niz oluşturuldu ve indirmeye hazır. Aşağıdan indirebilirsiniz.</p>
                      </div>

                      <div className="company-form">
                        <h4>Ön Yazı Oluşturalım</h4>
                        <p>Başvurmak istediğiniz firma ve pozisyon bilgisini iletirseniz ön yazınızı ona göre oluşturabilirim.</p>

                        <div className="form-group">
                          <label>Şirket Adı (İsteğe bağlı)</label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Örn: Google, Microsoft..."
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>Pozisyon (İsteğe bağlı)</label>
                          <input
                            type="text"
                            value={positionName}
                            onChange={(e) => setPositionName(e.target.value)}
                            placeholder="Örn: Frontend Developer, Product Manager..."
                            className="form-input"
                          />
                        </div>

                        <div className="form-actions">
                          <button
                            onClick={() => {
                              setShowCoverLetterForm(false);
                              handleGenerateCoverLetterWithInfo();
                            }}
                            className="primary"
                          >
                            <span>{companyName || positionName ? 'Kişiselleştirilmiş Ön Yazı Oluştur' : 'Genel Ön Yazı Oluştur'}</span>
                          </button>
                          <button
                            onClick={() => setShowCoverLetterForm(false)}
                            className="outline"
                          >
                            <span>Atla</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!showCoverLetterForm && (
                    <>
                      <button onClick={handleDownloadCv} disabled={!cvPdfUrl} className={`primary ${cvScore !== null && cvScore >= 80 ? 'highlight' : ''}`}>{t('downloadCvButton')}</button>
                      <button onClick={handleDownloadCoverLetter} disabled={!coverLetterPdfUrl} className="blue">{t('downloadCoverLetterButton')}</button>
                      <button onClick={handleRestart} className="accent">{t('restartButton')}</button>
                    </>
                  )}
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
