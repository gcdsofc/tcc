# Build da interface (Vite + TypeScript) e publicação dos estáticos pelo nginx,
# que também faz proxy de /api/* para os microsserviços (ver infra/nginx/default.conf).
FROM node:22-alpine AS build
WORKDIR /app/web
# Sem o package-lock.json: o lock gerado no Windows omite o binário nativo do rollup
# para Linux (bug do npm nº 4828); instalar aqui resolve as dependências na plataforma do build.
COPY web/package.json ./package.json
RUN npm install --no-audit --no-fund
COPY web ./
RUN npm run build

FROM nginx:1.27-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
