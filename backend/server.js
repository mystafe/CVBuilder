// --- NİHAİ, TAM ve "CLOUD-READY" server.js ---
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const fs = require('fs');

// --- PUPPETEER GÜNCELLEMESİ (BULUT ORTAMLARI İÇİN) ---
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core'); // 'puppeteer' yerine 'puppeteer-core' kullanılıyor

const app = express();
const port = process.env.PORT || 5001;

// --- Middleware Ayarları ---
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// --- Multer Yapılandırması ---
const upload = multer({ storage: multer.memoryStorage() });

// --- OpenAI Yapılandırması ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// --- AI PROMPTS (EN GÜNCEL HALİ) ---
const getInitialAnalysisPrompt = (cvText) => `You are a fast and efficient CV data extractor. Your ONLY task is to parse the following raw text into a structured JSON object. Extract all sections you can find. CRITICAL: Do NOT change, rewrite, or enhance any of the text. Extract the data exactly as it appears in the source text. The output MUST be only the valid JSON object. Raw Text: --- ${cvText} ---`;
const getNextStepPrompt = (conversationHistory, cvData, appLanguage) => `You are a helpful CV Improvement Coach with perfect memory. Your tasks are: 1. **REMEMBER**: Review the full conversation history. Note down every topic already discussed (e.g., 'projects', 'certificates', 'summary'). 2. **UPDATE**: Based on the user's **LAST** answer, generate a precise update instruction. * If the user adds an item to a list (e.g., a new certificate), the path should be the array name (e.g., "certificates") and the value should be the new item to be pushed. * If the user adds information for a section that doesn't exist yet (e.g., the CV has no 'languages' section), your instruction must create it. Example: { "path": "languages", "value": [{ "language": "English", "proficiency": "Advanced" }] }. 3. **ASK STRATEGICALLY**: * Examine the conversation history again. **NEVER ask a question about a topic that has already been covered.** * Identify the next most important topic that is missing or weak in the CV. * Formulate the next generic question about that new topic. * **LANGUAGE RULE:** The "nextQuestion" text **MUST BE in ${appLanguage}**. Output a single JSON object: { "updateInstruction": { "path": "path.to.update", "value": "the new data, can be a string or an object/array" }, "nextQuestion": "Your next unique and strategic question in ${appLanguage}, or null if finished." } Current CV Data: ${JSON.stringify(cvData)} Conversation History: ${conversationHistory}`;


// --- PDF HTML Şablonu (DİNAMİK) ---
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

app.post('/api/initial-parse', upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Dosya bulunamadı." });
  try {
    let text;
    if (req.file.mimetype === 'application/pdf') { text = (await pdfParse(req.file.buffer)).text; }
    else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { text = (await mammoth.extractRawText({ buffer: req.file.buffer })).value; }
    else { return res.status(400).send({ message: 'Desteklenmeyen dosya türü.' }); }

    const response = await openai.chat.completions.create({ model: 'gpt-3.5-turbo-0125', messages: [{ role: 'user', content: getInitialAnalysisPrompt(text) }], response_format: { type: "json_object" }, });
    res.status(200).json({ parsedData: JSON.parse(response.choices[0].message.content) });
  } catch (error) { console.error("İlk analiz hatası:", error); res.status(500).send({ message: 'CV analizi sırasında sunucuda bir hata oluştu.' }); }
});

app.post('/api/next-step', async (req, res) => {
  try {
    const { conversationHistory, cvData, appLanguage } = req.body;
    const response = await openai.chat.completions.create({ model: 'gpt-4-turbo', messages: [{ role: 'user', content: getNextStepPrompt(JSON.stringify(conversationHistory), cvData, appLanguage) }], response_format: { type: "json_object" }, });
    res.json(JSON.parse(response.choices[0].message.content));
  } catch (error) { console.error("Sohbet adımı hatası:", error); res.status(500).send({ message: 'Sıradaki adım üretilemedi.' }); }
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
    let cvData = req.body.cvData;
    const cvLanguage = req.body.cvLanguage || 'en';

    const summaryUpdatePrompt = `Based on the complete CV data provided below, rewrite the "summary" to be a powerful and concise professional pitch that reflects all experiences and skills. The summary **MUST BE in ${cvLanguage}**. Output only the new summary text. CV Data: ${JSON.stringify(cvData)}`;
    const summaryResponse = await openai.chat.completions.create({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: summaryUpdatePrompt }], });

    if (summaryResponse.choices[0].message.content) {
      cvData.summary = summaryResponse.choices[0].message.content.trim();
    }

    const htmlContent = generateCvHtml(cvData);

    // --- PUPPETEER GÜNCELLEMESİ (LAUNCH KISMI) ---
    let executablePath = process.env.CHROME_BIN;
    if (!executablePath) {
      try {
        executablePath = await chromium.executablePath();
      } catch (err) {
        console.error('Chromium path error:', err);
        const fallbackPaths = [
          '/usr/bin/chromium-browser',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
        ];
        executablePath = fallbackPaths.find((p) => fs.existsSync(p));
      }
    }
    if (!executablePath) {
      return res.status(500).send({ message: 'Chrome executable not found.' });
    }

    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless, // 'new' yerine chromium.headless kullanmak daha uyumludur
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Gelistirilmis_CV.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF üretimi hatası:", error);
    res.status(500).send({ message: 'PDF üretilemedi. Sunucu loglarını kontrol edin.' });
  }
});


app.listen(port, () => {
  console.log(`[BİLGİ] CVBUILDER Tam Sürüm Sunucu http://localhost:${port} adresinde çalışıyor`);
});