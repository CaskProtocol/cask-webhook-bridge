FROM node:17.3

WORKDIR /usr/src/app

COPY package*.json ./
COPY *.lock ./

RUN yarn install
COPY . .

CMD [ "yarn", "start" ]

