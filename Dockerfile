# ---- Etap budowania zależności ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --production

# ---- Etap produkcyjny ----
FROM node:20-alpine
WORKDIR /app
ENV NSFW_MODEL_DATA_DIR=/data/nsfw-model \
	NSFW_EXTERNAL_LOG_DIR=/data/nsfw-model/logs
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /data/nsfw-model/logs

VOLUME ["/data/nsfw-model"]

# Otwórz port backendu (domyślnie 5000)
EXPOSE 5000

# Domyślny punkt wejścia
CMD ["node", "server.js"]
