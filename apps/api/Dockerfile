FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @creatorlend/api build

FROM node:20-slim
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ packages/
COPY --from=builder /app/apps/api/ apps/api/
COPY --from=builder /app/node_modules/ node_modules/
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
