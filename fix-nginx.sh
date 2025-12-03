#!/bin/bash

################################################################################
# Nginx Fix Script für Rico-Cuba
# Behebt Proxy-Buffer Probleme
# Verwendung: sudo ./fix-nginx.sh
################################################################################

set -e

echo "🔧 Aktualisiere Nginx-Konfiguration..."

# Backup erstellen
cp /etc/nginx/sites-available/rico-cuba /etc/nginx/sites-available/rico-cuba.backup.$(date +%Y%m%d-%H%M%S)

cat > /etc/nginx/sites-available/rico-cuba << 'EOF'
# Rico-Cuba Nginx Configuration
# Domain: rico-cuba.com / www.rico-cuba.com

server {
    listen 80;
    listen [::]:80;
    server_name rico-cuba.com www.rico-cuba.com 217.154.105.67;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name rico-cuba.com www.rico-cuba.com 217.154.105.67;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/rico-cuba.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rico-cuba.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Erhöhe die Limits für File Uploads
    client_max_body_size 100M;
    client_body_timeout 300s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts für lange Requests (AI-Moderation)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # Buffer Fix für große Responses
        proxy_buffering off;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Upload-Verzeichnis für Bilder
    location /uploads/ {
        alias /var/www/CubaCuba/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Cache für statische Assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

echo "✅ Nginx-Konfiguration aktualisiert"

echo "🔍 Teste Nginx-Konfiguration..."
nginx -t

echo "🔄 Starte Nginx neu..."
systemctl restart nginx

echo ""
echo "✅ Fertig! Nginx wurde aktualisiert."
echo ""
