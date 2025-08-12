import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { set, get } from 'lodash';
import { useTranslation } from 'react-i18next';
import Logo from './components/Logo';
import SaveBar from './components/SaveBar.js';
import LanguageSwitcher from './components/LanguageSwitcher';
import Feedback from './components/Feedback';
import './App.css';
import { createFlow } from './lib/flow.js';

// --- Debug System Functions ---
// DEBUG fonksiyonlarını component dışında tanımlayıp, parametreli hale getirelim

// --- API Yapılandırması ---
const getApiBaseUrl = () => {
  // Öncelik: Environment variable (REACT_APP_API_BASE)
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }

  // Vercel environment variables
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }

  // İkinci öncelik: Local development otomatik tespit
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  // Vercel preview deployments
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://cvbuilder-451v.onrender.com';
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
  const { t } = useTranslation();

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
            <div className="ios-module ios-module-1x1" title={t('settings.tooltips.debug')}>
              <button
                className={`ios-single-control ${frontendDebug || backendDebug ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !(frontendDebug || backendDebug);
                  if (newValue !== frontendDebug) onToggleFrontendDebug();
                  if (newValue !== backendDebug) onToggleBackendDebug();
                }}
              >
                <div className="ios-module-icon">🐛</div>
                <div className="ios-module-title">{t('settings.debug')}</div>
              </button>
            </div>
          )}

          {/* Logs (admin) */}
          {superMode && (
            <div className="ios-module ios-module-1x1" title={t('settings.tooltips.logs')}>
              <button
                className={`ios-single-control ${showLogViewer ? 'active' : ''}`}
                onClick={() => setShowLogViewer(!showLogViewer)}
              >
                <div className="ios-module-icon">📋</div>
                <div className="ios-module-title">{t('settings.logs')}</div>
              </button>
            </div>
          )}

          {/* Application Theme */}
          <div className="ios-module ios-module-2x2" title={t('settings.tooltips.applicationTheme')}>
            <button className="ios-single-control" onClick={onOpenBackgroundSelector}>
              <div className="ios-module-icon">🎨</div>
              <div className="ios-module-content">
                <div className="ios-module-title">{t('settings.applicationTheme')}</div>
                <div className="ios-module-subtitle">
                  {backgroundCategory === 'patterns' ? t('settings.categories.patterns') :
                    backgroundCategory === 'gradients' ? t('settings.categories.gradients') :
                      backgroundCategory === 'nature' ? t('settings.categories.nature') : t('settings.categories.warm')}
                </div>
              </div>
            </button>
          </div>

          {/* Language */}
          <div className="ios-module ios-module-1x2" title={t('settings.tooltips.language')}>
            <button className="ios-single-control" onClick={onOpenLanguageSelector}>
              <div className="ios-module-icon">🌍</div>
              <div className="ios-module-title">{t('settings.language')}</div>
              <div className="ios-module-subtitle">{i18n.language === 'tr' ? 'Türkçe' : 'English'}</div>
            </button>
          </div>

          {/* Theme (admin) */}
          <div className="ios-module ios-module-1x1" title={t('settings.tooltips.theme')}>
            <button
              className={`ios-single-control ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <div className="ios-module-icon">{theme === 'dark' ? '🌙' : '☀️'}</div>
              <div className="ios-module-title">{t('settings.theme')}</div>
            </button>
          </div>

          {/* AI Model */}
          <div className="ios-module ios-module-1x2" title={t('settings.tooltips.aiModel')}>
            <button className="ios-single-control" onClick={onOpenAiModelSelector}>
              <div className="ios-module-icon">🤖</div>
              <div className="ios-module-title">{t('settings.aiModel')}</div>
              <div className="ios-module-subtitle">{aiModelCategory === 'gpt' ? t('settings.models.gpt') : t('settings.models.custom')} • {selectedModel.replace('gpt-', '').replace('-turbo', '').replace('-', ' ')}</div>
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
  const [step, setStep] = useState('upload'); // 'upload', 'scriptedQuestions', 'skillAssessment', 'aiQuestions', 'review', 'final'
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
  const [isRevising, setIsRevising] = useState(false);
  const [showDraftContinue, setShowDraftContinue] = useState(false);
  const [draftId, setDraftId] = useState(() => {
    try { return localStorage.getItem('cvb:lastDraftId') || '' } catch { return '' }
  });
  const flowRef = useRef(createFlow('source'));

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

  // Draft continue check
  useEffect(() => {
    const checkForDraft = async () => {
      if (draftId && step === 'upload') {
        try {
          const response = await fetch(`${API_BASE_URL}/api/drafts/${draftId}`);
          if (response.ok) {
            setShowDraftContinue(true);
          }
        } catch (error) {
          console.log('Draft check failed:', error);
        }
      }
    };

    checkForDraft();
  }, [draftId, step]);

  // Share link handler
  useEffect(() => {
    const handleShareLink = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shareId = urlParams.get('share');

      if (shareId) {
        debugLog('Share link detected:', shareId);
        setLoadingMessage('Loading shared draft...');

        try {
          const response = await fetch(`${API_BASE_URL}/api/share/${shareId}`);
          if (response.ok) {
            const data = await response.json();

            // Set the shared data
            setCvData(data.cv);
            setSessionId(Date.now().toString());

            // Determine the appropriate step
            let nextStep = 'final';
            if (data.extras?.step) {
              if (data.extras.step === 'chat') {
                if (data.cv && data.cv.experience && data.cv.experience.length > 0) {
                  nextStep = 'aiQuestions';
                } else {
                  nextStep = 'scriptedQuestions';
                }
              } else if (data.extras.step === 'upload') {
                nextStep = 'scriptedQuestions';
              } else {
                nextStep = data.extras.step;
              }
            } else {
              if (data.cv && data.cv.experience && data.cv.experience.length > 0) {
                nextStep = 'aiQuestions';
              } else {
                nextStep = 'scriptedQuestions';
              }
            }

            setStep(nextStep);

            // Show success message first
            setConversation([{
              type: 'ai',
              text: `✅ ${t('shareLoadSuccess', 'CV oluşturma öncesi sohbete devam ediliyor...')}`
            }]);

            // Start appropriate flow after a delay to show the message
            setTimeout(() => {
              if (nextStep === 'scriptedQuestions') {
                startScriptedQuestions(data.cv);
              } else if (nextStep === 'aiQuestions') {
                fetchAiQuestions(data.cv, 4);
              }
            }, 2000); // 2 saniye bekle

            // Clear the share parameter from URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            debugLog('Share link processed successfully');
          } else {
            throw new Error('Failed to load shared draft');
          }
        } catch (error) {
          errorLog('Failed to load shared draft:', error);
          setError(t('shareLoadError', 'Failed to load shared draft. It may have expired or been deleted.'));
          setConversation([{
            type: 'ai',
            text: `❌ ${t('shareLoadError', 'Paylaşılan taslak yüklenemedi. Süresi dolmuş veya silinmiş olabilir.')}`
          }]);
        } finally {
          setLoadingMessage('');
        }
      }
    };

    handleShareLink();
  }, [debugLog, errorLog, t]); // eslint-disable-line react-hooks/exhaustive-deps



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
    // If 'custom' theme is selected and an image exists, use it
    if (chatBackground === 'custom' && customBackgroundImage) {
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

  const startScriptedQuestions = (data, cvWasUploaded = true, skillQuestionObject = null) => {
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
    // const skills = get(data, 'skills') || [];
    // if (skills.length < 8) {
    //   queue.push({ key: 'askSkills', path: 'skills', isArray: true });
    // }

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
        const nextQuestion = queue[0];
        setConversation([{ type: 'ai', text: tApp(nextQuestion.key) }]);
        // Show choices AFTER the question is rendered
        if (nextQuestion.isMultipleChoice) {
          // No special action needed here, choices are rendered based on questionQueue
        }
        setTimeout(playMessageSound, 100);
      }, 500 + Math.random() * 300); // 0.5-0.8 seconds
    } else {
      debugLog('Queue is empty, calling fetchAiQuestions with data:', data);
      fetchAiQuestions(data); // Script'li soruya gerek yoksa direkt Adım 2'ye geç
    }

    if (skillQuestionObject) {
      queue.unshift(skillQuestionObject);
    }

    // Flow transition: typeDetect -> followups
    try {
      const s = flowRef.current.next();
      debugLog('Flow moved to:', s);
    } catch { }
  };

  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.1, now);
      oscillator.type = 'sine';

      // Simple success chime: C5 -> G5
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(783.99, now + 0.1); // G5

      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (error) {
      console.log('Audio not supported or blocked');
    }
  }, []);

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
      const parsedCvData = res.data;
      debugLog('Generated Session ID:', sessionId);
      debugLog('CV Data:', parsedCvData);

      setSessionId(sessionId);
      setCvData(parsedCvData); // Set CV data before fetching question

      // Flow transitions: source -> parse -> typeDetect
      try {
        const s1 = flowRef.current.next(); // source -> parse
        debugLog('Flow moved to:', s1);
        const s2 = flowRef.current.next(); // parse -> typeDetect
        debugLog('Flow moved to:', s2);
      } catch { }

      // Now, fetch the dynamic skill question
      try {
        const skillQuestionRes = await axios.post(`${API_BASE_URL}/api/ai/generate-skill-question`, {
          cvData: parsedCvData,
          appLanguage: i18n.language,
        });
        const dynamicQuestion = skillQuestionRes.data.question;

        // Add the dynamic question to the start of the queue
        const skillQuestionObject = {
          key: dynamicQuestion, // The key is the question itself
          path: 'skills', // The answer will update the skills
          isArray: true, // The answer will be parsed as an array
          isDynamic: true // Flag to identify this question
        };

        startScriptedQuestions(parsedCvData, true, skillQuestionObject);

      } catch (skillQuestionError) {
        errorLog('Failed to fetch dynamic skill question:', skillQuestionError);
        // Fallback to the old scripted questions if the new endpoint fails
        startScriptedQuestions(parsedCvData, true);
      }

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

  const handleCvbImport = async (file) => {
    if (!file) return;

    setLoadingMessage('Importing .cvb file...');
    setError('');

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate imported data structure
      if (!importedData.cv) {
        throw new Error('Invalid .cvb file: missing CV data');
      }

      // Set the imported data
      setCvData(importedData.cv);

      // Clear states
      setCurrentAnswer('');
      setQuestionQueue([]);
      setAskedAiQuestions([]);

      // Generate session ID for the imported data
      const sessionId = Date.now().toString();
      setSessionId(sessionId);

      // Determine the appropriate step based on imported data
      let nextStep = 'final';

      if (importedData.extras?.step) {
        if (importedData.extras.step === 'chat') {
          // If it was in chat mode, determine if it should go to scripted or AI questions
          if (importedData.cv && importedData.cv.experience && importedData.cv.experience.length > 0) {
            nextStep = 'aiQuestions';
          } else {
            nextStep = 'scriptedQuestions';
          }
        } else if (importedData.extras.step === 'upload') {
          nextStep = 'scriptedQuestions';
        } else {
          nextStep = importedData.extras.step;
        }
      } else {
        // If no step info, determine based on CV completeness
        if (importedData.cv && importedData.cv.experience && importedData.cv.experience.length > 0) {
          nextStep = 'aiQuestions';
        } else {
          nextStep = 'scriptedQuestions';
        }
      }

      setStep(nextStep);

      // If going to scripted questions, start them
      if (nextStep === 'scriptedQuestions') {
        startScriptedQuestions(importedData.cv);
      } else if (nextStep === 'aiQuestions') {
        fetchAiQuestions(importedData.cv, 4);
      } else {
        // Show success message only if going to final step
        setConversation([{
          type: 'ai',
          text: `✅ ${t('importSuccessMessage')}`
        }]);
      }

      setLoadingMessage('');

    } catch (err) {
      errorLog('CVB import error:', err);
      setError('Failed to import .cvb file. Please check if the file is valid.');
      setLoadingMessage('');
    }
  };

  const fetchSkillAssessmentQuestions = async (currentData, subsequentAiQuestions = 4) => {
    setLoadingMessage("Analyzing your profession for specific skills...");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/ai/generate-skill-assessment`, {
        cvData: currentData,
        appLanguage: i18n.language,
      });

      const skillQuestions = (res.data.questions || []).map(q => ({
        ...q,
        isSkillAssessment: true, // Flag for special handling
        subsequentAiQuestions: subsequentAiQuestions // Carry over the number
      }));

      if (skillQuestions.length > 0) {
        setQuestionQueue(skillQuestions);
        setStep('skillAssessment');
        setConversation(prev => [...prev, {
          type: 'typing'
        }]);

        setTimeout(() => {
          const nextQuestion = skillQuestions[0];
          setConversation(prev => {
            const newConversation = prev.filter(msg => msg.type !== 'typing');
            return [...newConversation, {
              type: 'ai',
              text: nextQuestion.question
            }];
          });
          setTimeout(playMessageSound, 100);
        }, 500 + Math.random() * 300);
      } else {
        // If no specific skills found, skip to general AI questions
        fetchAiQuestions(currentData, subsequentAiQuestions);
      }
    } catch (err) {
      errorLog('Failed to fetch skill assessment questions:', err);
      // Fallback to general AI questions if this step fails
      fetchAiQuestions(currentData, subsequentAiQuestions);
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
          const nextQuestion = aiQuestions[0];
          setConversation(prev => {
            const newConversation = prev.filter(msg => msg.type !== 'typing');
            return [...newConversation, { type: 'ai', text: nextQuestion.key }];
          });
          // Choices will render with the question
          setTimeout(playMessageSound, 100);
        }, 500 + Math.random() * 300); // 0.5-0.8 seconds
      } else {
        setCanRefine(false);
        // Wait before showing final message to let user read the last answer
        setTimeout(() => {
          scoreCv(cvData); // This will add the final combined message
        }, 1000);
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
          const skills = userAnswer.split(',').map(s => s.trim()).filter(s => s.toLowerCase() !== 'yok' && s.toLowerCase() !== 'hayır' && s.toLowerCase() !== 'no');
          // If the user said "yok" and the array is empty, keep it empty.
          if (skills.length > 0) {
            set(updatedCvData, currentQuestion.path, skills);
          } else {
            set(updatedCvData, currentQuestion.path, []); // Ensure it's an empty array
          }
        } else if (currentQuestion.isSkillAssessment) {
          // Handle skill assessment answers
          const skill = currentQuestion.key; // Use the key directly from the backend

          if (userAnswer.toLowerCase() !== 'yok' && userAnswer.toLowerCase() !== 'none') {
            // Ensure skills is an array of objects
            if (!Array.isArray(updatedCvData.skills)) {
              updatedCvData.skills = [];
            }
            // Add or update skill with level
            const existingSkillIndex = updatedCvData.skills.findIndex(s => typeof s === 'object' && (s.key === skill || s.name === skill));
            if (existingSkillIndex > -1) {
              updatedCvData.skills[existingSkillIndex].level = userAnswer;
            } else {
              updatedCvData.skills.push({
                name: skill.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()), // Convert camelCase to Title Case for display
                level: userAnswer,
                key: skill // Keep original key for reference
              });
            }
          }
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
        const nextQuestion = remainingQuestions[0];
        setConversation(prev => {
          const filteredConversation = prev.filter(msg => msg.type !== 'typing');
          const questionText = nextQuestion.isDynamic ? nextQuestion.key : t(nextQuestion.key);
          return [...filteredConversation, { type: 'ai', text: questionText }];
        });
        setTimeout(playMessageSound, 100);
      }, 500 + Math.random() * 300); // 0.5-0.8 seconds
    } else {
      if (step === 'scriptedQuestions') {
        // Show typing indicator immediately when scripted questions end
        setConversation([...newConversation, { type: 'typing' }]);
        // Flow transition: followups -> assessSkills
        try {
          const s = flowRef.current.next();
          debugLog('Flow moved to:', s);
        } catch { }
        fetchSkillAssessmentQuestions(updatedCvData); // Go to skill assessment
      } else if (step === 'skillAssessment') {
        setConversation([...newConversation, { type: 'typing' }]);
        // Flow transition: assessSkills -> assessSector -> polish (skip sector for now)
        try {
          const s1 = flowRef.current.next(); // -> assessSector
          debugLog('Flow moved to:', s1);
          const s2 = flowRef.current.next(); // -> polish
          debugLog('Flow moved to:', s2);
        } catch { }
        // Get the number from the question we just processed.
        const subsequentAiQuestions = currentQuestion.subsequentAiQuestions || 4;
        fetchAiQuestions(updatedCvData, subsequentAiQuestions); // Go to general AI questions
      } else {
        // All AI questions answered, move to review
        setConversation([...newConversation]);
        // Wait before scoring
        setTimeout(() => {
          scoreCv(updatedCvData); // This will add the final combined message
        }, 1000);
        // Flow transition: polish -> render
        try {
          const s = flowRef.current.next();
          debugLog('Flow moved to:', s);
        } catch { }
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
        setStep('review'); // Still move to review step
        return;
      }
      const res = await axios.post(`${API_BASE_URL}/api/ai/score`, { cvData: data, appLanguage: i18n.language });
      debugLog('Score Response:', res.data);
      const score = res.data.overall || res.data.score;
      setCvScore(score);

      const finalMessage = `**CV Analiziniz Tamamlandı! Puanınız: ${score}/100**\n\n${res.data.suggestions.join(' ')}\n\nHazırsanız CV'nizi oluşturalım veya birlikte mükemmelleştirelim.`;

      setConversation(prev => {
        const newConversation = prev.filter(msg => msg.type !== 'typing');
        return [...newConversation, { type: 'ai', text: finalMessage }];
      });
      setStep('review');
      setTimeout(playMessageSound, 100);

    } catch (err) {
      errorLog('Scoring error:', err);
      setConversation(prev => [...prev, { type: 'ai', text: t('finalMessage') }]);
      setStep('review');
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
          playSuccessSound();
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

  const handleFinalizeAndGeneratePdf = async () => {
    if (!cvData) return;

    setLoadingMessage(t('generatingPdfButton'));
    setError('');

    try {
      // Step 1: Holistically improve the CV with all collected answers
      let improvedCvData = { ...cvData };
      if (cvData.userAdditions && cvData.userAdditions.length > 0) {
        setLoadingMessage("AI finalizing your CV..."); // Update status
        try {
          const improveResponse = await axios.post(`${API_BASE_URL}/api/ai/improve`, {
            cv: cvData,
            answers: cvData.userAdditions.reduce((acc, item) => {
              acc[item.question] = item.answer;
              return acc;
            }, {})
          });
          improvedCvData = improveResponse.data;
          setCvData(improvedCvData); // Update state with the improved CV
          infoLog('CV data holistically improved by AI.');
        } catch (improveErr) {
          errorLog('Holistic CV improvement failed, proceeding with original data.', improveErr);
          // If improvement fails, we can still proceed with the data we have
        }
      }

      // Step 2: Generate the PDF with the (potentially) improved data
      setLoadingMessage("Creating PDF document..."); // Update status
      const pdfResponse = await axios.post(`${API_BASE_URL}/api/finalize-and-create-pdf`, {
        cvData: improvedCvData,
        cvLanguage,
        sessionId: sessionId || `session_${Date.now()}`
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([pdfResponse.data], {
        type: 'application/pdf'
      }));
      setCvPdfUrl(url);
      window.open(url, '_blank');
      playSuccessSound();

      setConversation(prev => [...prev, {
        type: 'ai',
        text: `✅ **CV'niz Başarıyla Hazırlandı!**\n\nCV'niz oluşturuldu ve indirmeye hazır. Aşağıdan indirebilirsiniz.\n\n**Ön Yazı Oluşturalım**\n\nBaşvurmak istediğiniz firma ve pozisyon bilgisini iletirseniz ön yazınızı ona göre oluşturabilirim. İsterseniz bu adımı atlayabilirsiniz.`
      }]);

      setStep('final');
      setHasGeneratedPdf(true);
      setShowCoverLetterForm(true);

    } catch (err) {
      setError(t('pdfError'));
    } finally {
      setLoadingMessage('');
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
    setConversation(prev => [...prev, { type: 'user', text: t('improveButton') }, { type: 'typing' }]);
    fetchSkillAssessmentQuestions(cvData, 2);
  };

  const handleCoverLetterSubmit = async () => {
    if (!cvData) return;

    // Kullanıcı mesajını conversation'a ekle
    setConversation(prev => [...prev, { type: 'user', text: currentAnswer }]);

    setLoadingMessage("Ön yazı oluşturuluyor...");
    setError('');

    try {
      const preparedData = applyUserAdditions(JSON.parse(JSON.stringify(cvData)));

      // --- Improved Company and Position Extraction ---
      const userInput = currentAnswer.trim();
      let extractedCompany = '';
      let extractedPosition = '';

      const positionKeywords = [
        'yazılım mühendisi', 'software engineer', 'yazılım geliştirici', 'software developer',
        'kıdemli yazılım mühendisi', 'senior software engineer', 'geliştirici', 'developer',
        'proje müdürü', 'project manager', 'ürün müdürü', 'product manager',
        'müdür', 'manager', 'uzman', 'specialist', 'analist', 'analyst',
        'veri bilimci', 'data scientist', 'veri analisti', 'data analyst',
        'tasarımcı', 'designer', 'ui/ux designer', 'ui/ux tasarımcısı',
        'mimar', 'architect', 'yönetici', 'director', 'ceo', 'cto', 'cfo',
        'stajyer', 'intern', 'danışman', 'consultant'
      ];

      let foundPosition = '';
      // Find the longest matching position keyword
      for (const pos of positionKeywords) {
        if (userInput.toLowerCase().includes(pos)) {
          if (pos.length > foundPosition.length) {
            foundPosition = pos;
          }
        }
      }

      if (foundPosition) {
        extractedPosition = foundPosition;
        const companyRegex = new RegExp(foundPosition, 'i');
        extractedCompany = userInput.replace(companyRegex, '').trim();

        // Clean up company name from common suffixes
        extractedCompany = extractedCompany.replace(/(şirketi|şirket|a\.ş\.|ltd\.|şti\.|as\.|inc\.)/gi, '').trim();

      } else {
        // Fallback if no keyword is found
        const words = userInput.split(' ');
        if (words.length > 2) {
          extractedPosition = words.slice(-2).join(' ');
          extractedCompany = words.slice(0, -2).join(' ');
        } else if (words.length === 2) {
          extractedPosition = words[1];
          extractedCompany = words[0];
        } else {
          extractedCompany = userInput;
        }
      }

      // Capitalize for better presentation and update state
      const capitalize = (str) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      if (extractedPosition) {
        extractedPosition = capitalize(extractedPosition);
        setPositionName(extractedPosition);
      }
      if (extractedCompany) {
        extractedCompany = capitalize(extractedCompany);
        setCompanyName(extractedCompany);
      }

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
    setIsRevising(false);
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

  const handleRevisionRequest = () => {
    setIsRevising(true);
    setConversation(prev => [
      ...prev,
      {
        type: 'ai',
        text: t('revisionPrompt')
      }
    ]);
  };

  const handleRevisionSubmit = async () => {
    if (!currentAnswer.trim()) return;

    setConversation(prev => [...prev, {
      type: 'user',
      text: currentAnswer
    }]);
    setLoadingMessage(t('revisingCvButton'));
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/finalize-and-create-pdf`, {
        cvData,
        cvLanguage,
        sessionId: sessionId || `session_${Date.now()}`,
        revisionRequest: currentAnswer // Send the revision text to the backend
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data], {
        type: 'application/pdf'
      }));
      setCvPdfUrl(url);
      window.open(url, '_blank');
      playSuccessSound();

      setConversation(prev => [...prev, {
        type: 'ai',
        text: t('revisionSuccessMessage')
      }]);
      setIsRevising(false);
      setCurrentAnswer('');

    } catch (err) {
      errorLog('CV revision failed:', err);
      setError(t('pdfError'));
    } finally {
      setLoadingMessage('');
    }
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

  // Custom Image Modal - Completely Redesigned for a spectacular look and feel
  const CustomImageModal = () => {
    const [previewImage, setPreviewImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    // 'upload' or 'url' to show the relevant input
    const [inputMode, setInputMode] = useState(null);

    useEffect(() => {
      // Reset state when modal is closed
      if (!showCustomImageModal) {
        setPreviewImage(null);
        setIsLoading(false);
        setUploadProgress(0);
        setStatusText('');
        setInputMode(null);
        setCustomImageUrl('');
        setUploadError('');
      }
    }, []);

    if (!showCustomImageModal) return null;

    const handleImageUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUploadError('Image size must be less than 5MB.');
        return;
      }

      setUploadError('');
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
        setUploadProgress(100);
        setStatusText('Preview ready. Click Apply to save.');
      };
      reader.readAsDataURL(file);
    };

    const handleUrlSubmit = async () => {
      if (!customImageUrl) return;

      setIsLoading(true);
      setUploadError('');
      setStatusText('Fetching image...');
      setUploadProgress(10);

      try {
        new URL(customImageUrl);
        const img = new Image();
        img.onload = () => {
          setPreviewImage(customImageUrl);
          setIsLoading(false);
          setUploadProgress(100);
          setStatusText('Preview ready. Click Apply to save.');
        };
        img.onerror = () => {
          setUploadError('Could not load image from URL.');
          setIsLoading(false);
          setStatusText('');
          setUploadProgress(0);
        };
        img.src = customImageUrl;
      } catch {
        setUploadError('Please enter a valid image URL.');
        setIsLoading(false);
        setStatusText('');
        setUploadProgress(0);
      }
    };

    const handleApplyImage = () => {
      if (previewImage) {
        setCustomBackgroundImage(previewImage);
        setChatBackground('custom');
        setBackgroundCategory('custom'); // This line fixes the active state for custom image
        setShowCustomImageModal(false);
      }
    };

    const handleRemoveCurrent = () => {
      setCustomBackgroundImage('');
      setChatBackground('pattern2'); // Revert to a default
      setShowCustomImageModal(false);
    };

    const backgroundToShow = previewImage || customBackgroundImage || 'none';

    return (
      <div className="modal-overlay show" onClick={() => setShowCustomImageModal(false)}>
        <div
          className="modal-content spectacular-custom-image-modal"
          onClick={e => e.stopPropagation()}
        >
          <div className="spectacular-bg-preview" style={{ backgroundImage: `url(${backgroundToShow})` }}>
            <div className="spectacular-header">
              <h3>Application Theme</h3>
              <button className="spectacular-close" onClick={() => setShowCustomImageModal(false)}>✕</button>
            </div>

            <div className="spectacular-status-overlay">
              {isLoading && <span>{statusText}</span>}
              {uploadProgress > 0 && uploadProgress < 100 &&
                <div className="spectacular-progress-bar">
                  <div style={{ width: `${uploadProgress}%` }}></div>
                </div>
              }
              {statusText && !isLoading && <span className="spectacular-status-text">{statusText}</span>}
            </div>

            <div className="spectacular-controls-container">
              {inputMode === 'url' && !previewImage && (
                <div className="spectacular-url-input-container">
                  <input
                    type="url"
                    placeholder="Paste image URL here"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="spectacular-url-input"
                    autoFocus
                  />
                  <button onClick={handleUrlSubmit} className="spectacular-control-button" disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Preview URL'}
                  </button>
                </div>
              )}

              {previewImage ? (
                <div className="spectacular-actions">
                  <button onClick={handleApplyImage} className="spectacular-control-button apply">Apply Theme</button>
                  <button onClick={() => setPreviewImage(null)} className="spectacular-control-button cancel">Cancel</button>
                </div>
              ) : (
                <div className="spectacular-actions">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    id="spectacular-file-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="spectacular-file-upload" className="spectacular-control-button">
                    Upload from Device
                  </label>
                  <button onClick={() => setInputMode('url')} className="spectacular-control-button">
                    Use Image from URL
                  </button>
                  {customBackgroundImage && (
                    <button onClick={handleRemoveCurrent} className="spectacular-control-button remove">
                      Remove Custom Image
                    </button>
                  )}
                </div>
              )}
            </div>
            {uploadError && <div className="spectacular-upload-error">{uploadError}</div>}
          </div>
        </div>
      </div>
    );
  };

  function BackgroundSelectorModal({
    show,
    onClose,
    chatBackground,
    setChatBackground,
    backgroundCategory,
    setBackgroundCategory,
    customBackgroundImage,
    setShowCustomImageModal,
  }) {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [tempBackground, setTempBackground] = useState(chatBackground);
    const hoverTimeoutRef = useRef(null);

    const handleMouseEnterWithDelay = useCallback((callback) => {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        callback();
      }, 500);
    }, []);

    const handleMouseLeave = useCallback(() => {
      clearTimeout(hoverTimeoutRef.current);
    }, []);

    const categories = useMemo(() => [
      { id: 'patterns', name: t('theme.categories.patterns'), icon: '⚫', desc: t('theme.descriptions.patterns') },
      { id: 'gradients', name: t('theme.categories.gradients'), icon: '🌈', desc: t('theme.descriptions.gradients') },
      { id: 'nature', name: t('theme.categories.nature'), icon: '🌿', desc: t('theme.descriptions.nature') },
      { id: 'warm', name: t('theme.categories.warm'), icon: '🔥', desc: t('theme.descriptions.warm') },
      { id: 'custom', name: t('theme.categories.custom'), icon: '🖼️', desc: t('theme.descriptions.custom') }
    ], [t]);

    const backgroundOptions = useMemo(() => ({
      patterns: [
        { id: 'pattern1', name: t('theme.names.dots'), preview: 'ios-bg-dots' },
        { id: 'pattern2', name: t('theme.names.grid'), preview: 'ios-bg-grid' },
        { id: 'default', name: t('theme.names.none'), preview: 'ios-bg-default' }
      ],
      gradients: [
        { id: 'gradient1', name: t('theme.names.blue'), preview: 'ios-bg-gradient1' },
        { id: 'gradient2', name: t('theme.names.purple'), preview: 'ios-bg-gradient2' }
      ],
      nature: [
        { id: 'nature1', name: t('theme.names.forest'), preview: 'ios-bg-nature1' },
        { id: 'nature2', name: t('theme.names.ocean'), preview: 'ios-bg-nature2' }
      ],
      warm: [
        { id: 'warm1', name: t('theme.names.sunset'), preview: 'ios-bg-warm1' },
        { id: 'warm2', name: t('theme.names.fire'), preview: 'ios-bg-warm2' }
      ],
    }), [t]);

    const defaultsByCategory = useMemo(() => ({
      patterns: 'pattern2',
      gradients: 'gradient1',
      nature: 'nature1',
      warm: 'warm1'
    }), []);

    useEffect(() => {
      if (show) {
        setTempBackground(chatBackground);
      } else {
        setSelectedCategory(null);
      }
    }, [show, chatBackground]);

    if (!show) return null;

    const handleCategoryClick = (category) => {
      if (category.id === 'custom' && !customBackgroundImage) {
        setShowCustomImageModal(true);
        onClose();
      } else {
        setSelectedCategory(category);
        if (category.id !== 'custom') {
          const defaultTheme = defaultsByCategory[category.id] || 'pattern2';
          setTempBackground(defaultTheme);
        } else {
          setTempBackground('custom');
        }
      }
    };

    const handleApply = () => {
      if (selectedCategory) {
        setBackgroundCategory(selectedCategory.id);
      }
      setChatBackground(tempBackground);
      onClose();
    };

    const handleCancel = () => {
      onClose();
    };

    const previewStyle = (() => {
      const intensityMultiplier = { transient: 0.3, light: 0.6, normal: 1.0, header: 1.4 };
      const mult = intensityMultiplier['normal'];
      const id = tempBackground;
      if (customBackgroundImage && (id === 'custom')) {
        return `url(${customBackgroundImage})`;
      }
      switch (id) {
        case 'gradient1': return `linear-gradient(135deg, rgba(59, 130, 246, ${0.1 * mult}) 0%, rgba(147, 197, 253, ${0.05 * mult}) 100%)`;
        case 'gradient2': return `linear-gradient(135deg, rgba(139, 92, 246, ${0.1 * mult}) 0%, rgba(196, 181, 253, ${0.05 * mult}) 100%)`;
        case 'pattern1': return `radial-gradient(circle at 2px 2px, rgba(59, 130, 246, ${0.1 * mult}) 1px, transparent 0)`;
        case 'pattern2': return `linear-gradient(rgba(59, 130, 246, ${0.05 * mult}) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, ${0.05 * mult}) 1px, transparent 1px)`;
        case 'nature1': return `linear-gradient(135deg, rgba(34, 197, 94, ${0.1 * mult}) 0%, rgba(134, 239, 172, ${0.05 * mult}) 100%)`;
        case 'nature2': return `linear-gradient(135deg, rgba(16, 185, 129, ${0.1 * mult}) 0%, rgba(110, 231, 183, ${0.05 * mult}) 100%)`;
        case 'warm1': return `linear-gradient(135deg, rgba(251, 146, 60, ${0.1 * mult}) 0%, rgba(254, 215, 170, ${0.05 * mult}) 100%)`;
        case 'warm2': return `linear-gradient(135deg, rgba(239, 68, 68, ${0.1 * mult}) 0%, rgba(252, 165, 165, ${0.05 * mult}) 100%)`;
        default: return 'none';
      }
    })();

    return (
      <div className="modal-overlay show" onClick={handleCancel}>
        <div className="modal-content ios-background-selector" onClick={e => e.stopPropagation()}>
          <div className="ios-header">
            {selectedCategory && (
              <button className="ios-back-button" onClick={() => setSelectedCategory(null)}>
                {/* Text removed for a cleaner look */}
              </button>
            )}
            <h3>{selectedCategory ? selectedCategory.name : t('theme.applicationTheme')}</h3>
            <button className="ios-close" onClick={handleCancel}>✕</button>
          </div>

          <div className="ios-live-preview">
            <div className="live-preview-half light" style={{ backgroundImage: previewStyle, backgroundSize: tempBackground.startsWith('pattern') ? '20px 20px' : 'cover', backgroundRepeat: tempBackground.startsWith('pattern') ? 'repeat' : 'no-repeat', backgroundPosition: 'center' }}>
              <span className="preview-text">{t('theme.light')}</span>
            </div>
            <div className="live-preview-half dark" style={{ backgroundImage: previewStyle, backgroundSize: tempBackground.startsWith('pattern') ? '20px 20px' : 'cover', backgroundRepeat: tempBackground.startsWith('pattern') ? 'repeat' : 'no-repeat', backgroundPosition: 'center' }}>
              <span className="preview-text">{t('theme.dark')}</span>
            </div>
          </div>

          {!selectedCategory ? (
            <div className="ios-bg-categories">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`ios-category-item ${backgroundCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="ios-category-icon">{category.icon}</div>
                  <div className="ios-category-info">
                    <div className="ios-category-name">{category.name}</div>
                    <div className="ios-category-desc">{category.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="ios-bg-options">
                {selectedCategory.id === 'custom' ? (
                  <>
                    <button className="ios-bg-option" onClick={() => setTempBackground('custom')}>
                      <div className="ios-bg-preview-mini" style={{ backgroundImage: `url(${customBackgroundImage})`, backgroundSize: 'cover' }}></div>
                      <div className="ios-bg-name">{t('theme.names.applyCurrent')}</div>
                    </button>
                    <button className="ios-bg-option" onClick={() => { setShowCustomImageModal(true); onClose(); }}>
                      <div className="ios-bg-preview-mini ios-bg-upload"></div>
                      <div className="ios-bg-name">{t('theme.names.setNew')}</div>
                    </button>
                  </>
                ) : (
                  backgroundOptions[selectedCategory.id]?.map((bg) => (
                    <button
                      key={bg.id}
                      className={`ios-bg-option ${tempBackground === bg.id ? 'active' : ''}`}
                      onClick={() => setTempBackground(bg.id)}
                      onMouseEnter={() => handleMouseEnterWithDelay(() => setTempBackground(bg.id))}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className={`ios-bg-preview-mini ${bg.preview}`}></div>
                      <div className="ios-bg-name">{bg.name}</div>
                    </button>
                  ))
                )}
              </div>
              <div className="theme-modal-actions">
                <button className="apply-button" onClick={handleApply}>{t('theme.apply')}</button>
                <button className="cancel-button" onClick={handleCancel}>{t('theme.cancel')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

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
      <BackgroundSelectorModal
        show={showBackgroundSelector}
        onClose={() => setShowBackgroundSelector(false)}
        chatBackground={chatBackground}
        setChatBackground={setChatBackground}
        backgroundCategory={backgroundCategory}
        setBackgroundCategory={setBackgroundCategory}
        customBackgroundImage={customBackgroundImage}
        setShowCustomImageModal={setShowCustomImageModal}
      />
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



          {/* Draft continue message */}
          {showDraftContinue && (
            <div className="draft-continue-message">
              <p>{t('draftContinueMessage')}</p>
              <div className="draft-continue-buttons">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE_URL}/api/drafts/${draftId}`);
                      if (response.ok) {
                        const data = await response.json();
                        setCvData(data.cv);

                        // Set session ID
                        const sessionId = Date.now().toString();
                        setSessionId(sessionId);

                        // Check if we have step information in extras
                        let nextStep = 'scriptedQuestions';
                        if (data.extras && data.extras.step) {
                          if (data.extras.step === 'chat') {
                            // If we were in chat step, determine where exactly
                            if (data.cv && data.cv.experience && data.cv.experience.length > 0) {
                              nextStep = 'aiQuestions';
                            } else {
                              nextStep = 'scriptedQuestions';
                            }
                          } else if (data.extras.step === 'upload') {
                            nextStep = 'scriptedQuestions';
                          }
                        } else {
                          // Fallback: determine based on CV data completeness
                          if (data.cv && data.cv.experience && data.cv.experience.length > 0) {
                            nextStep = 'aiQuestions';
                          }
                        }

                        setStep(nextStep);
                        setShowDraftContinue(false);

                        // Start the flow based on the step
                        if (nextStep === 'scriptedQuestions') {
                          // Start with basic questions
                          startScriptedQuestions(data.cv);
                        } else if (nextStep === 'aiQuestions') {
                          // Start with AI questions
                          fetchAiQuestions(data.cv, 4);
                        }
                      }
                    } catch (error) {
                      console.log('Failed to load draft:', error);
                    }
                  }}
                  className="primary"
                >
                  {t('draftContinueButton')}
                </button>
                <button
                  onClick={() => {
                    // Clear draft from localStorage and hide the message
                    try {
                      localStorage.removeItem('cvb:lastDraftId');
                    } catch (error) {
                      console.log('Failed to clear draft from localStorage:', error);
                    }
                    setDraftId('');
                    setShowDraftContinue(false);
                  }}
                  className="secondary"
                >
                  {t('draftCancelButton')}
                </button>
              </div>
            </div>
          )}

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
            <div className="chat-window" ref={chatContainerRef} style={{ paddingBottom: 72 }}>{conversation.map((msg, index) => msg.type === 'typing' ? <TypingIndicator key={index} /> : <div key={index} className={`message ${msg.type}`}>{msg.text}</div>)}</div>
            <div className="chat-input-area">
              {(step === 'scriptedQuestions' || step === 'aiQuestions' || step === 'skillAssessment') && (() => {
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
                {(step === 'scriptedQuestions' || step === 'aiQuestions' || step === 'skillAssessment') && (
                  <>
                    <button onClick={() => processNextStep()} disabled={isLoading || !currentAnswer} className="reply-button">{t('answerButton')} <SendIcon /></button>
                    <button onClick={() => processNextStep(true)} disabled={isLoading} className="secondary">{t('skipButton')}</button>
                    <div style={{ marginLeft: 'auto', position: 'relative', zIndex: 1000 }}>
                      <SaveBar cv={cvData} target={{}} extras={{}} compact={true} onImport={handleCvbImport} />
                    </div>
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

                    {!showCoverLetterForm && !isRevising && (
                      <>
                        <button onClick={handleDownloadCv} disabled={!cvPdfUrl} className={`primary ${cvScore !== null && cvScore >= 80 ? 'highlight' : ''}`}>{t('downloadCvButton')}</button>
                        <button onClick={handleDownloadCoverLetter} disabled={!coverLetterPdfUrl} className="blue">{t('downloadCoverLetterButton')}</button>
                        <button onClick={handleRevisionRequest} disabled={isLoading} className="accent">{t('reviseCvButton')}</button>
                        <button onClick={handleRestart} className="secondary">{t('restartButton')}</button>
                        <div style={{ marginLeft: 'auto', position: 'relative', zIndex: 1000 }}>
                          <SaveBar cv={cvData} target={{}} extras={{}} compact={true} onImport={handleCvbImport} />
                        </div>
                      </>
                    )}
                    {isRevising && (
                      <>
                        <textarea
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                          placeholder={t('revisionPlaceholder')}
                          disabled={isLoading}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleRevisionSubmit())}
                        />
                        <div className="button-group">
                          <button
                            onClick={handleRevisionSubmit}
                            disabled={isLoading || !currentAnswer.trim()}
                            className="reply-button"
                          >
                            {isLoading ? t('revisingCvButton') : t('submitRevisionButton')} <SendIcon />
                          </button>
                          <button
                            onClick={() => setIsRevising(false)}
                            disabled={isLoading}
                            className="secondary"
                          >
                            {t('cancelButton')}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              {error && <p className="error-text">{error}</p>}
            </div>
          </div>
          <footer style={{ paddingBottom: 72 }}>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
        </div>
      )}
      {/* SaveBar is now rendered inside .chat-container -> .chat-input-area -> .button-group */}
      {showLogViewer && <LogViewer />}
    </div>
  );
}

export default App;
