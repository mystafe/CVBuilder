// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// --- YARDIMCI MODÜLLER ---
const { logStep } = require('./utils/logger'); // Loglama yardımcısı
const apiRoutes = require('./routes/api');    // Tüm API mantığını içeren yönlendirici

const app = express();
const port = process.env.PORT || 5001;

// --- MIDDLEWARE AYARLARI ---
// Tüm kaynaklardan gelen isteklere izin ver
app.use(cors({ origin: '*' }));
// Gelen JSON body'lerini parse et
app.use(express.json());

// --- YÖNLENDİRİCİ (ROUTER) KULLANIMI ---
// Projedeki tüm API isteklerini (/api ile başlayanları) api.js dosyasına yönlendir.
app.use('/api', apiRoutes);

// --- SUNUCUYU BAŞLAT ---
app.listen(port, () => {
  // Sunucunun yerelde mi yoksa canlıda mı çalıştığını tespit et
  const mode = process.env.NODE_ENV === 'production' ? 'CANLI MODDA' : 'YEREL MODDA';
  logStep(`Sunucu ${mode} http://localhost:${port} adresinde çalışıyor`);
  logStep(`API endpoint'leri http://localhost:${port}/api altında bulunmaktadır`);
});