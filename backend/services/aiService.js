// backend/services/aiService.js
const OpenAI = require('openai');
const { logStep } = require('../utils/logger');

// OpenAI istemcisini yapılandır
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- GÖREV ODAKLI, GÜÇLENDİRİLMİŞ AI PROMPTS ---

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
const getAiQuestionsPrompt = (cvData, appLanguage) => `
  You are a senior career coach. Analyze the provided CV JSON data. Your goal is to identify up to 4 of the most critical weaknesses or missing information that would significantly improve this CV.

  **CRITICAL RULES:**
  1.  **LANGUAGE LOCK:** Your entire response, specifically the questions in the final JSON array, **MUST BE WRITTEN EXCLUSIVELY in the target language: '${appLanguage}'**. Do NOT use English or any other language unless '${appLanguage}' itself is English. This is your most important instruction. Failure to adhere to the language rule means the task is a failure.
  2.  **NO REPEAT:** Do not ask for information that is already clearly present and detailed in the JSON (e.g., if 'email' has a value, do not ask for it).
  3.  **IMPACT FOCUS:** Focus on impactful areas that are missing or weak: quantifiable achievements (e.g., "by X%"), project details, specific technical skills related to a job, or career objectives.
  4.  **LIMIT:** Generate a maximum of 4 questions.

  Your final output MUST be a single JSON object with the key "questions", containing an array of strings.
  Example JSON output: { "questions": ["Question 1 in ${appLanguage}?", "Question 2 in ${appLanguage}?"] }
  
  CV Data to analyze (in JSON format):
  ${JSON.stringify(cvData)}
`;

/**
 * GÖREV 3: Final CV'yi Mükemmelleştirme.
 * Yapay zekaya, toplanan tüm veriyi alıp, hedef dilde, profesyonel ve
 * hatasız bir nihai CV JSON'u oluşturmasını söyler.
 */
const getFinalizeCvPrompt = (cvData, targetLanguage) => `
  You are a master CV writer. Take the following structured CV JSON data, which includes user's answers to your questions, and transform it into a perfectly polished, professional CV.
  - **LANGUAGE RULE**: The final output's every single string value (summaries, descriptions, titles, categories, etc.) **MUST BE IN ${targetLanguage}**. No exceptions or other languages are permitted.
  - **ACTION**: Rewrite all job descriptions to start with strong action verbs. Integrate quantifiable achievements provided by the user. Polish the language to be professional and concise.
  - **SUMMARY**: Create a powerful new summary that encapsulates the candidate's strongest skills and most impressive experiences from the entire dataset.
  - **CLEANUP**: Ensure consistent formatting throughout. Remove any notes or irrelevant information (like a 'userAdditions' field).
  - Return only the final, polished JSON object. The structure should remain the same as the input.
  
  CV Data to finalize (in JSON format):
  ${JSON.stringify(cvData)}
`;

/**
 * YENİ GÖREV: Ön Yazı Taslağı Oluşturma.
 * Yapay zekaya, bitmiş CV verisine dayanarak, birinci ağızdan ve belirtilen dilde bir
 * ön yazı giriş paragrafı yazmasını söyler.
 */
const getCoverLetterPrompt = (cvData, appLanguage) => `
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

// --- ASENKRON FONKSİYONLAR (API ÇAĞRILARI) ---

async function extractRawCvData(cvText, template) {
  logStep("Yapay Zeka ile Ham Veri Çıkarılıyor.");
  const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: getExtractionPrompt(cvText, template) }], response_format: { type: "json_object" }, });
  logStep("Ham Veri Başarıyla Çıkarıldı.");
  return JSON.parse(response.choices[0].message.content);
}

async function generateAiQuestions(cvData, appLanguage) {
  logStep("AI için Stratejik Sorular Üretiliyor.");
  const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: getAiQuestionsPrompt(cvData, appLanguage) }], response_format: { type: "json_object" }, });
  logStep("AI Soruları Üretildi.");
  return JSON.parse(response.choices[0].message.content);
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

// Bu fonksiyonları dışa aktarıyoruz ki diğer dosyalar kullanabilsin.
module.exports = {
  extractRawCvData,
  generateAiQuestions,
  finalizeCvData,
  generateCoverLetterText // Yeni fonksiyonu da dışa aktarıyoruz
};