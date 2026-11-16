# Fraud Detection Agent — container image
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Run the real-time API
CMD ["node", "--experimental-strip-types", "src/api.ts"]