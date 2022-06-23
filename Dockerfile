FROM node:alpine

WORKDIR /isss-backend

COPY package.json ./
COPY tsconfig.json ./
COPY logs ./logs
COPY security ./security
COPY assets ./assets
COPY src ./src

RUN ls -a
RUN npm install
RUN npm run build
RUN npm i -g typescript ts-node

EXPOSE 3000

CMD [ "ts-node" , "./src/server.ts" ]