FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn install && yarn cache clean
COPY . /usr/src/app
EXPOSE 3000
CMD [ "yarn", "start"]

# docker build -t entertainment_media_server .
# docker run -p 3000:3000 -d entertainment_media_server
