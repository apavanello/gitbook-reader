# Estágio 1: build estático
# base absoluta (/): o nginx serve o index em qualquer path (try_files),
# e os assets precisam resolver a partir da raiz, não do path atual.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --base=/

# Estágio 2: servir com nginx (fallback SPA para URLs "bonitas")
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
