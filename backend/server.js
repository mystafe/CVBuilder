// backend/server.js
// Bu dosya, uygulamanın ana başlangıç noktasıdır ve bir "orkestra şefi" görevi görür.
// Tüm gelen API isteklerini ilgili yönlendiriciye (router) devreder.

// Gerekli ana paketleri ve modülleri içe aktar
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// --- YARDIMCI MODÜLLER ---
const { logStep } = require('./utils/logger'); // Loglama yardımcısı
const apiRoutes = require('./routes/api');    // Tüm API mantığını içeren yönlendirici

const app = express();
const port = process.env.PORT || 5001;

// --- MIDDLEWARE AYARLARI ---

// Cross-Origin Resource Sharing (CORS) middleware'i, frontend'in (farklı bir adreste çalışan)
// backend'e güvenli bir şekilde istek atabilmesini sağlar.
app.use(cors({ origin: '*' }));

// Gelen isteklerin body'sindeki JSON verilerini otomatik olarak ayrıştırmak (parse) için
app.use(express.json());


// --- YÖNLENDİRİCİ (ROUTER) KULLANIMI ---

// Projedeki tüm API isteklerini (/api ile başlayanları) ./routes/api.js dosyasının yönetmesine izin ver.
// Bu, server.js dosyasını temiz ve düzenli tutar.
app.use('/api', apiRoutes);


// --- SUNUCUYU BAŞLAT ---

app.listen(port, () => {
  // Sunucunun yerelde mi yoksa canlıda (Render gibi bir platformda) mı çalıştığını tespit et.
  // Bu bilgi, özellikle puppeteer'ın hangi sürümünün kullanılacağını belirlemek için kritiktir.
  const mode = process.env.NODE_ENV === 'production' ? 'CANLI MODDA' : 'YEREL MODDA';

  logStep(`Sunucu ${mode} http://localhost:${port} adresinde çalışıyor`);
  logStep(`API endpoint'leri http://localhost:${port}/api altında bulunmaktadır`);
});