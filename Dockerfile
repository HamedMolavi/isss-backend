FROM node:alpine as builder
WORKDIR /isss-backend
COPY --from=mwader/static-ffmpeg:5.1.2 /ffmpeg /usr/local/bin/
COPY --from=mwader/static-ffmpeg:5.1.2 /ffprobe /usr/local/bin/
#RUN -i --rm -u $UID:$GROUPS -v "$PWD:$PWD" -w "$PWD" mwader/static-ffmpeg:5.1.2 -i file.wav file.mp3
#RUN -i --rm -u $UID:$GROUPS -v "$PWD:$PWD" -w "$PWD" --entrypoint=/ffprobe mwader/static-ffmpeg:5.1.2 -i file.wavCOPY package.json .
COPY package.json .
COPY package-lock.json* .
RUN npm install
RUN npm install -g typescript ts-node 
# RUN echo http://repository.fit.cvut.cz/mirrors/alpine/v3.8/main > /etc/apk/repositories; \
#     echo http://repository.fit.cvut.cz/mirrors/alpine/v3.8/community >> /etc/apk/repositories
# RUN echo -e "http://nl.alpinelinux.org/alpine/v3.16/main\nhttp://nl.alpinelinux.org/alpine/v3.16/community" > /etc/apk/repositories
# RUN apk update
# RUN apk add
# RUN apk add ffmpeg

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