FROM node:alpine as builder
WORKDIR /isss-backend
COPY package.json .
COPY package-lock.json* .
RUN npm install
RUN npm install -g typescript ts-node 


FROM builder
WORKDIR /isss-backend
#COPY logs ./logs ./
#COPY security ./security ./
# COPY assets ./assets ./
COPY --from=builder /isss-backend /isss-backend
COPY tsconfig.json ./
COPY src ./src 
# RUN npm run build

EXPOSE 3000

CMD [ "ts-node" , "./src/server.ts" ]   