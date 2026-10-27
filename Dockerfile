# Imagen de la API. Se construye en dos etapas para que la imagen final sea liviana.

# ---------- Etapa 1: compilar la aplicación ----------
# Imagen de Node.js 22 (versión pequeña "alpine")
FROM node:22-alpine AS build
# Carpeta de trabajo dentro del contenedor
WORKDIR /app
# Copiamos primero solo los package*.json: así Docker reutiliza la caché
# y no reinstala todo si solo cambió el código
COPY package*.json ./
# Instala las dependencias exactas del package-lock.json
RUN npm ci
# Copiamos el resto del código y compilamos TypeScript a JavaScript (carpeta dist)
COPY . .
RUN npm run build

# ---------- Etapa 2: imagen final ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Solo las dependencias necesarias para ejecutar (sin las de desarrollo)
RUN npm ci --omit=dev
# Traemos únicamente el código ya compilado de la etapa 1
COPY --from=build /app/dist ./dist
# El puerto que usa la API (documentación; el mapeo real está en docker-compose)
EXPOSE 3000
# Ejecutamos con un usuario sin privilegios en vez de root
USER node
CMD ["node", "dist/main"]
