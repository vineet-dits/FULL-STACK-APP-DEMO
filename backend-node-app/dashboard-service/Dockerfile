FROM node:20-alpine

WORKDIR /app

COPY dashboard-service/package*.json ./dashboard-service/
RUN cd dashboard-service && npm install --production

COPY shared/package*.json ./shared/
RUN cd shared && npm install --production

COPY shared ./shared
COPY dashboard-service ./dashboard-service

EXPOSE 3002

CMD ["node", "dashboard-service/src/index.js"]
