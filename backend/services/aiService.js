// backend/services/aiService.js
const OpenAI = require('openai');
const { logStep } = require('../utils/logger');

// OpenAI istemcisini yapılandır
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// --- GÜÇLENDİRİLMİŞ VE DİL KİLİTLİ AI PROMPTS ---

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
  You are a senior career coach. Your task is to analyze the provided CV JSON data and generate improvement questions.

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
 * hatasız bir nihai CV JSON'u oluşturmasını söyler. DİL KURALI ÇOK KESİNDİR.
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

// --- ASENKRON FONKSİYONLAR (API ÇAĞRILARI) ---

async function extractRawCvData(cvText, template) {
  logStep("Yapay Zeka ile Ham Veri Çıkarılıyor.");
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: getExtractionPrompt(cvText, template) }],
    response_format: { type: "json_object" },
  });
  logStep("Ham Veri Başarıyla Çıkarıldı.");
  return JSON.parse(response.choices[0].message.content);
}

async function generateAiQuestions(cvData, appLanguage) {
  logStep("AI için Stratejik Sorular Üretiliyor.");
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: getAiQuestionsPrompt(cvData, appLanguage) }],
    response_format: { type: "json_object" },
  });
  logStep("AI Soruları Üretildi.");
  return JSON.parse(response.choices[0].message.content);
}

async function finalizeCvData(cvData, targetLanguage) {
  logStep("Final CV Metni Yapay Zeka ile Mükemmelleştiriliyor.");
  const finalizeResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo', // En akıllı model, final ürün için kullanılıyor
    messages: [{ role: 'user', content: getFinalizeCvPrompt(cvData, targetLanguage) }],
    response_format: { type: "json_object" },
  });
  let finalCvData = JSON.parse(finalizeResponse.choices[0].message.content);

  // AI'dan son bir analiz ve övgü metni istiyoruz.
  const analysisPrompt = `Provide a short professional analysis of this CV, highlighting its key strengths. The text MUST BE in ${targetLanguage}. CV Data (JSON): ${JSON.stringify(finalCvData)}`;
  const analysisResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: analysisPrompt }],
  });
  if (analysisResponse.choices[0].message.content) {
    finalCvData.analysis = analysisResponse.choices[0].message.content.trim();
  }
  logStep("Final CV Metni ve Analizi Hazır.");
  return finalCvData;
}

// Bu fonksiyonları dışa aktarıyoruz ki diğer dosyalar kullanabilsin.
module.exports = {
  extractRawCvData,
  generateAiQuestions,
  finalizeCvData,
};