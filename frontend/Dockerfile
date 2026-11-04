FROM node:22-bookworm-slim AS build
WORKDIR /source
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /source/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
