// backend/services/fileService.js
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const { logStep } = require('../utils/logger');

// Projenin ana kök dizinine göre `/data` klasörünün yolunu güvenilir bir şekilde belirle
const dataDir = path.join(__dirname, '..', '..', 'data');

// Eğer `/data` klasörü yoksa, oluştur
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Multer middleware'ini yapılandır ve dışa aktar.
// Dosyayı sunucunun belleğinde geçici olarak tutarız, diske yazma işlemi manuel yapılır.
const upload = multer({ storage: multer.memoryStorage() });

function ensureSessionDir(sessionId) {
  const sessionPath = path.join(dataDir, sessionId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  return sessionPath;
}

function createSession() {
  const sessionId = Date.now().toString();
  ensureSessionDir(sessionId);
  return sessionId;
}

/**
 * Bellekte tutulan bir dosyayı verilen oturum klasörüne kaydeder.
 * Oturum belirtilmezse yeni bir oturum oluşturulur.
 * @param {object} file - Multer tarafından işlenmiş dosya nesnesi.
 * @param {string} [sessionId]
 * @returns {Promise<{filePath:string, sessionId:string}>}
 */
async function saveFile(file, sessionId) {
  const id = sessionId || createSession();
  const sessionPath = ensureSessionDir(id);
  const filePath = path.join(sessionPath, file.originalname);
  await fs.promises.writeFile(filePath, file.buffer);
  logStep(`Dosya şuraya kaydedildi: ${filePath}`);
  return { filePath, sessionId: id };
}

async function saveBuffer(sessionId, fileName, buffer) {
  const sessionPath = ensureSessionDir(sessionId);
  const filePath = path.join(sessionPath, fileName);
  await fs.promises.writeFile(filePath, buffer);
  logStep(`Dosya şuraya kaydedildi: ${filePath}`);
  return filePath;
}

/**
 * Bir dosya buffer'ından metin içeriğini çıkarır.
 * PDF ve .docx formatlarını destekler.
 * @param {object} file - Multer tarafından işlenmiş dosya nesnesi.
 * @returns {Promise<string>} - Dosyanın text içeriği.
 */
async function getTextFromFile(file) {
  logStep(`'${file.originalname}' dosyasından metin çıkarılıyor.`);

  if (file.mimetype === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  // Eğer desteklenmeyen bir dosya türü gelirse hata fırlat
  throw new Error('Unsupported file type. Please upload a PDF or .docx file.');
}

/**
 * İlk veri çıkarma işlemi için AI'ye rehberlik edecek olan CV şablonunu okur.
 * @returns {object} - JSON formatındaki CV şablonu.
 */
function getTemplate() {
  const templatePath = path.join(__dirname, '..', '..', 'sample_cv_template.json');
  return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
}

function saveFeedback(text) {
  const feedbackDir = path.join(dataDir, 'feedbacks');
  if (!fs.existsSync(feedbackDir)) {
    fs.mkdirSync(feedbackDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(feedbackDir, `Feedback_${timestamp}.txt`);
  fs.writeFileSync(filePath, text);
  logStep(`Feedback kaydedildi: ${filePath}`);
  return filePath;
}

// Bu fonksiyonları dışa aktarıyoruz ki api.js tarafından kullanılabilsin.
module.exports = {
  upload,
  saveFile,
  saveBuffer,
  createSession,
  getTextFromFile,
  getTemplate,
  saveFeedback
};
