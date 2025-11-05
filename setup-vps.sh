#!/bin/bash

################################################################################
# CubaCuba VPS Setup Script
#
# Dieses Script automatisiert das komplette Setup auf einem frischen Ubuntu VPS
#
# Verwendung:
#   1. Projekt auf VPS hochladen (nach /var/www/CubaCuba)
#   2. Script ausführbar machen: chmod +x setup-vps.sh
#   3. Als root ausführen: sudo ./setup-vps.sh
################################################################################

set -e  # Stop bei Fehlern

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
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
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║           CubaCuba VPS Setup Script                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Root-Check
if [ "$EUID" -ne 0 ]; then
    log_error "Bitte als root ausführen: sudo ./setup-vps.sh"
    exit 1
fi

# Projekt-Verzeichnis überprüfen
PROJECT_DIR="/var/www/CubaCuba"
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Projekt-Verzeichnis $PROJECT_DIR nicht gefunden!"
    log_info "Bitte stelle sicher, dass das Projekt nach $PROJECT_DIR hochgeladen wurde."
    exit 1
fi

log_info "Projekt gefunden in: $PROJECT_DIR"

################################################################################
# 1. System-Update
################################################################################
log_info "Step 1/10: System wird aktualisiert..."
apt update -qq && apt upgrade -y -qq
log_success "System aktualisiert"

################################################################################
# 2. Firewall einrichten
################################################################################
log_info "Step 2/10: Firewall wird konfiguriert..."
if ! command -v ufw &> /dev/null; then
    apt install -y -qq ufw
fi
ufw --force enable
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
log_success "Firewall konfiguriert (SSH, HTTP, HTTPS)"

################################################################################
# 3. Node.js installieren
################################################################################
log_info "Step 3/10: Node.js wird installiert..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y -qq nodejs
    log_success "Node.js $(node -v) installiert"
else
    log_info "Node.js $(node -v) bereits installiert"
fi

################################################################################
# 4. PostgreSQL installieren
################################################################################
log_info "Step 4/10: PostgreSQL wird installiert..."
if ! command -v psql &> /dev/null; then
    apt install -y -qq postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    log_success "PostgreSQL installiert"
else
    log_info "PostgreSQL bereits installiert"
fi

################################################################################
# 5. Datenbank konfigurieren
################################################################################
log_info "Step 5/10: Datenbank wird konfiguriert..."

# Generiere sicheres Passwort
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
SESSION_SECRET=$(openssl rand -hex 32)

# Erstelle Datenbank und User
sudo -u postgres psql << EOF > /dev/null 2>&1 || true
DROP DATABASE IF EXISTS cubacuba;
DROP USER IF EXISTS cubacuba_user;
CREATE USER cubacuba_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE cubacuba OWNER cubacuba_user;
GRANT ALL PRIVILEGES ON DATABASE cubacuba TO cubacuba_user;
EOF

# Verbinde zur DB und setze Berechtigungen
sudo -u postgres psql -d cubacuba << EOF > /dev/null 2>&1 || true
GRANT ALL ON SCHEMA public TO cubacuba_user;
ALTER SCHEMA public OWNER TO cubacuba_user;
EOF

log_success "Datenbank 'cubacuba' erstellt mit User 'cubacuba_user'"

################################################################################
# 6. .env Datei erstellen
################################################################################
log_info "Step 6/10: Umgebungsvariablen werden konfiguriert..."

# Hole Server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

# Erstelle .env Datei
cat > "$PROJECT_DIR/.env" << EOF
# Datenbank
DATABASE_URL=postgresql://cubacuba_user:$DB_PASSWORD@localhost:5432/cubacuba

# Session Secret
SESSION_SECRET=$SESSION_SECRET

# Node Environment
NODE_ENV=production

# Server Port (intern)
PORT=3000

# Optional: Object Storage (anpassen falls benötigt)
# PUBLIC_OBJECT_SEARCH_PATHS=/bucket-name/public
# PRIVATE_OBJECT_DIR=/bucket-name/private

# Optional: OAuth (anpassen falls benötigt)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_CALLBACK_URL=https://$SERVER_IP/api/auth/google/callback
# FACEBOOK_APP_ID=
# FACEBOOK_APP_SECRET=
# FACEBOOK_CALLBACK_URL=https://$SERVER_IP/api/auth/facebook/callback
EOF

chmod 600 "$PROJECT_DIR/.env"

log_success "Umgebungsvariablen konfiguriert"

# Credentials temporär speichern (wird später angezeigt und optional gespeichert)
CREDENTIALS_TEXT="╔═══════════════════════════════════════════════════════╗
║         CubaCuba - Zugangsdaten & Credentials         ║
╚═══════════════════════════════════════════════════════╝

Erstellt am: $(date)
Server IP: $SERVER_IP

PostgreSQL Datenbank:
---------------------
Host: localhost
Port: 5432
Database: cubacuba
User: cubacuba_user
Password: $DB_PASSWORD

Connection String:
DATABASE_URL=postgresql://cubacuba_user:$DB_PASSWORD@localhost:5432/cubacuba

Session Secret:
--------------
SESSION_SECRET=$SESSION_SECRET

⚠️  WICHTIG: Diese Credentials sicher aufbewahren!
   Verwende einen Passwort-Manager (z.B. 1Password, Bitwarden, KeePass)"

################################################################################
# 7. Dependencies installieren und Projekt bauen
################################################################################
log_info "Step 7/10: Dependencies werden installiert..."
cd "$PROJECT_DIR"
npm install --quiet --production=false
log_success "Dependencies installiert"

log_info "Datenbank-Schema wird erstellt..."
npm run db:push
log_success "Datenbank-Schema erstellt"

log_info "Projekt wird gebaut..."
npm run build
log_success "Projekt gebaut"

################################################################################
# 8. PM2 installieren und App starten
################################################################################
log_info "Step 8/10: PM2 wird konfiguriert..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 --quiet
    log_success "PM2 installiert"
else
    log_info "PM2 bereits installiert"
fi

# Stoppe alte Instanz falls vorhanden
pm2 delete cubacuba 2>/dev/null || true

# Starte App
pm2 start npm --name "cubacuba" -- start
pm2 startup systemd -u root --hp /root
pm2 save

log_success "CubaCuba App mit PM2 gestartet"

################################################################################
# 9. Nginx installieren und konfigurieren
################################################################################
log_info "Step 9/10: Nginx wird konfiguriert..."
if ! command -v nginx &> /dev/null; then
    apt install -y -qq nginx
    systemctl enable nginx
    log_success "Nginx installiert"
else
    log_info "Nginx bereits installiert"
fi

# Domain/IP ermitteln
echo ""
read -p "Hast du eine Domain? (j/n): " HAS_DOMAIN
if [[ $HAS_DOMAIN == "j" || $HAS_DOMAIN == "J" ]]; then
    read -p "Domain eingeben (z.B. example.com): " DOMAIN
    SERVER_NAME="$DOMAIN www.$DOMAIN"
else
    DOMAIN=$SERVER_IP
    SERVER_NAME="_"
fi

# Nginx-Konfiguration erstellen
cat > /etc/nginx/sites-available/cubacuba << EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # Erhöhe die Limits für File Uploads
    client_max_body_size 50M;

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

        # Timeouts für lange Requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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

ln -sf /etc/nginx/sites-available/cubacuba /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if nginx -t > /dev/null 2>&1; then
    systemctl restart nginx
    log_success "Nginx konfiguriert und gestartet"
else
    log_error "Nginx-Konfiguration fehlerhaft"
    nginx -t
    exit 1
fi

################################################################################
# 10. SSL-Zertifikat (optional)
################################################################################
log_info "Step 10/10: SSL-Zertifikat..."
if [[ $HAS_DOMAIN == "j" || $HAS_DOMAIN == "J" ]]; then
    echo ""
    read -p "Möchtest du SSL mit Let's Encrypt einrichten? (j/n): " SETUP_SSL
    if [[ $SETUP_SSL == "j" || $SETUP_SSL == "J" ]]; then
        if ! command -v certbot &> /dev/null; then
            apt install -y -qq certbot python3-certbot-nginx
        fi

        read -p "E-Mail-Adresse für Let's Encrypt: " EMAIL
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

        if [ $? -eq 0 ]; then
            log_success "SSL-Zertifikat erfolgreich installiert"
        else
            log_warning "SSL-Installation fehlgeschlagen. Kann später manuell nachgeholt werden."
        fi
    fi
else
    log_info "SSL übersprungen (keine Domain angegeben)"
fi

################################################################################
# Zusätzliche Tools installieren
################################################################################
log_info "Zusätzliche Tools werden installiert..."

# Fail2Ban
apt install -y -qq fail2ban
systemctl enable fail2ban
systemctl start fail2ban
log_success "Fail2Ban installiert (Schutz vor Brute-Force)"

# htop für Monitoring
apt install -y -qq htop

# Backup-Script erstellen
cat > /usr/local/bin/backup-cubacuba << 'BACKUP_EOF'
#!/bin/bash
BACKUP_DIR="/root/backups/cubacuba"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U cubacuba_user cubacuba | gzip > $BACKUP_DIR/cubacuba_$TIMESTAMP.sql.gz
find $BACKUP_DIR -name "cubacuba_*.sql.gz" -mtime +7 -delete
echo "Backup erstellt: cubacuba_$TIMESTAMP.sql.gz"
BACKUP_EOF

chmod +x /usr/local/bin/backup-cubacuba

# Cronjob für tägliches Backup
(crontab -l 2>/dev/null | grep -v backup-cubacuba; echo "0 2 * * * /usr/local/bin/backup-cubacuba >> /var/log/cubacuba-backup.log 2>&1") | crontab -
log_success "Automatisches Backup eingerichtet (täglich 2 Uhr)"

################################################################################
# Setup abgeschlossen
################################################################################
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║              Setup erfolgreich abgeschlossen!         ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Zusammenfassung:"
echo ""
echo "🌐 Deine Anwendung ist erreichbar unter:"
if [[ $HAS_DOMAIN == "j" || $HAS_DOMAIN == "J" ]] && [[ $SETUP_SSL == "j" || $SETUP_SSL == "J" ]]; then
    echo "   https://$DOMAIN"
elif [[ $HAS_DOMAIN == "j" || $HAS_DOMAIN == "J" ]]; then
    echo "   http://$DOMAIN"
else
    echo "   http://$SERVER_IP"
fi
echo ""

echo "📊 Nützliche Befehle:"
echo "   pm2 status              - Status der App anzeigen"
echo "   pm2 logs cubacuba       - Live-Logs anzeigen"
echo "   pm2 restart cubacuba    - App neustarten"
echo "   pm2 monit              - Monitoring Dashboard"
echo "   htop                   - System-Ressourcen anzeigen"
echo ""

echo "💾 Backup:"
echo "   Automatisches Backup: Täglich um 2 Uhr"
echo "   Manuelles Backup: /usr/local/bin/backup-cubacuba"
echo "   Backup-Verzeichnis: /root/backups/cubacuba"
echo ""

echo "🔐 Zugangsdaten:"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "$CREDENTIALS_TEXT"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
log_warning "⚠️  WICHTIG: Diese Credentials werden NUR EINMAL angezeigt!"
echo ""
read -p "Möchtest du die Credentials in einer Datei speichern? (nicht empfohlen) (j/n): " SAVE_CREDS
if [[ $SAVE_CREDS == "j" || $SAVE_CREDS == "J" ]]; then
    CREDS_FILE="/root/.cubacuba-credentials-$(date +%Y%m%d_%H%M%S).txt"
    echo "$CREDENTIALS_TEXT" > "$CREDS_FILE"
    chmod 600 "$CREDS_FILE"
    echo "   Gespeichert in: $CREDS_FILE"
    echo "   Zum Löschen: rm -f $CREDS_FILE"

    # Auto-delete nach 24 Stunden
    (crontab -l 2>/dev/null | grep -v "$CREDS_FILE"; echo "0 $(date -d '+1 day' +%H) $(date -d '+1 day' +%d) * * rm -f $CREDS_FILE 2>/dev/null") | crontab - 2>/dev/null
    log_info "Datei wird automatisch in 24 Stunden gelöscht"
else
    log_info "Credentials nicht gespeichert - notiere sie jetzt!"
fi
echo ""

echo "📝 Logs:"
echo "   tail -f /var/log/nginx/access.log    - Nginx Access Log"
echo "   tail -f /var/log/nginx/error.log     - Nginx Error Log"
echo "   pm2 logs cubacuba                    - Application Logs"
echo ""

echo "🔄 Updates deployen:"
echo "   cd $PROJECT_DIR"
echo "   git pull                    # Code aktualisieren"
echo "   npm install                 # Dependencies aktualisieren"
echo "   npm run db:push             # DB-Schema aktualisieren"
echo "   npm run build               # Neu bauen"
echo "   pm2 reload cubacuba         # App neu laden"
echo ""

log_success "Setup abgeschlossen! Viel Erfolg mit CubaCuba! 🚀"
echo ""
