FROM node:22-alpine3.19 AS builder

WORKDIR /app
COPY . .

RUN npm i -g @angular/cli@latest

RUN npm run build

RUN apk add --no-cache ffmpeg

CMD ["node", "."]
