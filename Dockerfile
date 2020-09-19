FROM node:12.18.2-alpine as builder

RUN apk add git python make g++

WORKDIR /usr/src

COPY ["package.json", "package-lock.json", "/usr/src/"]

RUN npm install --only=production --loglevel=warn --progress=false --porcelain

# From least to most likely to change to use cache
COPY ["config", "/usr/src/config/"]
COPY ["*.*", "/usr/src/"]
COPY ["src", "/usr/src/src/"]
COPY ["static", "/usr/src/static/"]

RUN npm install --loglevel=warn --progress=false --porcelain

RUN npm run build

FROM node:12.18.2-alpine

RUN apk add git python make g++

WORKDIR /usr/src

COPY ["package.json", "package-lock.json", "/usr/src/"]

RUN npm install --only=production --loglevel=warn --progress=false --porcelain

COPY --from=builder ["/usr/src/config", "/usr/src/config/"]
COPY --from=builder ["/usr/src/dist", "/usr/src/dist"]
COPY --from=builder ["/usr/src/static", "/usr/src/static"]

EXPOSE 3000

CMD ["node", "dist/index.js"]
