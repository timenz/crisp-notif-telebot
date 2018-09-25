FROM node:8

RUN mkdir -p /home/app
WORKDIR /home/app

COPY package.json /home/app
RUN cd /home/app
RUN npm install

COPY . /home/app
# RUN npm run dev
CMD ["npm", "start"]
