FROM node:18 AS build
WORKDIR /dist/src/app
RUN npm cache clean --force
COPY . .
RUN npm install
RUN npm run build

FROM nginx:latest AS ngi
# Copying compiled code and nginx config to different folder
# NOTE: This path may change according to your project's output folder
COPY --from=build /dist/src/app/dist/entertainment_frontend /usr/share/nginx/html
COPY /nginx.conf  /etc/nginx/conf.d/default.conf
# Exposing a port, here it means that inside the container
# the app will be using Port 80 while running
EXPOSE 80

# docker build -t entertainment_frontend .

# docker run --rm -d -p 80:80/tcp entertainment_frontend:latest
# -p: Port
# Here you'll need to define a port on which the container will be hosted and the port on which app is hosted inside the container
# Syntex: <host-port>:<docker-port>
# -d: Detach
# If this is not specified, the docker will keep the console running

# NOTE: We had exposed port 80 in Dockerfile and assigned nginx to listen to port 80, so <docker-port> has to be the same here as well
