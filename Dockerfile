FROM node:17.3

WORKDIR /usr/src/app

ARG NPM_TOKEN
COPY .npmrc .npmrc
COPY package*.json ./
COPY *.lock ./

RUN yarn install
COPY . .

CMD [ "yarn", "start" ]

