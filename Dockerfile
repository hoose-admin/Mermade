# agenticDiagram — build the static site, then serve it with nginx.
# Deploy to GCP Cloud Run:
#   gcloud run deploy agentic-diagram --source . --region <region> --allow-unauthenticated
# (Cloud Run routes traffic to $PORT, default 8080 — nginx listens there.)

# --- Build ---
FROM node:24.16.0-alpine3.22 AS builder

# Native deps (deasync/esbuild) need a build toolchain.
RUN apk add --no-cache build-base git python3
RUN corepack enable pnpm

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# --- Serve ---
FROM nginx:1.28-alpine3.21 AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/docs /usr/share/nginx/html
EXPOSE 8080
