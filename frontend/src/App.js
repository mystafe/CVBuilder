import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { set, get } from 'lodash';
import { useTheme } from './hooks/useTheme';
import * as apiService from './services/apiService';
import UploadStep from './components/UploadStep';
import ChatStep from './components/ChatStep';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState('upload');
  const [cvData, setCvData] = useState(null);
  const [questionQueue, setQuestionQueue] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [cvLanguage, setCvLanguage] = useState('tr');
  const [theme, setTheme] = useTheme();

  const isLoading = !!loadingMessage;

  const startScriptedQuestions = (data) => {
    const queue = [];
    if (!get(data, 'personalInfo.name') && !get(data, 'personalInfo.firstName')) queue.push({ key: 'askName', path: 'personalInfo.name' });
    if (!get(data, 'personalInfo.email')) queue.push({ key: 'askEmail', path: 'personalInfo.email' });

    setCvData(data);
    setQuestionQueue(queue);
    setStep('scriptedQuestions');

    if (queue.length > 0) {
      setConversation([{ type: 'ai', text: t(queue[0].key) }]);
    } else {
      fetchAiQuestions(data);
    }
  };

  const handleInitialParse = async (file) => {
    if (!file) return;
    setLoadingMessage(t('uploadingButtonLabel'));
    setError('');
    try {
      const parsedData = await apiService.extractRawData(file);
      startScriptedQuestions(parsedData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('errorOccurred'));
    } finally {
      setLoadingMessage('');
    }
  };

  const fetchAiQuestions = async (currentData) => {
    setLoadingMessage("AI CV'nizi Analiz Ediyor...");
    try {
      const questions = await apiService.fetchAiQuestions(currentData, i18n.language);
      const aiQuestions = questions.map(q => ({ key: q, isAi: true }));
      if (aiQuestions.length > 0) {
        setQuestionQueue(aiQuestions);
        setStep('aiQuestions');
        setConversation(prev => [...prev, { type: 'ai', text: aiQuestions[0].key }]);
      } else {
        setConversation(prev => [...prev, { type: 'ai', text: t('finalMessage') }]);
        setStep('final');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('chatError'));
    } finally {
      setLoadingMessage('');
    }
  };

  const processNextStep = (skipped = false) => {
    if (questionQueue.length === 0) return;
    const currentQuestion = questionQueue[0];
    const userAnswer = skipped ? '(atlandı)' : currentAnswer;
    if (!userAnswer && !skipped) return;

    const newConversation = [...conversation, { type: 'user', text: userAnswer }];
    let updatedCvData = JSON.parse(JSON.stringify(cvData));

    if (!skipped && currentQuestion.path) { set(updatedCvData, currentQuestion.path, userAnswer); }
    else if (!skipped && currentQuestion.isAi) {
      if (!updatedCvData.userAdditions) updatedCvData.userAdditions = [];
      updatedCvData.userAdditions.push({ question: currentQuestion.key, answer: userAnswer });
    }
    setCvData(updatedCvData);

    const remainingQuestions = questionQueue.slice(1);
    setQuestionQueue(remainingQuestions);
    setCurrentAnswer('');

    if (remainingQuestions.length > 0) {
      setConversation([...newConversation, { type: 'ai', text: t(remainingQuestions[0].key) }]);
    } else if (step === 'scriptedQuestions') {
      setConversation([...newConversation]);
      fetchAiQuestions(updatedCvData);
    } else {
      setConversation([...newConversation, { type: 'ai', text: t('finalMessage') }]);
      setStep('final');
    }
  };

  const handleGeneratePdf = async () => {
    if (!cvData) { setError(t('pdfError')); return; }
    setLoadingMessage(t('generatingPdfButton'));
    setError('');
    try {
      const pdfBlob = await apiService.finalizeAndCreatePdf(cvData, cvLanguage);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = (get(cvData, 'personalInfo.name') || 'Super_CV').replace(/\s+/g, '_') + '.pdf';
      link.setAttribute('download', fileName);
      document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(t('pdfError'));
    } finally {
      setLoadingMessage('');
    }
  };

  return (
    <div className="app-container">
      {step === 'upload' ? (
        <UploadStep
          onFileSelect={handleInitialParse}
          cvLanguage={cvLanguage}
          setCvLanguage={setCvLanguage}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          error={error}
          theme={theme}
          setTheme={setTheme}
        />
      ) : (
        <ChatStep
          step={step}
          conversation={conversation}
          currentAnswer={currentAnswer}
          setCurrentAnswer={setCurrentAnswer}
          processNextStep={processNextStep}
          handleGeneratePdf={handleGeneratePdf}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          error={error}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </div>
  );
}

export default App;