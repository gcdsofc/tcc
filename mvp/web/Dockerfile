FROM node:22-alpine AS build
WORKDIR /app
WORKDIR /app/web
COPY web/package.json ./package.json
RUN npm install
COPY web ./
RUN npm run build
FROM nginx:1.27-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
