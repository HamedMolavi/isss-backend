FROM node:alpine

WORKDIR /isss-backend

#COPY logs ./logs ./
#COPY security ./security ./
COPY assets ./assets ./
COPY tsconfig.json ./
COPY package.json ./
COPY src ./src 

RUN npm install
# RUN npm run build
RUN npm i -g typescript ts-node 

EXPOSE 3000

CMD [ "ts-node" , "./src/server.ts" ]