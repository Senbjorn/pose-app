FROM node:16.5-alpine3.11

WORKDIR /usr/src/app

COPY package.json ./
RUN yarn install
COPY . .
CMD ["yarn", "start"]
