// backend/services/pdfService.js
const { logStep } = require('../utils/logger');

// --- "ÇİFT MODLU" PUPPETEER ve YENİ CHROMIUM PAKETİ ---
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const puppeteer = IS_PRODUCTION ? require('puppeteer-core') : require('puppeteer');
// Eskimiş 'chrome-aws-lambda' yerine, aktif olarak geliştirilen ve daha güvenilir olan '@sparticuz/chromium' kullanılıyor
const chromium = IS_PRODUCTION ? require('@sparticuz/chromium') : null;


/**
 * Verilen CV JSON verisini, şık bir HTML şablonuna dönüştürür.
 * @param {object} data - CV verilerini içeren JSON nesnesi.
 * @returns {string} - PDF'e dönüştürülmeye hazır HTML string'i.
 */
const generateCvHtml = (data) => {
    const fullName = (data.personalInfo?.name || `${data.personalInfo?.firstName || ''} ${data.personalInfo?.lastName || ''}`.trim()).trim();
    // HTML şablonu, sohbet sırasında eklenen yeni bölümleri (projects, languages vb.)
    // dinamik olarak render edebilir.
    return `
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
            body { font-family: 'Roboto', 'Helvetica Neue', sans-serif; margin: 0; background-color: #fff; font-size: 10.5pt; line-height: 1.4; color: #333; }
            .page { max-width: 8.5in; min-height: 11in; padding: 0.8in; margin: auto; box-sizing: border-box; }
            .header { text-align: left; margin-bottom: 0.4in; }
            .header .name { font-size: 32pt; font-weight: 700; margin: 0 0 5px 0; color: #2c3e50; }
            .header .contact-info { font-size: 10pt; color: #555; }
            .section-title { font-size: 14pt; font-weight: 700; color: #2c3e50; border-bottom: 2px solid #2c3e50; padding-bottom: 4px; margin-top: 0.3in; margin-bottom: 0.2in; }
            .item-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.15in; }
            .item-content { flex-basis: 100%; }
            .item-content h3 { font-size: 11pt; font-weight: 700; margin: 0; }
            .item-content .sub-header { font-size: 10.5pt; font-weight: 500; color: #333; margin: 2px 0 5px 0; }
            .item-content ul { padding-left: 18px; margin: 8px 0 0 0; list-style-type: disc; }
            .item-content ul li { margin-bottom: 5px; }
            .item-date { text-align: right; white-space: nowrap; font-weight: 500; color: #333; padding-left: 20px; }
            .skills-container { columns: 2; column-gap: 40px; }
            .skills-category { break-inside: avoid-column; margin-bottom: 15px; }
            .skills-category h4 { margin: 0 0 8px 0; font-weight: 700; }
            .skills-category ul { list-style-type: none; padding-left: 0; margin: 0; }
            .languages p, .certificates p, .projects p, .analysis p { margin: 4px 0; }
            .projects h3 { margin-top: 10px; }
        </style>
    </head>
    <body>
    <div class="page">
        ${fullName ? `<div class="header"><h1 class="name">${fullName}</h1><p class="contact-info">${data.personalInfo?.email || ''} | ${data.personalInfo?.phone || ''} | ${data.personalInfo?.location || ''}</p></div>` : ''}
        ${data.summary ? `<div class="section"><h2 class="section-title">Summary</h2><p>${data.summary}</p></div>` : ''}
        ${data.experience && data.experience.length > 0 ? `<div class="section"><h2 class="section-title">Experience</h2>${data.experience.map(exp => `<div class="item-container"><div class="item-content"><h3>${exp.title}</h3><div class="sub-header">${exp.company} | ${exp.location}</div><ul>${(exp.description || '').split('\\n').filter(d => d.trim() !== '').map(d => `<li>${d.replace(/^- /, '')}</li>`).join('')}</ul></div><div class="item-date">${exp.date || ''}</div></div>`).join('')}</div>` : ''}
        ${data.education && data.education.length > 0 ? `<div class="section"><h2 class="section-title">Education</h2>${data.education.map(edu => `<div class="item-container"><div class="item-content"><h3>${edu.degree}</h3><p>${edu.institution}</p></div><div class="item-date">${edu.date || ''}</div></div>`).join('')}</div>` : ''}
        ${data.skillsByCategory && data.skillsByCategory.length > 0 ? `<div class="section"><h2 class="section-title">Skills</h2><div class="skills-container">${data.skillsByCategory.map(cat => `<div class="skills-category"><h4>${cat.category}</h4><ul>${(cat.skills || []).map(s => `<li>${s}</li>`).join('')}</ul></div>`).join('')}</div></div>` : ''}
        ${data.projects && data.projects.length > 0 ? `<div class="section projects"><h2 class="section-title">Projects</h2>${data.projects.map(proj => `<div><h3>${proj.name}</h3><p>${proj.description}</p></div>`).join('')}</div>` : ''}
        ${data.languages && data.languages.length > 0 ? `<div class="section"><h2 class="section-title">Languages</h2>${data.languages.map(lang => `<p>${lang.language} (${lang.proficiency})</p>`).join('')}</div>` : ''}
        ${data.certificates && data.certificates.length > 0 ? `<div class="section"><h2 class="section-title">Certificates</h2>${data.certificates.map(cert => `<p>${cert}</p>`).join('')}</div>` : ''}
        ${data.analysis ? `<div class="section"><h2 class="section-title">AI Analysis</h2><p>${data.analysis}</p></div>` : ''}
    </div>
    </body>
    </html>`;
};

/**
 * Verilen CV verisinden bir PDF Buffer oluşturur.
 * Bu sürüm, en güvenilir Chromium paketi olan @sparticuz/chromium'u kullanır.
 * @param {object} data - CV verilerini içeren JSON nesnesi.
 * @returns {Promise<Buffer>} - Oluşturulan PDF dosyasının Buffer'ı.
 */
async function createPdf(data) {
    let browser = null;
    logStep("PDF oluşturma süreci başladı.");
    try {
        const htmlContent = generateCvHtml(data);
        let launchOptions;

        if (IS_PRODUCTION) {
            logStep("Canlı sunucu modu: @sparticuz/chromium kullanılıyor.");
            launchOptions = {
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                // @sparticuz/chromium paketi executablePath'i bir fonksiyon olarak sağlar
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            };
        } else {
            logStep("Yerel geliştirme modu: Tam puppeteer paketi kullanılıyor.");
            launchOptions = { headless: 'new' };
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        });

        logStep("PDF buffer başarıyla oluşturuldu.");
        return pdfBuffer;

    } catch (error) {
        logStep(`PDF OLUŞTURMA HATASI: ${error.message}`);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            logStep("Tarayıcı kapatıldı.");
        }
    }
}

// Bu fonksiyonu dışa aktararak api.js'in kullanmasını sağlıyoruz
module.exports = {
    createPdf
};