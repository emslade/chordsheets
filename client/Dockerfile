FROM node:22-alpine AS builder

WORKDIR /app
COPY shared/package.json shared/
COPY client/package.json client/
COPY package.json package-lock.json tsconfig.base.json ./
RUN npm ci --workspace=shared --workspace=client

COPY shared/ shared/
COPY client/angular.json client/tsconfig.json client/tsconfig.app.json client/.postcssrc.json client/
COPY client/src/ client/src/
COPY client/public/ client/public/
RUN cd client && npx ng build --configuration production

FROM nginx:alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/dist/client/browser/ /usr/share/nginx/html/

EXPOSE 80
