FROM node:22-alpine
WORKDIR /app
# --poll : détecte les changements de fichiers via les volumes Docker (Windows/Mac)
CMD ["sh", "-c", "npm ci && npm start -- --host 0.0.0.0 --poll 2000 --proxy-config proxy.conf.json"]