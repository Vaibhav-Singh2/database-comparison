FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server ./server
COPY data ./data
COPY benchmarks ./benchmarks

EXPOSE 3000

CMD ["node", "server/app.js"]
