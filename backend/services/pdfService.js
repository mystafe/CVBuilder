// backend/services/pdfService.js
const { logStep } = require('../utils/logger');

// --- "ÇİFT MODLU" PUPPETEER YAPILANDIRMASI ---

// Kodun nerede çalıştığını tespit et. Render'da NODE_ENV='production' olarak ayarlanır.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Ortama göre doğru puppeteer paketlerini yükle
const puppeteer = IS_PRODUCTION ? require('puppeteer-core') : require('puppeteer');
const chromium = IS_PRODUCTION ? require('chrome-aws-lambda') : null;


/**
 * Verilen CV JSON verisini, şık bir HTML şablonuna dönüştürür.
 * Bu şablon, PDF'e dönüştürülmek için tasarlanmıştır.
 * @param {object} data - CV verilerini içeren JSON nesnesi.
 * @returns {string} - PDF'e dönüştürülmeye hazır HTML string'i.
 */
// generateCvHtml fonksiyonu aynı kalıyor...
const generateCvHtml = (data) => {
    // ... (tam HTML şablonunuz burada)
};

/**
 * Verilen CV verisinden bir PDF Buffer oluşturur.
 * Çalıştığı ortama (yerel/canlı sunucu) göre doğru puppeteer yapılandırmasını seçer.
 * @param {object} data - CV verilerini içeren JSON nesnesi.
 * @returns {Promise<Buffer>} - Oluşturulan PDF dosyasının Buffer'ı.
 */
async function createPdf(data) {
    let browser = null;
    logStep("PDF oluşturma süreci başladı.");
    try {
        let launchOptions;
        if (IS_PRODUCTION) {
            logStep("Canlı sunucu modu: chrome-aws-lambda kullanılıyor.");
            launchOptions = {
                args: chromium.args,
                executablePath: await chromium.executablePath,
                headless: chromium.headless,
            };
        } else {
            logStep("Yerel geliştirme modu: Tam puppeteer paketi kullanılıyor.");
            launchOptions = { headless: 'new' };
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        await page.setContent(generateCvHtml(data), { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            }
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

module.exports = {
    createPdf
};