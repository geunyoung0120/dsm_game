FROM node:20-slim AS builder

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-slim

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN rm -rf scripts node_modules/.cache

RUN mkdir -p /app/data && chown node:node /app/data

EXPOSE 3000

VOLUME /app/data

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
