#!/bin/bash

################################################################################
# Nginx Setup Script für Rico-Cuba
# Verwendung: sudo ./setup-nginx.sh
################################################################################

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║         Rico-Cuba - Nginx Setup                      ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Root-Check
if [[ $EUID -ne 0 ]]; then
   log_error "Dieses Script muss als root ausgeführt werden!"
   exit 1
fi

################################################################################
# Nginx installieren
################################################################################
log_info "Installiere Nginx..."

if ! command -v nginx &> /dev/null; then
    apt update -qq
    apt install -y -qq nginx
    systemctl enable nginx
    log_success "Nginx installiert"
else
    log_info "Nginx bereits installiert"
fi

################################################################################
# Nginx-Konfiguration erstellen
################################################################################
log_info "Erstelle Nginx-Konfiguration..."

SERVER_IP="217.154.105.67"

cat > /etc/nginx/sites-available/rico-cuba << 'EOF'
server {
    listen 80;
    server_name 217.154.105.67;

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

log_success "Nginx-Konfiguration erstellt"

################################################################################
# Konfiguration aktivieren
################################################################################
log_info "Aktiviere Konfiguration..."

# Symlink erstellen
ln -sf /etc/nginx/sites-available/rico-cuba /etc/nginx/sites-enabled/

# Default-Site deaktivieren
rm -f /etc/nginx/sites-enabled/default

log_success "Konfiguration aktiviert"

################################################################################
# Nginx testen und neu starten
################################################################################
log_info "Teste Nginx-Konfiguration..."

if nginx -t 2>&1 | grep -q "successful"; then
    log_success "Nginx-Konfiguration ist gültig"
    
    log_info "Starte Nginx neu..."
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx läuft!"
    else
        log_error "Nginx konnte nicht gestartet werden!"
        systemctl status nginx
        exit 1
    fi
else
    log_error "Nginx-Konfiguration fehlerhaft!"
    nginx -t
    exit 1
fi

################################################################################
# Firewall-Check
################################################################################
log_info "Prüfe Firewall..."

if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        # Stelle sicher dass Port 80 offen ist
        ufw allow 80/tcp > /dev/null 2>&1 || true
        log_success "Firewall: Port 80 ist offen"
    fi
fi

################################################################################
# Abschluss
################################################################################
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║           Nginx Setup erfolgreich!                    ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Zusammenfassung:"
echo ""
echo "🌐 Deine App ist jetzt erreichbar unter:"
echo "   http://217.154.105.67"
echo ""
echo "📊 Nützliche Befehle:"
echo "   systemctl status nginx        - Nginx Status"
echo "   systemctl restart nginx       - Nginx neustarten"
echo "   nginx -t                      - Konfiguration testen"
echo "   tail -f /var/log/nginx/error.log  - Error Logs"
echo ""
echo "🔍 Prüfe ob die App läuft:"
echo "   sudo -u ricoapp pm2 status"
echo "   sudo -u ricoapp pm2 logs rico-cuba"
echo ""

log_success "Setup abgeschlossen! 🚀"
echo ""
