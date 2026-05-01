# Build stage
FROM node:18-alpine AS builder

# Force rebuild - break cache by using ARG in RUN command
ARG BUILD_DATE
RUN echo "Build timestamp: ${BUILD_DATE:-$(date)}" > /dev/null

WORKDIR /app

# Install build dependencies for native modules (node-gyp)
# include python3, make and g++ so alpine builder can compile native addons
RUN apk add --no-cache python3 make g++ && \
    ln -sf /usr/bin/python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Ensure videos directory exists and copy any videos if they exist locally
RUN mkdir -p public/videos || true

# Build for production
RUN npm run build

# Ensure videos are in dist (they should be copied by Vite from public/videos)
RUN if [ -d "dist/videos" ]; then echo "Videos already in dist"; else mkdir -p dist/videos && if [ -d "public/videos" ]; then cp public/videos/* dist/videos/ || true; fi; fi

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx PID directory and logs directory
RUN mkdir -p /var/run/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chmod 666 /var/run/nginx.pid

# Expose port for Railway
EXPOSE 8080

# Start nginx - Railway compatible
CMD ["nginx", "-g", "daemon off;"]
