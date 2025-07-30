// --- NİHAİ, AKILLI ve "MONTAGE HATTI" MİMARİSİNE SAHİP server.js ---
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const puppeteer = require('puppeteer');

const app = express();
const port = 5001;
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- YENİ MİMARİ İÇİN AI PROMPTS ---

// GÖREV 1: Hızlı ve Ham Veri Çıkarma. Sadece var olan veriyi, olduğu gibi JSON'a dönüştürür.
const getInitialAnalysisPrompt = (cvText) => `
  You are an expert data extraction bot. Your ONLY task is to parse the following raw text into a structured JSON object. Extract all sections you can find, including personalInfo, summary, experience, education, skills, projects, languages, and certificates.
  CRITICAL: Do NOT change, rewrite, or enhance any of the text. Extract the data exactly as it appears in the source text.
  The output MUST be only the valid JSON object.

  Raw Text:
  ---
  ${cvText}
  ---
`;

// GÖREV 2: Hafızalı, Stratejik Soru & Geliştirme.
const getNextStepPrompt = (conversationHistory, cvData, appLanguage) => `
  You are an expert CV writing assistant with a perfect memory, continuing a conversation.

  **MISSION:**
  1.  **Integrate User's Answer:** Analyze the user's LAST answer from the conversation history. Generate a precise 'updateInstruction' to integrate this new information into the CV data. This instruction MUST create new sections if they don't exist (e.g., if 'languages' section is missing, your instruction must create it as an array). The value can be a string, object, or an array of objects.
  2.  **Polish a Section:** Review the entire CV data. Find ONE section that has not been polished yet (e.g., a raw job description, or the summary). Generate a second 'updateInstruction' to rewrite and enhance ONLY that specific section professionally. All text in this instruction MUST be in ${appLanguage}.
  3.  **Ask Strategically:**
      *   Review the FULL conversation history. **NEVER ask a question about a topic that has already been covered.**
      *   Identify the next most critical topic that is missing or weak in the CV.
      *   Formulate ONE new, generic question about that new topic.
  4.  **LANGUAGE RULE:** The 'nextQuestion' text **MUST BE in ${appLanguage}**.

  **OUTPUT FORMAT (MUST BE a single JSON object):**
  {
    "updateInstructions": [
      { "path": "path.from.user.answer", "value": "value from user answer" },
      { "path": "path.of.polished.section", "value": "the enhanced text in ${appLanguage}" }
    ],
    "nextQuestion": "Your next unique, strategic question in ${appLanguage}, or null."
  }
  
  Current CV Data: ${JSON.stringify(cvData)}
  Conversation History: ${conversationHistory}
`;


// --- DİNAMİK PDF HTML Şablonu ---
const generateCvHtml = (data) => {
  return `
    <html>
    <head>
        <meta charset="UTF-8">
        <style> @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'); body { font-family: 'Roboto', 'Helvetica Neue', sans-serif; margin: 0; background-color: #fff; font-size: 10.5pt; line-height: 1.4; color: #333; } .page { max-width: 8.5in; min-height: 11in; padding: 0.8in; margin: auto; box-sizing: border-box; } .header { text-align: left; margin-bottom: 0.4in; } .header .name { font-size: 32pt; font-weight: 700; margin: 0 0 5px 0; } .header .contact-info { font-size: 10pt; color: #555; } .section-title { font-size: 14pt; font-weight: 700; color: #000; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 0.3in; margin-bottom: 0.2in; } .item-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.15in; } .item-content { flex-basis: 100%; } .item-content h3 { font-size: 11pt; font-weight: 700; margin: 0; } .item-content .sub-header { font-size: 10.5pt; font-weight: 500; margin: 2px 0 5px 0; } .item-content ul { padding-left: 18px; margin: 5px 0 0 0; list-style-type: disc; } .item-content ul li { margin-bottom: 5px; } .item-date { text-align: right; white-space: nowrap; font-weight: 500; color: #333; padding-left: 20px; } .skills-container { columns: 2; column-gap: 40px; } .skills-category { break-inside: avoid-column; margin-bottom: 15px; } .skills-category h4 { margin: 0 0 5px 0; font-weight: 700; } .skills-category ul { list-style-type: none; padding-left: 0; margin: 0; } .languages p, .certificates p, .projects p { margin: 4px 0; } </style>
    </head>
    <body>
    <div class="page">
        ${data.personalInfo ? `<div class="header"><h1 class="name">${data.personalInfo.name}</h1><p class="contact-info">${data.personalInfo.email} | ${data.personalInfo.phone} | ${data.personalInfo.location}</p></div>` : ''}
        ${data.summary ? `<div class="section"><h2 class="section-title">Summary</h2><p>${data.summary}</p></div>` : ''}
        ${data.experience && data.experience.length > 0 ? `<div class="section"><h2 class="section-title">Experience</h2>${data.experience.map(exp => `<div class="item-container"><div class="item-content"><h3>${exp.title}</h3><div class="sub-header">${exp.company} | ${exp.location}</div><ul>${(exp.description || '').split('\\n').map(d => `<li>${d.replace(/^- /, '')}</li>`).join('')}</ul></div><div class="item-date">${exp.date}</div></div>`).join('')}</div>` : ''}
        ${data.education && data.education.length > 0 ? `<div class="section"><h2 class="section-title">Education</h2>${data.education.map(edu => `<div class="item-container"><div class="item-content"><h3>${edu.degree}</h3><p>${edu.institution}</p></div><div class="item-date">${edu.date || ''}</div></div>`).join('')}</div>` : ''}
        ${data.skillsByCategory && data.skillsByCategory.length > 0 ? `<div class="section"><h2 class="section-title">Skills</h2><div class="skills-container">${data.skillsByCategory.map(cat => `<div class="skills-category"><h4>${cat.category}</h4><ul>${cat.skills.map(s => `<li>${s}</li>`).join('')}</ul></div>`).join('')}</div></div>` : ''}
        ${data.projects && data.projects.length > 0 ? `<div class="section"><h2 class="section-title">Projects</h2>${data.projects.map(proj => `<div><h3>${proj.name}</h3><p>${proj.description}</p></div>`).join('')}</div>` : ''}
        ${data.languages && data.languages.length > 0 ? `<div class="section"><h2 class="section-title">Languages</h2>${data.languages.map(lang => `<p>${lang.language} (${lang.proficiency})</p>`).join('')}</div>` : ''}
        ${data.certificates && data.certificates.length > 0 ? `<div class="section"><h2 class="section-title">Certificates</h2>${data.certificates.map(cert => `<p>${cert}</p>`).join('')}</div>` : ''}
    </div>
    </body>
    </html>`;
};


// --- API Endpoints ---

// HIZLANDIRILMIŞ İLK ANALİZ
app.post('/api/initial-parse', upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Dosya bulunamadı." });
  try {
    let text;
    if (req.file.mimetype === 'application/pdf') { text = (await pdfParse(req.file.buffer)).text; }
    else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { text = (await mammoth.extractRawText({ buffer: req.file.buffer })).value; }
    else { return res.status(400).send({ message: 'Desteklenmeyen dosya türü.' }); }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [{ role: 'user', content: getInitialAnalysisPrompt(text) }],
      response_format: { type: "json_object" },
    });
    res.status(200).json({ parsedData: JSON.parse(response.choices[0].message.content) });
  } catch (error) { console.error("İlk analiz hatası:", error); res.status(500).send({ message: 'CV analizi sırasında sunucuda bir hata oluştu.' }); }
});


// YENİDEN İSİMLENDİRİLMİŞ ve AKILLI SOHBET ADIMI
app.post('/api/next-step', async (req, res) => {
  try {
    const { conversationHistory, cvData, appLanguage } = req.body;
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // Bu karmaşık görev için GPT-4 Turbo şiddetle tavsiye edilir
      messages: [{ role: 'user', content: getNextStepPrompt(JSON.stringify(conversationHistory), cvData, appLanguage) }],
      response_format: { type: "json_object" },
    });
    res.json(JSON.parse(response.choices[0].message.content));
  } catch (error) { console.error("Sohbet adımı hatası:", error); res.status(500).send({ message: 'Sıradaki adım üretilemedi.' }); }
});

// PDF ÜRETİMİ (DEĞİŞİKLİK YOK)
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const cvData = req.body.cvData;
    const htmlContent = generateCvHtml(cvData);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Gelistirilmis_CV.pdf');
    res.send(pdfBuffer);
  } catch (error) { console.error("PDF üretimi hatası:", error); res.status(500).send({ message: 'PDF üretilemedi.' }); }
});


app.listen(port, () => {
  console.log(`[BİLGİ] CVBUILDER Tam Sürüm Sunucu http://localhost:${port} adresinde çalışıyor`);
});