FROM node:18.16.0-slim as builder
WORKDIR /isss-backend
#COPY --from=mwader/static-ffmpeg:5.1.2 /ffmpeg /usr/local/bin/
#COPY --from=mwader/static-ffmpeg:5.1.2 /ffprobe /usr/local/bin/
#RUN -i --rm -u $UID:$GROUPS -v "$PWD:$PWD" -w "$PWD" mwader/static-ffmpeg:5.1.2 -i file.wav file.mp3
#RUN -i --rm -u $UID:$GROUPS -v "$PWD:$PWD" -w "$PWD" --entrypoint=/ffprobe mwader/static-ffmpeg:5.1.2 -i file.wavCOPY package.json .

# Install curl using apt-get
RUN apt-get update && apt-get install -y curl docker.io

COPY package.json .
COPY package-lock.json* .
RUN npm install
RUN npm install -g typescript ts-node 

#COPY logs ./logs ./
#COPY security ./security ./
# COPY assets ./assets ./
COPY tsconfig.json ./
COPY . .
# RUN npm run build

EXPOSE 3000

CMD [ "ts-node" , "./src/server.ts" ]
