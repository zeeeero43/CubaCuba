#!/bin/bash

################################################################################
# Rico-Cuba VPS Setup Script
#
# Dieses Script automatisiert das komplette Setup auf einem frischen Ubuntu 22.04 VPS
#
# Verwendung:
#   1. Projekt auf VPS hochladen (nach /var/www/rico-cuba)
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
║           Rico-Cuba VPS Setup Script                 ║
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
PROJECT_DIR="/var/www/rico-cuba"
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Projekt-Verzeichnis $PROJECT_DIR nicht gefunden!"
    log_info "Bitte stelle sicher, dass das Projekt nach $PROJECT_DIR hochgeladen wurde."
    exit 1
fi

log_info "Projekt gefunden in: $PROJECT_DIR"

################################################################################
# 1. System-Update
################################################################################
log_info "Step 1/11: System wird aktualisiert..."
apt update -qq && apt upgrade -y -qq
log_success "System aktualisiert"

################################################################################
# 2. Firewall einrichten
################################################################################
log_info "Step 2/11: Firewall wird konfiguriert..."
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
log_info "Step 3/11: Node.js wird installiert..."
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
log_info "Step 4/11: PostgreSQL wird installiert..."
if ! command -v psql &> /dev/null; then
    apt install -y -qq postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    log_success "PostgreSQL installiert"
else
    log_info "PostgreSQL bereits installiert"
fi

################################################################################
# 5. Application User erstellen (Sicherheit!)
################################################################################
log_info "Step 5/11: Application User wird erstellt..."

# Erstelle dedicated User für die App (NICHT root!)
if ! id -u ricoapp &>/dev/null; then
    useradd -r -m -s /bin/bash ricoapp
    log_success "User 'ricoapp' erstellt"
else
    log_info "User 'ricoapp' existiert bereits"
fi

################################################################################
# 6. Datenbank konfigurieren
################################################################################
log_info "Step 6/11: Datenbank wird konfiguriert..."

# Generiere sicheres Passwort
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
SESSION_SECRET=$(openssl rand -hex 32)

# Prüfe ob Datenbank bereits existiert
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='ricocuba'")

if [ "$DB_EXISTS" = "1" ]; then
    log_warning "Datenbank 'ricocuba' existiert bereits - wird NICHT überschrieben!"
    log_info "Für Neuinstallation: sudo -u postgres psql -c 'DROP DATABASE ricocuba;'"
    # Hole existierendes Passwort falls .env existiert
    if [ -f "$PROJECT_DIR/.env" ]; then
        DB_PASSWORD=$(grep DATABASE_URL "$PROJECT_DIR/.env" | cut -d':' -f3 | cut -d'@' -f1)
        log_info "Verwende existierendes DB-Passwort aus .env"
    fi
else
    # Erstelle User nur wenn nicht existiert
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='ricocuba_user'")
    if [ "$USER_EXISTS" != "1" ]; then
        sudo -u postgres psql << EOF > /dev/null 2>&1
CREATE USER ricocuba_user WITH PASSWORD '$DB_PASSWORD';
EOF
        log_success "DB-User 'ricocuba_user' erstellt"
    fi

    # Erstelle Datenbank
    sudo -u postgres psql << EOF > /dev/null 2>&1
CREATE DATABASE ricocuba OWNER ricocuba_user;
GRANT ALL PRIVILEGES ON DATABASE ricocuba TO ricocuba_user;
EOF
    
    # Setze Berechtigungen
    sudo -u postgres psql -d ricocuba << EOF > /dev/null 2>&1
GRANT ALL ON SCHEMA public TO ricocuba_user;
ALTER SCHEMA public OWNER TO ricocuba_user;
EOF
    
    log_success "Datenbank 'ricocuba' erstellt mit User 'ricocuba_user'"
fi

################################################################################
# 7. DeepSeek API Key abfragen
################################################################################
log_info "Step 7/12: DeepSeek AI API Key wird konfiguriert..."
echo ""
log_warning "⚠️  Rico-Cuba benötigt einen DeepSeek API Key für AI-Moderation"
echo ""
echo "Ohne API Key funktioniert die Anzeigenerstellung NICHT!"
echo ""
echo "DeepSeek API Key erhalten:"
echo "  1. Gehe zu: https://platform.deepseek.com"
echo "  2. Registriere dich / Logge dich ein"
echo "  3. Navigiere zu API Keys"
echo "  4. Erstelle einen neuen API Key"
echo ""
read -p "DeepSeek API Key eingeben (oder 'skip' zum Überspringen): " DEEPSEEK_API_KEY

if [ "$DEEPSEEK_API_KEY" == "skip" ]; then
    log_warning "DeepSeek API Key übersprungen - muss später in .env hinzugefügt werden!"
    DEEPSEEK_API_KEY=""
else
    log_success "DeepSeek API Key gespeichert"
fi

################################################################################
# 8. .env Datei erstellen
################################################################################
log_info "Step 8/12: Umgebungsvariablen werden konfiguriert..."

# Hole Server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

# Erstelle .env Datei
cat > "$PROJECT_DIR/.env" << EOF
# Datenbank
DATABASE_URL=postgresql://ricocuba_user:$DB_PASSWORD@localhost:5432/ricocuba

# Session Secret
SESSION_SECRET=$SESSION_SECRET

# Node Environment
NODE_ENV=production

# Server Port (intern)
PORT=3000

# DeepSeek AI API Key (WICHTIG für Moderation!)
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY

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
║         Rico-Cuba - Zugangsdaten & Credentials        ║
╚═══════════════════════════════════════════════════════╝

Erstellt am: $(date)
Server IP: $SERVER_IP

PostgreSQL Datenbank:
---------------------
Host: localhost
Port: 5432
Database: ricocuba
User: ricocuba_user
Password: $DB_PASSWORD

Connection String:
DATABASE_URL=postgresql://ricocuba_user:$DB_PASSWORD@localhost:5432/ricocuba

Session Secret:
--------------
SESSION_SECRET=$SESSION_SECRET

DeepSeek API Key:
----------------
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY

⚠️  WICHTIG: Diese Credentials sicher aufbewahren!
   Verwende einen Passwort-Manager (z.B. 1Password, Bitwarden, KeePass)"

################################################################################
# 9. Projekt-Permissions setzen
################################################################################
log_info "Step 9/12: Setze Projekt-Berechtigungen..."

# Setze Owner auf ricoapp User
chown -R ricoapp:ricoapp "$PROJECT_DIR"

# Erstelle Upload-Verzeichnis
mkdir -p "$PROJECT_DIR/uploads"
chmod 755 "$PROJECT_DIR/uploads"
chown -R ricoapp:ricoapp "$PROJECT_DIR/uploads"

log_success "Berechtigungen gesetzt (Owner: ricoapp)"

################################################################################
# 10. Dependencies installieren und Projekt bauen
################################################################################
log_info "Step 10/12: Dependencies werden installiert..."

# Wechsel zu ricoapp User für npm install
cd "$PROJECT_DIR"
sudo -u ricoapp npm install --quiet --production=false
log_success "Dependencies installiert"

log_info "Datenbank-Schema wird erstellt..."
if ! sudo -u ricoapp npm run db:push; then
    log_error "Datenbank-Schema konnte nicht erstellt werden!"
    log_error "Bitte prüfe die Datenbank-Verbindung und Schema-Definitionen."
    exit 1
fi
log_success "Datenbank-Schema erstellt"

log_info "Projekt wird gebaut..."
sudo -u ricoapp npm run build
log_success "Projekt gebaut"

################################################################################
# 11. PM2 installieren und App starten (als ricoapp User!)
################################################################################
log_info "Step 11/12: PM2 wird konfiguriert..."

# PM2 global installieren (als root)
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 --quiet
    log_success "PM2 installiert"
else
    log_info "PM2 bereits installiert"
fi

# PM2 als ricoapp User konfigurieren und starten
log_info "Starte App als ricoapp User (NICHT als root!)..."

# Stoppe alte Instanz falls vorhanden (unter ricoapp)
sudo -u ricoapp pm2 delete rico-cuba 2>/dev/null || true

# Starte App als ricoapp User
sudo -u ricoapp bash << 'EOPM2'
cd /var/www/rico-cuba
pm2 start npm --name "rico-cuba" -- start
pm2 save
EOPM2

# PM2 Startup Script für ricoapp User erstellen
STARTUP_CMD=$(pm2 startup systemd -u ricoapp --hp /home/ricoapp | grep "sudo")
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD
fi

log_success "Rico-Cuba App mit PM2 gestartet (als ricoapp User)"
log_info "⚠️  App läuft NICHT als root (Sicherheit!)"

################################################################################
# 12. Nginx installieren und konfigurieren
################################################################################
log_info "Step 12/12: Nginx wird konfiguriert..."
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
    read -p "Domain eingeben (z.B. rico-cuba.com): " DOMAIN
    SERVER_NAME="$DOMAIN www.$DOMAIN"
else
    DOMAIN=$SERVER_IP
    SERVER_NAME="_"
fi

# Nginx-Konfiguration erstellen
cat > /etc/nginx/sites-available/rico-cuba << EOF
server {
    listen 80;
    server_name $SERVER_NAME;

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
        alias /var/www/rico-cuba/uploads/;
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

ln -sf /etc/nginx/sites-available/rico-cuba /etc/nginx/sites-enabled/
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
# SSL-Zertifikat (optional)
################################################################################
log_info "SSL-Zertifikat einrichten..."
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
cat > /usr/local/bin/backup-rico-cuba << 'BACKUP_EOF'
#!/bin/bash
BACKUP_DIR="/root/backups/rico-cuba"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# DB Backup
PGPASSWORD=$(grep DATABASE_URL /var/www/rico-cuba/.env | cut -d':' -f3 | cut -d'@' -f1)
export PGPASSWORD
pg_dump -h localhost -U ricocuba_user ricocuba | gzip > $BACKUP_DIR/ricocuba_$TIMESTAMP.sql.gz

# Uploads Backup
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz -C /var/www/rico-cuba uploads

# Lösche alte Backups (älter als 7 Tage)
find $BACKUP_DIR -name "ricocuba_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "Backup erstellt: ricocuba_$TIMESTAMP.sql.gz + uploads_$TIMESTAMP.tar.gz"
BACKUP_EOF

chmod +x /usr/local/bin/backup-rico-cuba

# Cronjob für tägliches Backup
(crontab -l 2>/dev/null | grep -v backup-rico-cuba; echo "0 3 * * * /usr/local/bin/backup-rico-cuba >> /var/log/rico-cuba-backup.log 2>&1") | crontab -
log_success "Automatisches Backup eingerichtet (täglich 3 Uhr)"

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
echo "   pm2 logs rico-cuba      - Live-Logs anzeigen"
echo "   pm2 restart rico-cuba   - App neustarten"
echo "   pm2 monit               - Monitoring Dashboard"
echo "   htop                    - System-Ressourcen anzeigen"
echo ""

echo "💾 Backup:"
echo "   Automatisches Backup: Täglich um 3 Uhr"
echo "   Manuelles Backup: /usr/local/bin/backup-rico-cuba"
echo "   Backup-Verzeichnis: /root/backups/rico-cuba"
echo ""

echo "🔐 Zugangsdaten:"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "$CREDENTIALS_TEXT"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -z "$DEEPSEEK_API_KEY" ]; then
    log_error "⚠️  WICHTIG: DeepSeek API Key fehlt!"
    echo ""
    echo "Die App wird NICHT funktionieren ohne API Key!"
    echo ""
    echo "Bitte füge den API Key hinzu:"
    echo "  1. nano /var/www/rico-cuba/.env"
    echo "  2. Setze DEEPSEEK_API_KEY=dein-api-key"
    echo "  3. Speichern mit STRG+O, Enter, STRG+X"
    echo "  4. pm2 restart rico-cuba"
    echo ""
fi

log_warning "⚠️  WICHTIG: Diese Credentials werden NUR EINMAL angezeigt!"
echo ""
read -p "Möchtest du die Credentials in einer Datei speichern? (nicht empfohlen) (j/n): " SAVE_CREDS
if [[ $SAVE_CREDS == "j" || $SAVE_CREDS == "J" ]]; then
    CREDS_FILE="/root/.rico-cuba-credentials-$(date +%Y%m%d_%H%M%S).txt"
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
echo "   pm2 logs rico-cuba                   - Application Logs"
echo ""

echo "🔄 Updates deployen:"
echo "   cd $PROJECT_DIR"
echo "   git pull                    # Code aktualisieren"
echo "   npm install                 # Dependencies aktualisieren"
echo "   npm run db:push             # DB-Schema aktualisieren"
echo "   npm run build               # Neu bauen"
echo "   pm2 reload rico-cuba        # App neu laden"
echo ""
echo "   Oder nutze das Update-Script: ./update-vps.sh"
echo ""

log_success "Setup abgeschlossen! Viel Erfolg mit Rico-Cuba! 🚀"
echo ""
