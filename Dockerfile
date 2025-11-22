FROM node:trixie

WORKDIR /app

COPY package*.json ./

COPY ./client/package*.json ./client/
COPY ./server/package*.json ./server/

RUN npm install

RUN npm install --prefix ./client
RUN npm install --prefix ./server

COPY ./client ./client
COPY ./server ./server

EXPOSE 3000   
EXPOSE 5173   

CMD ["npm", "start"]
