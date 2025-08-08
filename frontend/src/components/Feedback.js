import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import packageJson from '../../package.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

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
    <Dialog open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <DialogContent key="feedback-dialog">
          {sent ? (
            <p>{t('feedbackThanks')}</p>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('giveFeedback')}</DialogTitle>
              </DialogHeader>
              <p className="mb-4" dangerouslySetInnerHTML={{ __html: t('feedbackPrompt') }} />
              <Input className="mb-2" placeholder={t('feedbackNamePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
              <Input className="mb-2" placeholder={t('feedbackEmailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} />
              <textarea className="w-full border rounded-md p-2 mb-4" placeholder={t('feedbackDescPlaceholder')} value={desc} onChange={e => setDesc(e.target.value)} />
              <DialogFooter>
                <span className="text-sm text-gray-500">v{packageJson.version}</span>
                <Button onClick={handleSubmit} disabled={desc.trim().length < 5 || sending}>{t('feedbackSubmit')}</Button>
              </DialogFooter>
            </>
          )}
          <DialogClose asChild>
            <Button variant="ghost" className="absolute top-2 right-2">×</Button>
          </DialogClose>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
