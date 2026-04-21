#!/bin/sh
set -e

# Get API URL from environment
API_URL="${VITE_API_URL:-https://duell-um-geld-production.up.railway.app}"

# Ensure API_URL ends with /
API_URL="${API_URL%/}/"

echo "API_URL: $API_URL"

# Use sed for replacement (more standard in Alpine Linux)
sed -i "s|__API_URL__|$API_URL|g" /etc/nginx/conf.d/default.conf

# Verify replacement
echo "Nginx config after replacement:"
grep "proxy_pass" /etc/nginx/conf.d/default.conf || echo "Warning: No proxy_pass found"

# Check if replacement was successful
if grep -q "__API_URL__" /etc/nginx/conf.d/default.conf; then
    echo "Error: API_URL placeholder was not replaced!"
    exit 1
fi

# Test nginx configuration
nginx -t

# Start nginx
exec nginx -g 'daemon off;'