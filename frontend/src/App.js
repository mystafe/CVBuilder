import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { set, get } from 'lodash';
import { useTranslation } from 'react-i18next';
import Logo from './components/Logo';
import LanguageSwitcher from './components/LanguageSwitcher';
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
const TypingIndicator = () => {
  // Play typing sound
  React.useEffect(() => {
    const playTypingSound = () => {
      try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.log('Audio not supported or blocked');
      }
    };

    playTypingSound();
  }, []);

  return <div className="message ai typing"><span></span><span></span><span></span></div>;
};
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="22" y1="2" x2="11" y2="13"></line> <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon> </svg>);

// Extracted ConfigModal to avoid remounts on App re-render
function ConfigModal({
  open,
  onClose,
  superMode,
  frontendDebug,
  backendDebug,
  onToggleFrontendDebug,
  onToggleBackendDebug,
  showLogViewer,
  setShowLogViewer,
  onOpenBackgroundSelector,
  onOpenLanguageSelector,
  onOpenAiModelSelector,
  backgroundCategory,
  theme,
  setTheme,
  i18n,
  aiModelCategory,
  selectedModel,
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-content ios-control-center" onClick={e => e.stopPropagation()}>
        <div className="ios-header">
          <button className="ios-close" onClick={onClose}>✕</button>
        </div>

        {/* iOS Control Center Grid */}
        <div className="ios-control-grid">

          {/* Debug (admin) */}
          {superMode && (
            <div className="ios-module ios-module-1x1" title="Toggle debug logging for frontend and backend">
              <button
                className={`ios-single-control ${frontendDebug || backendDebug ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !(frontendDebug || backendDebug);
                  if (newValue !== frontendDebug) onToggleFrontendDebug();
                  if (newValue !== backendDebug) onToggleBackendDebug();
                }}
              >
                <div className="ios-module-icon">🐛</div>
                <div className="ios-module-title">Debug</div>
              </button>
            </div>
          )}

          {/* Logs (admin) */}
          {superMode && (
            <div className="ios-module ios-module-1x1" title="Show/hide system logs viewer">
              <button
                className={`ios-single-control ${showLogViewer ? 'active' : ''}`}
                onClick={() => setShowLogViewer(!showLogViewer)}
              >
                <div className="ios-module-icon">📋</div>
                <div className="ios-module-title">Logs</div>
              </button>
            </div>
          )}

          {/* Application Theme */}
          <div className="ios-module ios-module-2x2" title="Customize application theme and visual appearance">
            <button className="ios-single-control" onClick={onOpenBackgroundSelector}>
              <div className="ios-module-icon">🎨</div>
              <div className="ios-module-content">
                <div className="ios-module-title">Application Theme</div>
                <div className="ios-module-subtitle">
                  {backgroundCategory === 'patterns' ? 'Patterns' :
                    backgroundCategory === 'gradients' ? 'Gradients' :
                      backgroundCategory === 'nature' ? 'Nature' : 'Warm Colors'}
                </div>
              </div>
            </button>
          </div>

          {/* Language */}
          <div className="ios-module ios-module-1x2" title="Change application language">
            <button className="ios-single-control" onClick={onOpenLanguageSelector}>
              <div className="ios-module-icon">🌍</div>
              <div className="ios-module-title">Language</div>
              <div className="ios-module-subtitle">{i18n.language === 'tr' ? 'Türkçe' : 'English'}</div>
            </button>
          </div>

          {/* Theme (admin) */}
          <div className="ios-module ios-module-1x1" title="Switch between light and dark mode">
            <button
              className={`ios-single-control ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <div className="ios-module-icon">{theme === 'dark' ? '🌙' : '☀️'}</div>
              <div className="ios-module-title">Theme</div>
            </button>
          </div>

          {/* AI Model */}
          <div className="ios-module ios-module-1x2" title="Select AI model for processing">
            <button className="ios-single-control" onClick={onOpenAiModelSelector}>
              <div className="ios-module-icon">🤖</div>
              <div className="ios-module-title">AI Model</div>
              <div className="ios-module-subtitle">{aiModelCategory === 'gpt' ? 'GPT' : 'Custom'} • {selectedModel.replace('gpt-', '').replace('-turbo', '').replace('-', ' ')}</div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

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
  // Admin stats removed for now
  const [showLogViewer, setShowLogViewer] = useState(() => {
    const saved = localStorage.getItem('showLogViewer');
    return saved ? JSON.parse(saved) : true;
  });
  const [chatBackground, setChatBackground] = useState(() => {
    const saved = localStorage.getItem('chatBackground');
    return saved || 'pattern2';
  });
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  const [backgroundCategory, setBackgroundCategory] = useState(() => {
    const saved = localStorage.getItem('backgroundCategory');
    return saved || 'patterns';
  });
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [languageCategory, setLanguageCategory] = useState(() => {
    const saved = localStorage.getItem('languageCategory');
    return saved || 'app';
  });
  const [showAiModelSelector, setShowAiModelSelector] = useState(false);
  const [aiModelCategory, setAiModelCategory] = useState(() => {
    const saved = localStorage.getItem('aiModelCategory');
    return saved || 'gpt';
  });
  const [customBackgroundImage, setCustomBackgroundImage] = useState(() => {
    const saved = localStorage.getItem('customBackgroundImage');
    return saved || '';
  });
  const [showCustomImageModal, setShowCustomImageModal] = useState(false);
  const [customImageMode, setCustomImageMode] = useState('upload'); // 'upload' | 'url'
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
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

  // Memoize modal states to prevent unnecessary re-renders
  // const modalStates = useMemo(() => ({
  //   showBackgroundSelector,
  //   showLanguageSelector,
  //   showAiModelSelector,
  //   showCustomImageModal,
  //   showConfig
  // }), [showBackgroundSelector, showLanguageSelector, showAiModelSelector, showCustomImageModal, showConfig]);
  const [backendDebug, setBackendDebug] = useState(() => {
    return localStorage.getItem('backendDebug') === 'true';
  });
  const [configAppLanguage, setConfigAppLanguage] = useState(i18n.language);
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('selectedModel');
    return saved || 'gpt-4o-mini';
  });
  const [frontendLogs, setFrontendLogs] = useState([]);
  const [backendLogs, setBackendLogs] = useState([]);
  const [logViewMode, setLogViewMode] = useState('tail'); // 'tail' or 'scroll'
  const [activeLogTab, setActiveLogTab] = useState('frontend'); // 'all', 'frontend', 'backend'
  const [autoLogPolling, setAutoLogPolling] = useState(() => {
    const saved = localStorage.getItem('autoLogPolling');
    return saved ? JSON.parse(saved) : true;
  });

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

  // Sound effects
  // Delay function for typing effect
  // const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const playMessageSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Çok hoş, yumuşak bildirim sesi
      const now = audioContext.currentTime;

      // Ana ton
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      oscillator.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
      oscillator.type = 'sine';

      // Yumuşak envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.03, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      oscillator.start(now);
      oscillator.stop(now + 0.25);
    } catch (error) {
      console.log('Audio not supported or blocked');
    }
  }, []);

  const debugLog = useCallback((...args) => {
    const message = args.join(' ');
    if (DEBUG) {
      // console.log('[DEBUG]', new Date().toISOString(), ...args);
      addToFrontendLogs('DEBUG', message);
    }
  }, [DEBUG, addToFrontendLogs]);

  const infoLog = useCallback((...args) => {
    const message = args.join(' ');
    // console.log('[INFO]', new Date().toISOString(), ...args);
    addToFrontendLogs('INFO', message);
  }, [addToFrontendLogs]);

  const errorLog = useCallback((...args) => {
    const message = args.join(' ');
    // console.error('[ERROR]', new Date().toISOString(), ...args);
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
  useEffect(() => { localStorage.setItem('autoLogPolling', JSON.stringify(autoLogPolling)); }, [autoLogPolling]);

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
        setSelectedModel(aiModel);

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
    localStorage.setItem('backgroundCategory', backgroundCategory);
  }, [backgroundCategory]);

  useEffect(() => {
    localStorage.setItem('languageCategory', languageCategory);
  }, [languageCategory]);

  useEffect(() => {
    localStorage.setItem('aiModelCategory', aiModelCategory);
  }, [aiModelCategory]);

  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('customBackgroundImage', customBackgroundImage);
  }, [customBackgroundImage]);

  // Custom background image is read-only now

  // Fetch admin stats only when config opens - moved to ConfigModal button click

  // Enhanced background style helper with intensity levels
  const getChatBackgroundStyle = useCallback((intensity = 'normal') => {
    // If custom background image exists, always use it
    if (customBackgroundImage) {
      return `url(${customBackgroundImage})`;
    }

    const intensityMultiplier = {
      transient: 0.3,   // For outside areas
      light: 0.6,       // For chat window
      normal: 1.0,      // Default
      header: 1.4       // For header/input (darker)
    };

    const mult = intensityMultiplier[intensity] || 1.0;

    switch (chatBackground) {
      case 'gradient1':
        return `linear-gradient(135deg, rgba(59, 130, 246, ${0.1 * mult}) 0%, rgba(147, 197, 253, ${0.05 * mult}) 100%)`;
      case 'gradient2':
        return `linear-gradient(135deg, rgba(139, 92, 246, ${0.1 * mult}) 0%, rgba(196, 181, 253, ${0.05 * mult}) 100%)`;
      case 'pattern1':
        return `radial-gradient(circle at 2px 2px, rgba(59, 130, 246, ${0.1 * mult}) 1px, transparent 0)`;
      case 'pattern2':
        return `linear-gradient(rgba(59, 130, 246, ${0.05 * mult}) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, ${0.05 * mult}) 1px, transparent 1px)`;
      case 'nature1':
        return `linear-gradient(135deg, rgba(34, 197, 94, ${0.1 * mult}) 0%, rgba(134, 239, 172, ${0.05 * mult}) 100%)`;
      case 'nature2':
        return `linear-gradient(135deg, rgba(16, 185, 129, ${0.1 * mult}) 0%, rgba(110, 231, 183, ${0.05 * mult}) 100%)`;
      case 'warm1':
        return `linear-gradient(135deg, rgba(251, 146, 60, ${0.1 * mult}) 0%, rgba(254, 215, 170, ${0.05 * mult}) 100%)`;
      case 'warm2':
        return `linear-gradient(135deg, rgba(239, 68, 68, ${0.1 * mult}) 0%, rgba(252, 165, 165, ${0.05 * mult}) 100%)`;
      case 'custom':
        return 'none';
      default:
        return 'none';
    }
  }, [chatBackground, customBackgroundImage]);

  // Apply background CSS custom properties to the document
  const applyChatBackgroundVars = useCallback(() => {
    const headerBg = getChatBackgroundStyle('header');
    const windowBg = getChatBackgroundStyle('light');
    const globalBg = getChatBackgroundStyle('normal');
    const bgSize = chatBackground.startsWith('pattern') ? '20px 20px' : 'cover';
    const bgRepeat = chatBackground.startsWith('pattern') ? 'repeat' : 'no-repeat';

    // Apply to document root for global access
    document.documentElement.style.setProperty('--chat-header-bg', headerBg);
    document.documentElement.style.setProperty('--chat-window-bg', windowBg);
    document.documentElement.style.setProperty('--global-bg', globalBg);
    document.documentElement.style.setProperty('--chat-bg-size', bgSize);
    document.documentElement.style.setProperty('--chat-bg-repeat', bgRepeat);

    // Also apply to body for better compatibility
    document.body.style.setProperty('--chat-header-bg', headerBg);
    document.body.style.setProperty('--chat-window-bg', windowBg);
    document.body.style.setProperty('--global-bg', globalBg);
    document.body.style.setProperty('--chat-bg-size', bgSize);
    document.body.style.setProperty('--chat-bg-repeat', bgRepeat);
  }, [chatBackground, getChatBackgroundStyle]);

  // Apply background variables when chatBackground changes
  useEffect(() => {
    applyChatBackgroundVars();
  }, [applyChatBackgroundVars]);

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
      // Show typing indicator first
      setConversation([{ type: 'typing' }]);

      // Wait for typing effect, then show message
      setTimeout(async () => {
        setConversation([{ type: 'ai', text: tApp(queue[0].key) }]);
        setTimeout(playMessageSound, 100);
      }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
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
        // Show typing indicator first
        setConversation(prev => [...prev, { type: 'typing' }]);

        // Wait for typing effect, then show message
        setTimeout(() => {
          setConversation(prev => {
            const newConversation = prev.filter(msg => msg.type !== 'typing');
            return [...newConversation, { type: 'ai', text: aiQuestions[0].key }];
          });
          setTimeout(playMessageSound, 100);
        }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
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
      // Show typing indicator first
      setConversation([...newConversation, { type: 'typing' }]);

      // Wait for typing effect, then show message
      setTimeout(() => {
        setConversation(prev => {
          const filteredConversation = prev.filter(msg => msg.type !== 'typing');
          return [...filteredConversation, { type: 'ai', text: t(remainingQuestions[0].key) }];
        });
        setTimeout(playMessageSound, 100);
      }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
    } else {
      if (step === 'scriptedQuestions') {
        // Show typing indicator immediately when scripted questions end
        setConversation([...newConversation, { type: 'typing' }]);
        fetchAiQuestions(updatedCvData);
      } else {
        // Show typing indicator first
        setConversation([...newConversation, { type: 'typing' }]);

        // Wait for typing effect, then show message
        setTimeout(() => {
          setConversation(prev => {
            const filteredConversation = prev.filter(msg => msg.type !== 'typing');
            return [...filteredConversation, { type: 'ai', text: t('finalMessage') }];
          });
          setTimeout(playMessageSound, 100);
        }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
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

      // Show typing indicator first
      setConversation(prev => [...prev, { type: 'typing' }]);

      // Wait for typing effect, then show message
      setTimeout(() => {
        setConversation(prev => {
          const filteredConversation = prev.filter(msg => msg.type !== 'typing');
          return [...filteredConversation, { type: 'ai', text: `${t('cvScore', { score: res.data.overall || res.data.score })} ${improvementComment}` }];
        });
        setTimeout(playMessageSound, 100);
      }, 1500 + Math.random() * 1000); // 1.5-2.5 seconds
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
        const pdfResponse = await axios.post(`${API_BASE_URL}/api/finalize-and-create-pdf`, {
          cvData: preparedData,
          cvLanguage,
          sessionId: sessionId || `session_${Date.now()}`
        }, { responseType: 'blob' });

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

      // PDF indirildikten sonra success mesajını AI yanıtı gibi göster
      setConversation(prev => [...prev, {
        type: 'ai',
        text: `✅ **CV'niz Başarıyla Hazırlandı!**\n\nCV'niz oluşturuldu ve indirmeye hazır. Aşağıdan indirebilirsiniz.\n\n**Ön Yazı Oluşturalım**\n\nBaşvurmak istediğiniz firma ve pozisyon bilgisini iletirseniz ön yazınızı ona göre oluşturabilirim. İsterseniz bu adımı atlayabilirsiniz.`
      }]);

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

  const handleCoverLetterSubmit = async () => {
    if (!cvData) return;

    // Kullanıcı mesajını conversation'a ekle
    setConversation(prev => [...prev, { type: 'user', text: currentAnswer }]);

    setLoadingMessage("Ön yazı oluşturuluyor...");
    setError('');

    try {
      const preparedData = applyUserAdditions(JSON.parse(JSON.stringify(cvData)));

      // Kullanıcının girdiği metinden şirket ve pozisyon bilgilerini çıkar
      const userInput = currentAnswer.toLowerCase();
      let extractedCompany = '';
      let extractedPosition = '';

      // Basit keyword extraction
      if (userInput.includes('google') || userInput.includes('microsoft') || userInput.includes('apple') || userInput.includes('amazon')) {
        const companies = ['google', 'microsoft', 'apple', 'amazon'];
        for (const company of companies) {
          if (userInput.includes(company)) {
            extractedCompany = company.charAt(0).toUpperCase() + company.slice(1);
            break;
          }
        }
      }

      if (userInput.includes('developer') || userInput.includes('manager') || userInput.includes('engineer') || userInput.includes('designer')) {
        const positions = ['developer', 'manager', 'engineer', 'designer'];
        for (const position of positions) {
          if (userInput.includes(position)) {
            extractedPosition = position.charAt(0).toUpperCase() + position.slice(1);
            break;
          }
        }
      }

      // State'leri güncelle
      if (extractedCompany) setCompanyName(extractedCompany);
      if (extractedPosition) setPositionName(extractedPosition);

      const coverLetterResponse = await axios.post(`${API_BASE_URL}/api/ai/coverletter`, {
        cvData: preparedData,
        appLanguage: cvLanguage,
        sessionId: sessionId || `session_${Date.now()}`,
        companyName: extractedCompany || companyName || '',
        positionName: extractedPosition || positionName || ''
      });

      let coverLetterText = coverLetterResponse.data.coverLetter;

      // AI yanıtını conversation'a ekle
      setConversation(prev => [
        ...prev,
        { type: 'ai', text: `📝 **Ön Yazınız Hazır!**\n\n"${coverLetterText}"\n\nÖn yazınızı indirmek için aşağıdaki butonu kullanabilirsiniz.` }
      ]);

      // Generate cover letter PDF
      try {
        const coverLetterPdfResponse = await axios.post(`${API_BASE_URL}/api/ai/coverletter-pdf`, {
          cvData: preparedData,
          appLanguage: cvLanguage,
          sessionId: sessionId || `session_${Date.now()}`,
          companyName: extractedCompany || companyName || '',
          positionName: extractedPosition || positionName || ''
        }, { responseType: 'blob' });

        const coverLetterUrl = window.URL.createObjectURL(new Blob([coverLetterPdfResponse.data], { type: 'application/pdf' }));
        setCoverLetterPdfUrl(coverLetterUrl);
        infoLog('Cover letter PDF generated successfully');
      } catch (pdfError) {
        errorLog('Cover letter PDF generation failed:', pdfError);
        setError('Ön yazı PDF\'i oluşturulamadı. Metin olarak kullanabilirsiniz.');
      }

      // Form'u kapat ve currentAnswer'ı temizle
      setShowCoverLetterForm(false);
      setCurrentAnswer('');

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



  // Backend log fetcher
  const fetchBackendLogs = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/logs`);
      setBackendLogs(response.data.logs || []);
    } catch (error) {
      debugLog('Failed to fetch backend logs:', error.message);
    }
  }, [debugLog]);

  // Admin stats functionality removed for now

  // Backend log polling - pause while any settings modal is open to avoid UI re-renders
  const isAnySettingsOpen = showConfig || showBackgroundSelector || showLanguageSelector || showAiModelSelector || showCustomImageModal;
  useEffect(() => {
    if (!superMode || !showLogViewer || isAnySettingsOpen || !autoLogPolling) {
      return;
    }
    const interval = setInterval(fetchBackendLogs, 2000);
    fetchBackendLogs();
    return () => clearInterval(interval);
  }, [fetchBackendLogs, superMode, showLogViewer, isAnySettingsOpen, autoLogPolling]);

  // Log viewer auto-scroll effect
  const logContentRef = useRef(null);
  useEffect(() => {
    if (superMode && logViewMode === 'tail' && logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [frontendLogs, backendLogs, logViewMode, superMode]);

  const LogViewer = () => {
    if (!superMode || !showLogViewer) return null;

    const displayFrontendLogs = logViewMode === 'tail' ? frontendLogs.slice(-20) : frontendLogs;
    const displayBackendLogs = logViewMode === 'tail' ? backendLogs.slice(-20) : backendLogs;

    const clearAllLogs = () => {
      setFrontendLogs([]);
      setBackendLogs([]);
      debugLog('All logs cleared by user');

      // Clear backend logs via API to prevent reloading
      try {
        axios.delete(`${API_BASE_URL}/api/logs`).catch(() => {
          // Fail silently if backend doesn't support this endpoint
        });
      } catch (error) {
        // Fail silently
      }
    };

    return (
      <div className="bottom-log-viewer">
        <div className="log-tabs">
          <button
            onClick={() => setActiveLogTab('frontend')}
            className={`log-tab ${activeLogTab === 'frontend' ? 'active' : ''}`}
          >
            <span className="tab-icon">🌐</span>
            <span className="tab-label">Frontend</span>
            <span className="tab-count">{displayFrontendLogs.length}</span>
          </button>
          <button
            onClick={() => setActiveLogTab('backend')}
            className={`log-tab ${activeLogTab === 'backend' ? 'active' : ''}`}
          >
            <span className="tab-icon">⚙️</span>
            <span className="tab-label">Backend</span>
            <span className="tab-count">{displayBackendLogs.length}</span>
          </button>

          <div className="log-controls">
            <button
              onClick={() => setLogViewMode(logViewMode === 'tail' ? 'full' : 'tail')}
              className="log-control-btn"
              title={logViewMode === 'tail' ? 'Show all logs' : 'Show recent logs only'}
            >
              {logViewMode === 'tail' ? '📜' : '🔽'}
            </button>
            <button
              onClick={() => setAutoLogPolling(!autoLogPolling)}
              className={`log-control-btn ${autoLogPolling ? 'active' : ''}`}
              title={autoLogPolling ? 'Auto refresh ON' : 'Auto refresh OFF'}
            >
              {autoLogPolling ? '🔁' : '⏸️'}
            </button>
            {!autoLogPolling && (
              <button
                onClick={fetchBackendLogs}
                className="log-control-btn"
                title="Refresh logs now"
              >
                ↻
              </button>
            )}
            <button
              onClick={clearAllLogs}
              className="log-control-btn"
              title="Clear all logs"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="log-content" aria-live="polite">
          {activeLogTab === 'frontend' ? (
            <div className="log-entries">
              {displayFrontendLogs.length === 0 ? (
                <div className="no-logs">No frontend logs</div>
              ) : (
                displayFrontendLogs.map((log, index) => (
                  <div key={`frontend-${log.timestamp}-${index}`} className="log-entry">
                    <span className="log-time">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`log-level ${log.level?.toLowerCase() || 'info'}`}>
                      {log.level?.toUpperCase() || 'INFO'}
                    </span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="log-entries">
              {displayBackendLogs.length === 0 ? (
                <div className="no-logs">No backend logs</div>
              ) : (
                displayBackendLogs.map((log, index) => (
                  <div key={`backend-${log.timestamp}-${index}`} className="log-entry">
                    <span className="log-time">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`log-level ${log.level?.toLowerCase() || 'info'}`}>
                      {log.level?.toUpperCase() || 'INFO'}
                    </span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>


      </div>
    );
  };

  // Background category handler
  // const handleCategorySelect = (category) => {
  //   setBackgroundCategory(category);
  //   const defaults = { patterns: 'pattern2', gradients: 'gradient1', nature: 'nature1', warm: 'warm1' };
  //   setChatBackground(defaults[category] || 'pattern2');
  // };

  // Language category handler
  const handleLanguageCategorySelect = (category) => {
    setLanguageCategory(category);
  };

  // AI Model category handler
  const handleAiModelCategorySelect = (category) => {
    setAiModelCategory(category);
  };

  const AiModelSelectorModal = () => {
    if (!showAiModelSelector) return null;

    const categories = [
      { id: 'gpt', name: 'GPT Models', icon: '🤖', desc: 'OpenAI GPT series' },
      ...(superMode ? [{ id: 'custom', name: 'Custom API', icon: '⚙️', desc: 'Custom endpoints' }] : [])
    ];

    const modelOptions = {
      gpt: [
        { id: 'gpt-4o', name: 'GPT-4o', desc: 'Latest multimodal' },
        ...(superMode ? [
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast and efficient' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: 'High performance' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Cost effective' }
        ] : [])
      ],
      ...(superMode ? {
        custom: [
          { id: 'custom-api', name: 'Custom API', desc: 'Your own endpoint' }
        ]
      } : {})
    };

    const handleModelSelect = (modelId) => {
      setSelectedModel(modelId);
      setShowAiModelSelector(false);
    };

    return (
      <div className="modal-overlay show" onClick={() => setShowAiModelSelector(false)}>
        <div className="modal-content ios-background-selector" onClick={e => e.stopPropagation()}>
          <div className="ios-header">
            <button className="ios-close" onClick={() => setShowAiModelSelector(false)}>✕</button>
          </div>

          <div className="ios-bg-categories">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`ios-category-item ${aiModelCategory === category.id ? 'active' : ''}`}
                onClick={() => handleAiModelCategorySelect(category.id)}
              >
                <div className="ios-category-icon">{category.icon}</div>
                <div className="ios-category-info">
                  <div className="ios-category-name">{category.name}</div>
                  <div className="ios-category-desc">{category.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="ios-bg-options">
            {modelOptions[aiModelCategory]?.map((model) => (
              <button
                key={model.id}
                className={`ios-bg-option ${selectedModel === model.id ? 'active' : ''}`}
                onClick={() => handleModelSelect(model.id)}
              >
                <div className="ios-model-preview">{model.id.includes('gpt-4') ? '🧠' : model.id.includes('gpt-3') ? '💡' : '⚙️'}</div>
                <div className="ios-bg-name">{model.name}</div>
                <div className="ios-model-desc">{model.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const LanguageSelectorModal = () => {
    if (!showLanguageSelector) return null;

    const categories = [
      { id: 'app', name: 'App Language', icon: '📱', desc: 'Interface language' },
      { id: 'cv', name: 'CV Language', icon: '📄', desc: 'Document language' }
    ];

    const languageOptions = {
      app: [
        { id: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { id: 'en', name: 'English', flag: '🇺🇸' }
      ],
      cv: [
        { id: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { id: 'en', name: 'English', flag: '🇺🇸' }
      ]
    };

    const handleLanguageSelect = (langId) => {
      if (languageCategory === 'app') {
        handleAppLanguageChange(langId);
      } else {
        handleCvLanguageChange(langId);
      }
      setShowLanguageSelector(false);
    };

    return (
      <div className="modal-overlay show" onClick={() => setShowLanguageSelector(false)}>
        <div className="modal-content ios-background-selector" onClick={e => e.stopPropagation()}>
          <div className="ios-header">
            <button className="ios-close" onClick={() => setShowLanguageSelector(false)}>✕</button>
          </div>

          <div className="ios-bg-categories">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`ios-category-item ${languageCategory === category.id ? 'active' : ''}`}
                onClick={() => handleLanguageCategorySelect(category.id)}
              >
                <div className="ios-category-icon">{category.icon}</div>
                <div className="ios-category-info">
                  <div className="ios-category-name">{category.name}</div>
                  <div className="ios-category-desc">{category.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="ios-bg-options">
            {languageOptions[languageCategory]?.map((lang) => (
              <button
                key={lang.id}
                className={`ios-bg-option ${(languageCategory === 'app' ? configAppLanguage : cvLanguage) === lang.id ? 'active' : ''}`}
                onClick={() => handleLanguageSelect(lang.id)}
              >
                <div className="ios-flag-preview">{lang.flag}</div>
                <div className="ios-bg-name">{lang.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Custom Image Modal
  const CustomImageModal = () => {
    const [previewImage, setPreviewImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    if (!showCustomImageModal) return null;

    const handleImageUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      setStatusText('Reading file...');
      setUploadProgress(5);
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.max(5, Math.min(95, Math.round((e.loaded / e.total) * 100)));
          setUploadProgress(percent);
        }
      };
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
        setUploadError('');
        setUploadProgress(100);
        setStatusText('Preview ready');
      };
      reader.readAsDataURL(file);
    };

    const handleUrlSubmit = async () => {
      if (!customImageUrl) return;

      setIsLoading(true);
      setUploadError('');
      setStatusText('Fetching image...');
      setUploadProgress(10);

      // Basic URL validation
      try {
        new URL(customImageUrl);

        // Test if image loads
        const img = new Image();
        img.onload = () => {
          setPreviewImage(customImageUrl);
          setIsLoading(false);
          setUploadProgress(100);
          setStatusText('Preview ready');
        };
        img.onerror = () => {
          setUploadError('Could not load image from URL');
          setIsLoading(false);
          setStatusText('');
          setUploadProgress(0);
        };
        img.src = customImageUrl;
      } catch {
        setUploadError('Please enter a valid image URL');
        setIsLoading(false);
        setStatusText('');
        setUploadProgress(0);
      }
    };

    const handleApplyImage = () => {
      if (previewImage) {
        setCustomBackgroundImage(previewImage);
        setChatBackground('custom');
        setShowCustomImageModal(false);
        setPreviewImage(null);
        setUploadError('');
        setCustomImageUrl('');
      }
    };

    const handleRemoveCurrent = () => {
      setCustomBackgroundImage(null);
      setChatBackground('default');
      setPreviewImage(null);
      setUploadError('');
      setCustomImageUrl('');
    };

    return (
      <div className="modal-overlay show" onClick={() => setShowCustomImageModal(false)}>
        <div className="modal-content ios-custom-image-modal" onClick={e => e.stopPropagation()}>
          <div className="ios-header">
            <h3>Custom Background Image</h3>
            <button className="ios-close" onClick={() => setShowCustomImageModal(false)}>✕</button>
          </div>

          <div className="ios-live-preview" style={{ backgroundImage: `url(${previewImage || customBackgroundImage || ''})` }}></div>

          <div className="custom-image-options">
            <div className="tab-switch">
              <button className={`tab-btn ${customImageMode === 'upload' ? 'active' : ''}`} onClick={() => setCustomImageMode('upload')}>Upload</button>
              <button className={`tab-btn ${customImageMode === 'url' ? 'active' : ''}`} onClick={() => setCustomImageMode('url')}>Image URL</button>
            </div>
            {/* Current Custom Image Preview */}
            {customBackgroundImage && (
              <div className="option-section current-image-section">
                <h4>🎨 Current Custom Image</h4>
                <div className="current-image-preview" style={{ backgroundImage: `url(${customBackgroundImage})` }}>
                  <div className="current-image-overlay">
                    <span>Current Background</span>
                  </div>
                </div>
                <button onClick={handleRemoveCurrent} className="remove-button">
                  Remove Current Image
                </button>
              </div>
            )}

            {/* Image Upload Section */}
            {customImageMode === 'upload' && (
              <div className="option-section compact">
                <h4>📁 Upload Image</h4>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                  id="background-upload"
                />
                <label htmlFor="background-upload" className="upload-button">Choose Image</label>
                <div className="upload-progress"><div className="bar" style={{ width: `${uploadProgress}%` }}></div></div>
                {statusText && <div className="upload-status">{statusText}</div>}
              </div>
            )}

            <div className="option-divider">or</div>

            {/* URL Input Section */}
            {customImageMode === 'url' && (
              <div className="option-section compact">
                <h4>🌐 Image URL</h4>
                <div className="url-input-group">
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="url-input"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    className="url-submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Preview'}
                  </button>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {previewImage && (
              <div className="option-section preview-section">
                <h4>👁️ Preview</h4>
                <div className="image-preview" style={{ backgroundImage: `url(${previewImage})` }}>
                  <div className="preview-overlay">
                    <span>Preview</span>
                  </div>
                </div>
                <div className="preview-actions">
                  <button onClick={handleApplyImage} className="apply-button">
                    Apply Upload
                  </button>
                  <button onClick={() => setPreviewImage(null)} className="cancel-button">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="upload-error">{uploadError}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const BackgroundSelectorModal = () => {
    // Local staging state to avoid global reflows/flicker until Apply
    const [tempCategory, setTempCategory] = useState(backgroundCategory);
    const [tempBackground, setTempBackground] = useState(chatBackground);

    useEffect(() => {
      if (showBackgroundSelector) {
        setTempCategory(backgroundCategory);
        setTempBackground(chatBackground);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showBackgroundSelector]);

    if (!showBackgroundSelector) return null;

    const categories = [
      { id: 'patterns', name: 'Patterns', icon: '⚫', desc: 'Grid and dot patterns' },
      { id: 'gradients', name: 'Gradients', icon: '🌈', desc: 'Smooth color transitions' },
      { id: 'nature', name: 'Nature', icon: '🌿', desc: 'Natural green tones' },
      { id: 'warm', name: 'Warm', icon: '🔥', desc: 'Warm and energetic colors' },
      { id: 'custom', name: 'Custom Image', icon: '🖼️', desc: 'Upload or URL image' }
    ];

    const backgroundOptions = {
      patterns: [
        { id: 'pattern1', name: 'Dots', preview: 'ios-bg-dots' },
        { id: 'pattern2', name: 'Grid', preview: 'ios-bg-grid' },
        { id: 'default', name: 'None', preview: 'ios-bg-default' }
      ],
      gradients: [
        { id: 'gradient1', name: 'Blue', preview: 'ios-bg-gradient1' },
        { id: 'gradient2', name: 'Purple', preview: 'ios-bg-gradient2' }
      ],
      nature: [
        { id: 'nature1', name: 'Forest', preview: 'ios-bg-nature1' },
        { id: 'nature2', name: 'Ocean', preview: 'ios-bg-nature2' }
      ],
      warm: [
        { id: 'warm1', name: 'Sunset', preview: 'ios-bg-warm1' },
        { id: 'warm2', name: 'Fire', preview: 'ios-bg-warm2' }
      ],
      custom: [
        { id: 'upload', name: 'Upload Image', preview: 'ios-bg-upload' },
        { id: 'url', name: 'Image URL', preview: 'ios-bg-url' },
        { id: 'current', name: 'Current Custom', preview: 'ios-bg-custom-current' }
      ]
    };

    const defaultsByCategory = {
      patterns: 'pattern2',
      gradients: 'gradient1',
      nature: 'nature1',
      warm: 'warm1'
    };

    const handleTempCategorySelect = (cat) => {
      setTempCategory(cat);
      if (cat !== 'custom') {
        setTempBackground(defaultsByCategory[cat] || 'pattern2');
      }
    };

    // Local preview style calculator (mirrors getChatBackgroundStyle but uses tempBackground)
    const previewStyle = (() => {
      const intensityMultiplier = { transient: 0.3, light: 0.6, normal: 1.0, header: 1.4 };
      const mult = intensityMultiplier['normal'];
      const id = tempBackground;
      if (customBackgroundImage && (id === 'custom')) {
        return `url(${customBackgroundImage})`;
      }
      switch (id) {
        case 'gradient1':
          return `linear-gradient(135deg, rgba(59, 130, 246, ${0.1 * mult}) 0%, rgba(147, 197, 253, ${0.05 * mult}) 100%)`;
        case 'gradient2':
          return `linear-gradient(135deg, rgba(139, 92, 246, ${0.1 * mult}) 0%, rgba(196, 181, 253, ${0.05 * mult}) 100%)`;
        case 'pattern1':
          return `radial-gradient(circle at 2px 2px, rgba(59, 130, 246, ${0.1 * mult}) 1px, transparent 0)`;
        case 'pattern2':
          return `linear-gradient(rgba(59, 130, 246, ${0.05 * mult}) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, ${0.05 * mult}) 1px, transparent 1px)`;
        case 'nature1':
          return `linear-gradient(135deg, rgba(34, 197, 94, ${0.1 * mult}) 0%, rgba(134, 239, 172, ${0.05 * mult}) 100%)`;
        case 'nature2':
          return `linear-gradient(135deg, rgba(16, 185, 129, ${0.1 * mult}) 0%, rgba(110, 231, 183, ${0.05 * mult}) 100%)`;
        case 'warm1':
          return `linear-gradient(135deg, rgba(251, 146, 60, ${0.1 * mult}) 0%, rgba(254, 215, 170, ${0.05 * mult}) 100%)`;
        case 'warm2':
          return `linear-gradient(135deg, rgba(239, 68, 68, ${0.1 * mult}) 0%, rgba(252, 165, 165, ${0.05 * mult}) 100%)`;
        default:
          return 'none';
      }
    })();

    const applyTheme = () => {
      setBackgroundCategory(tempCategory);
      setChatBackground(tempBackground);
      setShowBackgroundSelector(false);
    };

    const cancelTheme = () => {
      setShowBackgroundSelector(false);
    };

    return (
      <div className="modal-overlay show" onClick={() => setShowBackgroundSelector(false)}>
        <div className="modal-content ios-background-selector" onClick={e => e.stopPropagation()}>
          <div className="ios-header">
            <button className="ios-close" onClick={() => setShowBackgroundSelector(false)}>✕</button>
          </div>

          {/* Canlı Tema Önizlemesi */}
          <div
            className="ios-live-preview"
            style={{
              backgroundImage: previewStyle,
              backgroundSize: tempBackground.startsWith('pattern') ? '20px 20px' : 'cover',
              backgroundRepeat: tempBackground.startsWith('pattern') ? 'repeat' : 'no-repeat',
              backgroundPosition: 'center'
            }}
          />

          <div className="ios-bg-categories">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`ios-category-item ${tempCategory === category.id ? 'active' : ''}`}
                onClick={() => handleTempCategorySelect(category.id)}
              >
                <div className="ios-category-icon">{category.icon}</div>
                <div className="ios-category-info">
                  <div className="ios-category-name">{category.name}</div>
                  <div className="ios-category-desc">{category.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="ios-bg-options">
            {backgroundOptions[tempCategory]?.map((bg) => (
              <button
                key={bg.id}
                className={`ios-bg-option ${tempBackground === bg.id || (['upload', 'url'].includes(bg.id) && tempBackground === 'custom') ? 'active' : ''}`}
                onClick={() => {
                  if (bg.id === 'upload' || bg.id === 'url') {
                    setCustomImageMode(bg.id);
                    setShowCustomImageModal(true);
                  } else if (bg.id === 'current' && customBackgroundImage) {
                    setTempBackground('custom');
                  } else {
                    setTempBackground(bg.id);
                  }
                }}
              >
                <div className={`ios-bg-preview-mini ${bg.preview}`}></div>
                <div className="ios-bg-name">{bg.name}</div>
              </button>
            ))}
          </div>

          <div className="ios-bg-options" style={{ paddingTop: 0 }}>
            <button className="upload-button" onClick={applyTheme}>Apply Theme</button>
            <button className="cancel-button" onClick={cancelTheme}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  // Remove inline ConfigModal to avoid remount on App re-renders

  return (
    <div className="app-container">
      <Feedback open={feedbackOpen} setOpen={setFeedbackOpen} sessionId={sessionId} language={i18n.language} theme={theme} />
      <ConfigModal
        open={showConfig}
        onClose={() => setShowConfig(false)}
        superMode={superMode}
        frontendDebug={frontendDebug}
        backendDebug={backendDebug}
        onToggleFrontendDebug={handleFrontendDebugToggle}
        onToggleBackendDebug={handleBackendDebugToggle}
        showLogViewer={showLogViewer}
        setShowLogViewer={setShowLogViewer}
        onOpenBackgroundSelector={() => setShowBackgroundSelector(true)}
        onOpenLanguageSelector={() => setShowLanguageSelector(true)}
        onOpenAiModelSelector={() => setShowAiModelSelector(true)}
        backgroundCategory={backgroundCategory}
        theme={theme}
        setTheme={setTheme}
        i18n={i18n}
        aiModelCategory={aiModelCategory}
        selectedModel={selectedModel}
      />
      <BackgroundSelectorModal />
      <LanguageSelectorModal />
      <AiModelSelectorModal />
      <CustomImageModal />
      {step === 'upload' ? (
        <div className="upload-step fade-in" style={{
          backgroundImage: getChatBackgroundStyle('transient'),
          backgroundSize: chatBackground.startsWith('pattern') ? '20px 20px' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: chatBackground.startsWith('pattern') ? 'repeat' : 'no-repeat'
        }}>
          <div className="settings-bar"><button className="config-button" onClick={() => setShowConfig(true)} title="Settings">⚙️</button><LanguageSwitcher /></div>
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

          <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      ) : (
        <div className="chat-step fade-in">
          <div className="chat-container" style={{
            backgroundImage: getChatBackgroundStyle('transient'),
            backgroundSize: chatBackground.startsWith('pattern') ? '20px 20px' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: chatBackground.startsWith('pattern') ? 'repeat' : 'no-repeat',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="chat-header"><Logo onBadgeClick={() => setFeedbackOpen(true)} onLogoClick={handleLogoClick} superMode={superMode} /><div className="settings-bar"><button className="config-button" onClick={() => setShowConfig(true)} title="Settings">⚙️</button><LanguageSwitcher /></div></div>
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
                      <>
                        <textarea
                          value={currentAnswer}
                          onChange={(e) => {
                            setCurrentAnswer(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="Şirket adı ve pozisyon bilgilerini yazabilir veya 'atla' diyebilirsiniz..."
                          disabled={isLoading}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleCoverLetterSubmit())}
                        />
                        <div className="button-group">
                          <button
                            onClick={handleCoverLetterSubmit}
                            disabled={isLoading}
                            className="reply-button"
                          >
                            {isLoading ? 'Oluşturuluyor...' : 'Ön Yazı Oluştur'} <SendIcon />
                          </button>
                          <button
                            onClick={() => setShowCoverLetterForm(false)}
                            disabled={isLoading}
                            className="secondary"
                          >
                            Atla
                          </button>
                        </div>
                      </>
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
          </div>
          <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      )}
      {showLogViewer && <LogViewer />}
    </div>
  );
}

export default App;
