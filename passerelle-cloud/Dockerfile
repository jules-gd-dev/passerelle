# Stage 1: Build Web
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Run API
FROM node:20-alpine AS api-runner
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY api/ ./
COPY --from=web-builder /app/web/dist ./public

# C2 handshake registry: persistent machineId<->secret bindings live here.
# Must be writable by the non-root 'node' user and backed by a volume in prod.
RUN mkdir -p /app/api/data && chown -R node:node /app/api/data

# M5: never run the service as root.
USER node

EXPOSE 8787
CMD ["npm", "run", "start"]
