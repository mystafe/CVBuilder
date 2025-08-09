# API Configuration Guide

Bu guide frontend'in hangi API'ye bağlanacağını nasıl kontrol edeceğini gösterir.

## Öncelik Sırası

1. **Environment Variable: REACT_APP_API_BASE** (En yüksek öncelik)
2. **Local Development Auto-detection**
3. **Production Fallback** (En düşük öncelik)

## Kullanım Örnekleri

### 1. Environment Variable ile API Set Etme

#### Local Development için farklı port:

```bash
# Terminal'de çalıştır
export REACT_APP_API_BASE=http://localhost:5000
npm start
```

#### Farklı local IP adresi:

```bash
export REACT_APP_API_BASE=http://192.168.1.100:4000
npm start
```

#### Staging environment:

```bash
export REACT_APP_API_BASE=https://staging-api.example.com
npm start
```

### 2. .env.local Dosyası ile (Önerilen)

Frontend root directory'de `.env.local` dosyası oluştur:

```bash
# .env.local
REACT_APP_API_BASE=http://localhost:5000
```

### 3. Farklı Environment'lar için

#### Development (.env.development.local):

```bash
REACT_APP_API_BASE=http://localhost:4000
```

#### Production (.env.production.local):

```bash
REACT_APP_API_BASE=https://api.production.com
```

## Debug Bilgileri

Console'da şu bilgileri görebilirsin:

- Environment variable değeri
- Window hostname
- Final API URL

## Otomatik Tespit

Eğer environment variable set edilmemişse:

- `localhost` veya `127.0.0.1` → `http://localhost:4000`
- Diğer durumlarda → `https://cvbuilder-451v.onrender.com`

## Örnekler

```bash
# Backend port 5000'de çalışıyor
export REACT_APP_API_BASE=http://localhost:5000

# Docker container'da backend
export REACT_APP_API_URL=http://backend:4000

# Remote development server
export REACT_APP_API_BASE=https://dev-api.example.com

# Local network'te başka bir makine
export REACT_APP_API_BASE=http://192.168.1.50:4000
```
