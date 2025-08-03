// backend/services/aiService.js
const OpenAI = require('openai');
const { logStep } = require('../utils/logger');

// OpenAI istemcisini yapılandır
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- GÖREV ODAKLI, GÜÇLENDİRİLMİŞ AI PROMPTS ---

// Dil kodlarını OpenAI'nin anlayacağı tam dillere çeviren yardımcı fonksiyon
const langMap = { tr: 'Turkish', en: 'English' };
const normalizeLanguage = (code) => langMap[code] || code;

/**
 * GÖREV 1: Hızlı ve Ham Veri Çıkarma.
 * Yapay zekaya sadece ve sadece metni, verilen şablona göre JSON'a dökmesini söyler.
 * Asla yorum yapmaz veya veriyi değiştirmez.
 */
const getExtractionPrompt = (cvText, template) => `
  You are an expert data extraction bot. Your ONLY task is to parse the raw text into a structured JSON object matching the provided template structure.
  - If you see two or three consecutive words in ALL CAPS at the start of the document, they are likely the full name.
  - CRITICAL: Do NOT change, rewrite, invent, or enhance any text. Extract data exactly as it appears in the source.
  - If a section from the template is not present in the text, leave its value empty (e.g., "" or []).
  - Your output must be ONLY the valid JSON object, with no extra text or explanations.
  Template to follow: ${JSON.stringify(template)}
  Raw Text to parse:
  ---
  ${cvText}
  ---
`;

/**
 * GÖREV 2: Derin Analiz ve Stratejik Soru Üretme.
 * Yapay zekaya, mevcut CV'yi analiz edip en önemli eksikleri bulmasını ve bu eksikler için
 * belirtilen dilde sorular üretmesini söyler. DİL KURALI ÇOK KESİNDİR.
 */
const getAiQuestionsPrompt = (cvData, appLanguageCode, askedQuestions = [], maxQuestions = 4) => {
  const appLanguage = normalizeLanguage(appLanguageCode);
  return `
  You are a helpful career assistant. Carefully inspect the CV JSON below and identify up to ${maxQuestions} basic pieces of information that are missing or incomplete.

  **RULES:**
  1. **LANGUAGE LOCK:** Write every question only in '${appLanguage}'.
  2. **BASIC INFO:** Give priority to these core CV sections: summary, references, education, work experience, certifications, projects, languages, and skills.
  3. **NO DUPLICATES:** Skip anything already filled in and do not repeat any of these questions: ${askedQuestions.join(' | ')}.
  4. **ORDER:** Start with the most important missing section and proceed in descending importance.
  5. **LIMIT:** Maximum ${maxQuestions} short questions.
  6. **TONE:** Phrase each item as an observation followed by a polite request, using the correct section name.
  7. **SPECIFICITY:** Mention the exact item missing information (e.g., project name) so the user knows what to provide.
  8. **QUALITY CHECK:** If a section exists but looks weak, tell the user it doesn't look good and suggest how to improve it, then ask for a better version.

  Your final output MUST be a single JSON object with the key "questions", containing an array of strings written in ${appLanguage}.

  CV Data to analyze (in JSON format):
  ${JSON.stringify(cvData)}
`;
};

/**
 * GÖREV 3: Final CV'yi Mükemmelleştirme.
 * Yapay zekaya, toplanan tüm veriyi alıp, hedef dilde, profesyonel ve
 * hatasız bir nihai CV JSON'u oluşturmasını söyler.
 */
const getFinalizeCvPrompt = (cvData, targetLanguageCode) => {
  const targetLanguage = normalizeLanguage(targetLanguageCode);
  return `
  You are a master CV writer. Take the following structured CV JSON data, which includes user's answers to your questions, and transform it into a perfectly polished, professional CV.
  - **LANGUAGE RULE**: The final output's every single string value (summaries, descriptions, titles, categories, etc.) **MUST BE IN ${targetLanguage}**. No exceptions or other languages are permitted.
  - **ACTION**: Rewrite all job descriptions to start with strong action verbs. Integrate quantifiable achievements provided by the user. Polish the language to be professional and concise.
  - **SUMMARY**: Create a powerful new summary that encapsulates the candidate's strongest skills and most impressive experiences from the entire dataset, written from a first-person perspective.
  - **FIRST PERSON:** Ensure all narrative text, including summaries and descriptions, reads as if written by the candidate using "I" statements where appropriate.
  - **INTEGRATION**: If a 'userAdditions' array exists, interpret each {question, answer} pair and integrate the answers into the most relevant fields so no user-provided detail is lost.
  - **REFERENCES**: Include any provided reference information in a dedicated references section.
  - **CLEANUP**: Ensure consistent formatting throughout. Remove any notes or irrelevant information (like a 'userAdditions' field).
  - Return only the final, polished JSON object. The structure should remain the same as the input.

  CV Data to finalize (in JSON format):
  ${JSON.stringify(cvData)}
`;
};

// CV puanlama promptu
const getScoreCvPrompt = (cvData, appLanguageCode) => {
  const appLanguage = normalizeLanguage(appLanguageCode);
  return `
  You are an expert CV critic. Review the CV data below and provide a quality assessment.
  - Return a JSON object with keys "score" (0-100 integer) and "comment" (a short remark in ${appLanguage}).
  - Be concise and base your judgement solely on the provided data.

  CV Data:
  ${JSON.stringify(cvData)}
`;
};

/**
 * YENİ GÖREV: Ön Yazı Taslağı Oluşturma.
 * Yapay zekaya, bitmiş CV verisine dayanarak, birinci ağızdan ve belirtilen dilde bir
 * ön yazı giriş paragrafı yazmasını söyler.
 */
const getCoverLetterPrompt = (cvData, appLanguageCode) => {
  const appLanguage = normalizeLanguage(appLanguageCode);
  return `
  You are a career coach helping a candidate write a cover letter introduction. Based on the finalized CV data below, write a short, compelling, first-person paragraph (2-4 sentences). This paragraph should serve as a cover letter template that the user can copy and adapt.

  CRITICAL RULES:
  1.  **LANGUAGE LOCK:** The entire paragraph MUST BE written exclusively in '${appLanguage}'. No other languages are permitted.
  2.  **FIRST PERSON:** Write from the "I" perspective (e.g., "I am a seasoned software developer...", "Kıdemli bir yazılım geliştirici olarak...").
  3.  **HIGHLIGHT STRENGTHS:** Briefly mention 1-2 key strengths or experiences from the CV that are most impressive.
  4.  **TONE:** The tone should be professional, confident, and engaging.

  Your final output must be ONLY the text of the paragraph, as a single string.

  Final CV Data to use:
  ${JSON.stringify(cvData)}
`;
};

// --- ASENKRON FONKSİYONLAR (API ÇAĞRILARI) ---

async function extractRawCvData(cvText, template) {
  logStep("Yapay Zeka ile Ham Veri Çıkarılıyor.");
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: getExtractionPrompt(cvText, template) }],
      response_format: { type: "json_object" },
    });
    const content = response.choices[0].message.content;
    logStep(`Ham Veri Yanıtı: ${content}`);
    const parsed = JSON.parse(content);
    logStep("Ham Veri Başarıyla Çıkarıldı.");
    return parsed;
  } catch (error) {
    if (error.response?.data) {
      logStep(`Ham Veri Hatası: ${JSON.stringify(error.response.data)}`);
    } else {
      logStep(`Ham Veri Hatası: ${error.message}`);
    }
    throw error;
  }
}

async function generateAiQuestions(cvData, appLanguage, askedQuestions = [], maxQuestions = 4) {
  logStep("AI için Stratejik Sorular Üretiliyor.");
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: getAiQuestionsPrompt(cvData, appLanguage, askedQuestions, maxQuestions) }],
      response_format: { type: "json_object" },
    });
    const content = response.choices[0].message.content;
    logStep(`AI Soruları Üretildi: ${content}`);
    return JSON.parse(content);
  } catch (error) {
    if (error.response?.data) {
      logStep(`AI Soruları Hatası: ${JSON.stringify(error.response.data)}`);
    } else {
      logStep(`AI Soruları Hatası: ${error.message}`);
    }
    throw error;
  }
}

// Bu fonksiyon artık 'analysis' üretmiyor, sadece CV'yi finalize ediyor.
async function finalizeCvData(cvData, targetLanguage) {
  logStep("Final CV Metni Yapay Zeka ile Mükemmelleştiriliyor.");
  const finalizeResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: getFinalizeCvPrompt(cvData, targetLanguage) }],
    response_format: { type: "json_object" },
  });
  logStep("Final CV Metni Hazır.");
  return JSON.parse(finalizeResponse.choices[0].message.content);
}

// Ön yazı metnini üreten yeni asenkron fonksiyon
async function generateCoverLetterText(cvData, appLanguage) {
  logStep("AI ile Ön Yazı Taslağı Oluşturuluyor.");
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: getCoverLetterPrompt(cvData, appLanguage) }],
  });
  logStep("Ön Yazı Taslağı Hazır.");
  return response.choices[0].message.content.trim();
}

// CV'yi puanlayan yeni asenkron fonksiyon
async function scoreCvData(cvData, appLanguage) {
  logStep("CV Puanlaması için AI çağrılıyor.");
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: getScoreCvPrompt(cvData, appLanguage) }],
    response_format: { type: "json_object" },
  });
  logStep("CV Puanı Alındı.");
  return JSON.parse(response.choices[0].message.content);
}

// Bu fonksiyonları dışa aktarıyoruz ki diğer dosyalar kullanabilsin.
module.exports = {
  extractRawCvData,
  generateAiQuestions,
  finalizeCvData,
  generateCoverLetterText, // Yeni fonksiyonu da dışa aktarıyoruz
  scoreCvData
};