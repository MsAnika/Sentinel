# IntelX frontend -- Next.js analyst UI.
#
# Build:   docker build -f docker/frontend.Dockerfile -t intelx-frontend .
# Run:     docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://backend:8000 intelx-frontend
#
# Multi-stage build: `deps`/`build` stages carry the full toolchain and are
# discarded; only the Next.js "standalone" output (next.config.ts:
# output: "standalone") ships in the final image, so the runtime image
# does not carry devDependencies, the bun/node build cache, or source maps.

FROM oven/bun:1-slim AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The API base URL is baked in at build time for a static/standalone
# deployment; override at runtime via NEXT_PUBLIC_API_URL only works for
# values read client-side after hydration, so set it here to match the
# real deployment target before building for production.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN bun run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
