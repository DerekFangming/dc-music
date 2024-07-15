FROM node:22-alpine3.19 AS builder

RUN apk add --no-cache python3 py3-pip

WORKDIR /app
COPY . .

RUN npm i -g @vercel/ncc
RUN npm i -g @angular/cli@latest

RUN npm run build
RUN ncc build index.js -o dist


FROM node:22-alpine3.19

WORKDIR /app
COPY --from=builder /app/dist .

RUN npm i ffmpeg-static

CMD ["node", "."]
