// src/services/apiService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Bir CV dosyasını backend'e gönderir ve ham veriyi çıkarır.
 */
export async function extractRawData(file) {
  const formData = new FormData();
  formData.append('cv', file);
  const response = await axios.post(`${API_BASE_URL}/api/extract-raw`, formData, {
    timeout: 45000,
  });
  return response.data.parsedData;
}

/**
 * Mevcut CV verisine göre AI'dan stratejik sorular ister.
 */
export async function fetchAiQuestions(cvData, appLanguage, askedQuestions = [], maxQuestions = 4) {
  const response = await axios.post(`${API_BASE_URL}/api/generate-ai-questions`, {
    cvData,
    appLanguage,
    askedQuestions,
    maxQuestions,
  });
  return response.data.questions || [];
}

/**
 * Son haldeki CV verisini göndererek PDF oluşturur ve indirir.
 */
export async function finalizeAndCreatePdf(cvData, cvLanguage) {
  const response = await axios.post(`${API_BASE_URL}/api/finalize-and-create-pdf`, {
    cvData,
    cvLanguage
  }, {
    responseType: 'blob'
  });
  return response.data;
}

/**
 * CV verisine göre ön yazı PDF'i oluşturur ve indirir.
 */
export async function generateCoverLetterPdf(cvData, appLanguage) {
  const response = await axios.post(`${API_BASE_URL}/api/generate-cover-letter-pdf`, {
    cvData,
    appLanguage
  }, {
    responseType: 'blob'
  });
  return response.data;
}