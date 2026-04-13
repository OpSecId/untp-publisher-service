# Build SPA (Vite inlines VITE_* at build time — pass as --build-arg).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js ./
COPY public ./public
COPY src ./src

ARG VITE_API_BASE_URL=
ARG VITE_TRACTION_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_TRACTION_URL=${VITE_TRACTION_URL}

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
