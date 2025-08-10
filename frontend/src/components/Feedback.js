import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export default function Feedback({ sessionId, language, theme, open, setOpen }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [desc, setDesc] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (desc.trim().length < 5) return;
    setSending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/feedback`, {
        name,
        email,
        message: desc,
        language,
        theme,
        deviceInfo: navigator.userAgent,
        sessionId,
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setName('');
        setEmail('');
        setDesc('');
      }, 2000);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="feedback-modal" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-button" onClick={() => setOpen(false)}>×</button>
            {sent ? (
              <p>{t('feedbackThanks')}</p>
            ) : (
              <>
                <p dangerouslySetInnerHTML={{ __html: t('feedbackPrompt') }} />
                <input placeholder={t('feedbackNamePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
                <input placeholder={t('feedbackEmailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} />
                <textarea placeholder={t('feedbackDescPlaceholder')} value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="feedback-actions">
                  <span className="feedback-version">v{packageJson.version}</span>
                  <button onClick={handleSubmit} disabled={desc.trim().length < 5 || sending}>{t('feedbackSubmit')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
