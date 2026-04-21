#!/bin/sh
set -e

# Get API URL from environment
API_URL="${VITE_API_URL:-https://duell-um-geld-production.up.railway.app}"

echo "API_URL: $API_URL"

# Use awk instead of sed for more reliable replacement
awk -v url="$API_URL" '{gsub(/__API_URL__/, url); print}' /etc/nginx/conf.d/default.conf > /tmp/nginx.conf.tmp
mv /tmp/nginx.conf.tmp /etc/nginx/conf.d/default.conf

# Verify replacement
echo "Nginx config after replacement:"
grep "proxy_pass" /etc/nginx/conf.d/default.conf || true

# Start nginx
exec nginx -g 'daemon off;'