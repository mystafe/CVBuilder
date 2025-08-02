import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export default function Feedback({ sessionId, language, theme }) {
  const [open, setOpen] = useState(false);
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
      <div className="feedback-icon" title="info" onClick={() => setOpen(true)}>
        <span>&#8505;</span>
      </div>
      {open && (
        <div className="feedback-modal" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {sent ? (
              <p>Geri bildirimin için teşekkürler!</p>
            ) : (
              <>
                <p>Hata mı aldın/ Bir fikrin mi var? Geri bildirimin çok değerli.<br/>Uygulamamı geliştirmeme yardımcı olacak.</p>
                <input placeholder="İsim" value={name} onChange={e => setName(e.target.value)} />
                <input placeholder="Mail (Opsiyonel)" value={email} onChange={e => setEmail(e.target.value)} />
                <textarea placeholder="Açıklama (En az 5 karakter)" value={desc} onChange={e => setDesc(e.target.value)} />
                <button onClick={handleSubmit} disabled={desc.trim().length < 5 || sending}>Gönder</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
