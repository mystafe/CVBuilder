// src/components/ChatStep.js
import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';

const TypingIndicator = () => <div className="message ai typing"><span></span><span></span><span></span></div>;
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="22" y1="2" x2="11" y2="13"></line> <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon> </svg>);

const ChatStep = ({
  step, conversation, currentAnswer, setCurrentAnswer, processNextStep,
  handleGeneratePdf, isLoading, loadingMessage, error, theme, setTheme
}) => {
  const { t } = useTranslation();
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation]);

  return (
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
        {step !== 'final' && (
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder={t('chatPlaceholder')}
            disabled={isLoading}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), processNextStep())}
          />
        )}
        <div className="button-group">
          {step !== 'final' && (
            <>
              <button onClick={() => processNextStep()} disabled={isLoading || !currentAnswer} className="reply-button">{t('answerButton')} <SendIcon /></button>
              <button onClick={() => processNextStep(true)} disabled={isLoading} className="secondary">{t('skipButton')}</button>
            </>
          )}
          <button onClick={handleGeneratePdf} disabled={isLoading} className="primary">
            {isLoading ? loadingMessage : t('finishButton')}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
      <footer>{`${t('footerText')} - ${new Date().getFullYear()}`}</footer>
    </div>
  );
};

export default ChatStep;