# Build da interface (Vite + TypeScript) e publicação dos estáticos pelo nginx,
# que também faz proxy de /api/* para os microsserviços (ver infra/nginx/default.conf).
FROM node:22-alpine AS build
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm ci || npm install
COPY web ./
RUN npm run build

FROM nginx:1.27-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
