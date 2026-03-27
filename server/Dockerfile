FROM node:22-alpine AS builder

WORKDIR /app
COPY shared/package.json shared/
COPY server/package.json server/
COPY package.json package-lock.json tsconfig.base.json ./
RUN npm ci --workspace=shared --workspace=server

COPY shared/ shared/
RUN npm run build -w shared

COPY server/ server/
RUN npm run build -w server

FROM node:22-alpine

WORKDIR /app
COPY shared/package.json shared/
COPY server/package.json server/
COPY package.json package-lock.json ./
RUN npm ci --workspace=shared --workspace=server --omit=dev

COPY --from=builder /app/shared/dist/ shared/dist/
COPY --from=builder /app/server/dist/ server/dist/
COPY server/src/db/migrations/ server/src/db/migrations/

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
