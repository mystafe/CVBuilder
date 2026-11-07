# CVBuilder backend — Coolify (VDS) image. Render'dan taşındı (Kas 2026).
FROM node:20-bookworm-slim

# @sparticuz/chromium (NODE_ENV=production) için gereken sistem kütüphaneleri + fontlar
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates fonts-dejavu-core fonts-liberation \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libasound2 libpango-1.0-0 libcairo2 libx11-xcb1 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PORT=4000

WORKDIR /app
COPY package.json .npmrc ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.js"]
