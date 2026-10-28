# The web app as a container. The public socket URL is baked in at build time (Next inlines
# NEXT_PUBLIC_* into the client bundle); CORE_URL is read at runtime by the server.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_CORE_WS_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CORE_WS_URL=$NEXT_PUBLIC_CORE_WS_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080
COPY --from=build /app ./
EXPOSE 8080
CMD ["npx", "next", "start", "-p", "8080"]
