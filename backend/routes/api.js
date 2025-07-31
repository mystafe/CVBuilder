// routes/api.js
const express = require('express');
const { logStep } = require('../utils/logger'); // loglama için yardımcı bir dosya oluşturalım
const fileService = require('../services/fileService');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');

const router = express.Router();

// ADIM 1: Ham Veri Çıkarma
router.post('/extract-raw', fileService.upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Dosya bulunamadı." });
  try {
    logStep("ADIM 1: CV Yüklendi.");
    await fileService.saveFile(req.file);

    logStep("Metin çıkarılıyor.");
    const text = await fileService.getTextFromFile(req.file);

    logStep("Yapay Zeka ile ham veri çıkarılıyor.");
    const template = fileService.getTemplate();
    const extractedData = await aiService.extractRawCvData(text, template);

    logStep("Ham veri başarıyla çıkarıldı ve gönderiliyor.");
    res.status(200).json({ parsedData: extractedData });
  } catch (error) {
    console.error("Adım 1 Hatası:", error);
    res.status(500).send({ message: 'CV analizi sırasında bir hata oluştu.' });
  }
});

// ADIM 2: AI Sorularını Üret
router.post('/generate-ai-questions', async (req, res) => {
  try {
    const { cvData, appLanguage } = req.body;
    logStep("ADIM 2: AI için stratejik sorular üretiliyor.");
    const questions = await aiService.generateAiQuestions(cvData, appLanguage);

    logStep("AI soruları üretildi ve gönderiliyor.");
    res.json(questions);
  } catch (error) {
    console.error("Adım 2 Hatası:", error);
    res.status(500).send({ message: 'AI soruları üretilemedi.' });
  }
});

// ADIM 3: Final PDF'i Oluştur
router.post('/finalize-and-create-pdf', async (req, res) => {
  try {
    const { cvData, cvLanguage } = req.body;
    logStep("ADIM 3: Final CV metni mükemmelleştiriliyor.");
    const finalCvData = await aiService.finalizeCvData(cvData, cvLanguage);

    logStep("PDF oluşturuluyor.");
    const pdfBuffer = await pdfService.createPdf(finalCvData);

    logStep("PDF başarıyla oluşturuldu ve gönderiliyor.");
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Super_CV.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Adım 3 Hatası:", error);
    res.status(500).send({ message: 'Final CV oluşturulamadı.' });
  }
});

module.exports = router;