FROM node:20-alpine

WORKDIR /app

COPY user-service/package*.json ./user-service/
RUN cd user-service && npm install --production

COPY shared/package*.json ./shared/
RUN cd shared && npm install --production

COPY shared ./shared
COPY user-service ./user-service

EXPOSE 3001

CMD ["node", "user-service/src/index.js"]
