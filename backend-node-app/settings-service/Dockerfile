FROM node:20-alpine

WORKDIR /app

COPY settings-service/package*.json ./settings-service/
RUN cd settings-service && npm install --production

COPY shared/package*.json ./shared/
RUN cd shared && npm install --production

COPY shared ./shared
COPY settings-service ./settings-service

EXPOSE 3003

CMD ["node", "settings-service/src/index.js"]
