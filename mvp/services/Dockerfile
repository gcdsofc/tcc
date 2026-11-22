FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY services ./services
COPY web/package.json ./web/package.json
RUN npm install --omit=dev
CMD ["node", "services/identity/index.js"]
