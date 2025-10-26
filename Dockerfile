FROM node:24-alpine3.21

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --fetch-timeout=600000 --network-timeout=600000

COPY . .

RUN npx prisma generate

EXPOSE 3443

CMD ["node", "index.js"]