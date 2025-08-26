FROM node

WORKDIR /web

COPY package.json ./

RUN apt-get update && apt-get upgrade -y
RUN curl -LO https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt-get install -y ./google-chrome-stable_current_amd64.deb
RUN rm google-chrome-stable_current_amd64.deb 

RUN npm install

COPY . /web
EXPOSE 3001

CMD ["npm", "run", "prod"]