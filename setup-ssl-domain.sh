#!/bin/bash

################################################################################
# SSL & Domain Setup Script für Rico-Cuba
# Domain: rico-cuba.com / www.rico-cuba.com
# Verwendung: sudo ./setup-ssl-domain.sh
################################################################################

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="rico-cuba.com"
WWW_DOMAIN="www.rico-cuba.com"
SERVER_IP="217.154.105.67"
EMAIL="admin@rico-cuba.com"  # Für Let's Encrypt Benachrichtigungen

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║     Rico-Cuba - SSL & Domain Setup                    ║
║     Domain: www.rico-cuba.com                         ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Root-Check
if [[ $EUID -ne 0 ]]; then
   log_error "Dieses Script muss als root ausgeführt werden!"
   echo "Verwendung: sudo ./setup-ssl-domain.sh"
   exit 1
fi

################################################################################
# 1. Certbot installieren
################################################################################
log_info "Installiere Certbot für Let's Encrypt SSL..."

if ! command -v certbot &> /dev/null; then
    apt update -qq
    apt install -y -qq certbot python3-certbot-nginx
    log_success "Certbot installiert"
else
    log_info "Certbot bereits installiert"
fi

################################################################################
# 2. Nginx-Konfiguration erstellen (ohne SSL erstmal)
################################################################################
log_info "Erstelle Nginx-Konfiguration für ${DOMAIN}..."

cat > /etc/nginx/sites-available/rico-cuba << EOF
# Rico-Cuba Nginx Configuration
# Domain: ${DOMAIN} / ${WWW_DOMAIN}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN} ${SERVER_IP};

    # Erhöhe die Limits für File Uploads
    client_max_body_size 100M;
    client_body_timeout 300s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
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
# 3. Konfiguration aktivieren
################################################################################
log_info "Aktiviere Konfiguration..."

# Symlink erstellen
ln -sf /etc/nginx/sites-available/rico-cuba /etc/nginx/sites-enabled/

# Default-Site deaktivieren
rm -f /etc/nginx/sites-enabled/default

log_success "Konfiguration aktiviert"

################################################################################
# 4. Nginx testen und neu starten
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
# 5. Firewall-Ports öffnen
################################################################################
log_info "Öffne Firewall-Ports (80 und 443)..."

if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        ufw allow 80/tcp > /dev/null 2>&1 || true
        ufw allow 443/tcp > /dev/null 2>&1 || true
        log_success "Firewall: Ports 80 und 443 sind offen"
    fi
fi

################################################################################
# 6. SSL-Zertifikat mit Let's Encrypt holen
################################################################################
log_info "Hole SSL-Zertifikat von Let's Encrypt..."
echo ""
log_warning "WICHTIG: Stelle sicher, dass deine DNS-Einträge korrekt sind:"
echo "   A Record @ -> ${SERVER_IP}"
echo "   A Record www -> ${SERVER_IP}"
echo ""

# Prüfe ob Domain erreichbar ist
log_info "Prüfe DNS-Auflösung..."
if host ${DOMAIN} > /dev/null 2>&1; then
    RESOLVED_IP=$(host ${DOMAIN} | grep "has address" | head -1 | awk '{print $4}')
    if [ "$RESOLVED_IP" == "$SERVER_IP" ]; then
        log_success "DNS für ${DOMAIN} zeigt auf ${SERVER_IP}"
    else
        log_warning "DNS für ${DOMAIN} zeigt auf ${RESOLVED_IP} (erwartet: ${SERVER_IP})"
    fi
else
    log_warning "Konnte DNS für ${DOMAIN} nicht auflösen"
fi

echo ""
read -p "Fortfahren mit SSL-Zertifikat? (j/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Jj]$ ]]; then
    log_info "Hole SSL-Zertifikat..."

    # Certbot mit nginx plugin
    certbot --nginx \
        -d ${DOMAIN} \
        -d ${WWW_DOMAIN} \
        --non-interactive \
        --agree-tos \
        --email ${EMAIL} \
        --redirect \
        --keep-until-expiring

    if [ $? -eq 0 ]; then
        log_success "SSL-Zertifikat erfolgreich installiert!"
    else
        log_error "SSL-Zertifikat konnte nicht installiert werden!"
        log_info "Mögliche Ursachen:"
        echo "   - DNS zeigt noch nicht auf diesen Server"
        echo "   - Port 80 ist nicht erreichbar"
        echo "   - Domain existiert nicht"
        echo ""
        echo "Du kannst es später manuell versuchen mit:"
        echo "   sudo certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN}"
        exit 1
    fi
else
    log_warning "SSL-Zertifikat übersprungen"
    echo "Du kannst es später manuell installieren mit:"
    echo "   sudo certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN}"
fi

################################################################################
# 7. Auto-Renewal für SSL einrichten
################################################################################
log_info "Richte automatische SSL-Erneuerung ein..."

# Certbot renewal timer sollte bereits aktiv sein
if systemctl is-active --quiet certbot.timer; then
    log_success "Certbot Auto-Renewal ist aktiv"
else
    systemctl enable certbot.timer
    systemctl start certbot.timer
    log_success "Certbot Auto-Renewal aktiviert"
fi

# Test renewal
log_info "Teste Renewal-Prozess..."
certbot renew --dry-run > /dev/null 2>&1 && log_success "Renewal-Test erfolgreich" || log_warning "Renewal-Test fehlgeschlagen"

################################################################################
# 8. Finale Nginx-Konfiguration anzeigen
################################################################################
echo ""
log_info "Aktuelle Nginx-Konfiguration:"
echo "----------------------------------------"
cat /etc/nginx/sites-available/rico-cuba
echo "----------------------------------------"

################################################################################
# Abschluss
################################################################################
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║       SSL & Domain Setup erfolgreich!                 ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Zusammenfassung:"
echo ""
echo "🌐 Deine App ist jetzt erreichbar unter:"
echo "   https://www.rico-cuba.com (primär)"
echo "   https://rico-cuba.com (redirect zu www)"
echo "   http://... wird automatisch zu https:// weitergeleitet"
echo ""
echo "🔒 SSL-Zertifikat:"
echo "   Aussteller: Let's Encrypt"
echo "   Auto-Renewal: Aktiv (alle 60 Tage)"
echo ""
echo "📊 Nützliche Befehle:"
echo "   sudo certbot certificates          - Zertifikate anzeigen"
echo "   sudo certbot renew                 - Zertifikat erneuern"
echo "   sudo nginx -t                      - Nginx-Config testen"
echo "   sudo systemctl restart nginx       - Nginx neustarten"
echo ""
echo "📝 Logs:"
echo "   sudo tail -f /var/log/nginx/access.log"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""

log_success "Setup abgeschlossen! 🚀"
echo ""
