# Uma imagem por microsserviço: docker build --build-arg APP=identity|customers|workorders
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY libs ./libs
COPY apps ./apps
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ARG APP
ENV NODE_ENV=production APP=${APP}
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["sh", "-c", "exec node dist/apps/$APP/src/main.js"]
