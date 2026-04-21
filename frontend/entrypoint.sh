#!/bin/sh
set -e

# Replace placeholder with actual API URL
if [ -z "$VITE_API_URL" ]; then
    VITE_API_URL="https://duell-um-geld-production.up.railway.app"
fi

sed -i "s|__API_URL__|$VITE_API_URL|g" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'