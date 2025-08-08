import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

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
        description: desc,
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-md relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-xl text-gray-500 hover:text-gray-700" onClick={() => setOpen(false)}>×</button>
            {sent ? (
              <p>{t('feedbackThanks')}</p>
            ) : (
              <>
                <p className="mb-4" dangerouslySetInnerHTML={{ __html: t('feedbackPrompt') }} />
                <input className="w-full border rounded-md p-2 mb-2" placeholder={t('feedbackNamePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
                <input className="w-full border rounded-md p-2 mb-2" placeholder={t('feedbackEmailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} />
                <textarea className="w-full border rounded-md p-2 mb-4" placeholder={t('feedbackDescPlaceholder')} value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">v{packageJson.version}</span>
                  <button onClick={handleSubmit} disabled={desc.trim().length < 5 || sending} className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 disabled:opacity-50">{t('feedbackSubmit')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
