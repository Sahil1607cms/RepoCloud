FROM ubuntu:focal

RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs
RUN apt-get install git -y

WORKDIR /home/app

COPY package*.json .

RUN npm install

COPY main.sh main.sh
COPY script.js script.js


RUN chmod +x main.sh
RUN chmod +x script.js

ENTRYPOINT [ "/home/app/main.sh" ]