// backend/routes/api.js
const express = require('express');
const { logStep } = require('../utils/logger');
const fileService = require('../services/fileService');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');

const router = express.Router();

// ADIM 1: Ham Veri Çıkarma (Mevcut ve Doğru)
router.post('/extract-raw', fileService.upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Dosya bulunamadı." });
  try {
    const { sessionId } = await fileService.saveFile(req.file);
    const text = await fileService.getTextFromFile(req.file);
    const template = fileService.getTemplate();
    const extractedData = await aiService.extractRawCvData(text, template);
    res.status(200).json({ parsedData: extractedData, sessionId });
  } catch (error) { console.error("Adım 1 Hatası:", error); res.status(500).send({ message: 'CV analizi sırasında bir hata oluştu.' }); }
});

// ADIM 2: AI Sorularını Üret (Mevcut ve Doğru)
router.post('/generate-ai-questions', async (req, res) => {
  try {
    const { cvData, appLanguage, askedQuestions = [], maxQuestions = 4 } = req.body; // sessionId can be sent but is optional
    logStep("ADIM 2: AI için stratejik sorular üretiliyor.");
    const questionsData = await aiService.generateAiQuestions(cvData, appLanguage, askedQuestions, maxQuestions);
    res.json(questionsData);
  } catch (error) { console.error("Adım 2 Hatası:", error); res.status(500).send({ message: 'AI soruları üretilemedi.' }); }
});

// CV'yi puanlayan yeni uç nokta
router.post('/score-cv', async (req, res) => {
  try {
    const { cvData, appLanguage } = req.body;
    const result = await aiService.scoreCvData(cvData, appLanguage);
    res.json(result);
  } catch (error) {
    console.error("CV Puanlama Hatası:", error);
    res.status(500).send({ message: 'CV puanı alınamadı.' });
  }
});

// ADIM 3: Final PDF'i Oluştur (Mevcut ve Doğru)
router.post('/finalize-and-create-pdf', async (req, res) => {
  try {
    const { cvData, cvLanguage, sessionId } = req.body;
    const finalCvData = await aiService.finalizeCvData(cvData, cvLanguage);
    const pdfBuffer = await pdfService.createPdf(finalCvData, cvLanguage);
    if (sessionId) {
      await fileService.saveBuffer(sessionId, 'final_cv.json', Buffer.from(JSON.stringify(finalCvData, null, 2)));
      await fileService.saveBuffer(sessionId, 'cv.pdf', pdfBuffer);
    }
    logStep("PDF başarıyla oluşturuldu ve gönderiliyor.");
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Super_CV.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Adım 3 Hatası:", error);
    res.status(500).send({ message: 'Final CV oluşturulamadı.' });
  }
});


// --- YENİ EKLENEN ve EKSİK OLAN BÖLÜM ---
// ADIM 4: Ön Yazı Metnini Üret
router.post('/generate-cover-letter', async (req, res) => {
  try {
    const { cvData, appLanguage, sessionId } = req.body;
    logStep("Ön Yazı Metni için istek alındı.");
    const coverLetterText = await aiService.generateCoverLetterText(cvData, appLanguage);
    logStep(`Ön Yazı Metni oluşturuldu: ${coverLetterText.slice(0,40)}...`);
    if (sessionId) {
      await fileService.saveBuffer(sessionId, 'cover_letter.txt', Buffer.from(coverLetterText, 'utf8'));
    }
    // Ön yazıyı bir JSON nesnesi içinde geri gönderiyoruz
    res.status(200).json({ coverLetter: coverLetterText });
  } catch (error) {
    console.error("Ön Yazı Hatası:", error);
    res.status(500).send({ message: 'Ön yazı metni üretilemedi.' });
  }
});

// Ön Yazı PDF'ini üretip indiren yeni uç nokta
router.post('/generate-cover-letter-pdf', async (req, res) => {
  try {
    const { cvData, appLanguage, sessionId } = req.body;
    logStep("Ön Yazı PDF'i için istek alındı.");
    const coverLetterText = await aiService.generateCoverLetterText(cvData, appLanguage);
    const pdfBuffer = await pdfService.createCoverLetterPdf(coverLetterText);
    if (sessionId) {
      await fileService.saveBuffer(sessionId, 'cover_letter.pdf', pdfBuffer);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Cover_Letter.pdf');
    logStep("Ön Yazı PDF buffer'ı oluşturuldu ve gönderiliyor.");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Ön Yazı PDF Hatası:", error);
    res.status(500).send({ message: 'Ön yazı PDFi üretilemedi.' });
  }
});
// --- YENİ BÖLÜMÜN SONU ---


// Feedback toplama
router.post('/feedback', (req, res) => {
  try {
    const { name, email, description, language, theme, deviceInfo, sessionId } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
    const text = `Name: ${name || ''}\nEmail: ${email || ''}\nDescription: ${description}\nIP: ${ip}\nDevice: ${deviceInfo}\nLanguage: ${language}\nTheme: ${theme}\nSession: ${sessionId || ''}`;
    fileService.saveFeedback(text);
    res.status(200).json({ message: 'Feedback kaydedildi.' });
  } catch (error) {
    console.error('Feedback Hatası:', error);
    res.status(500).send({ message: 'Feedback kaydedilemedi.' });
  }
});

module.exports = router;