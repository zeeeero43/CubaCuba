#!/bin/bash

################################################################################
# Rico-Cuba VPS Update Script
#
# Dieses Script automatisiert das Deployment von Updates
#
# Verwendung:
#   chmod +x update-vps.sh
#   sudo ./update-vps.sh
#
# WICHTIG: Muss als root ausgeführt werden!
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
║         Rico-Cuba - Update Deployment                ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

PROJECT_DIR="/var/www/CubaCuba"

if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Projekt-Verzeichnis $PROJECT_DIR nicht gefunden!"
    exit 1
fi

cd "$PROJECT_DIR"

################################################################################
# Pre-Update Checks
################################################################################
log_info "Führe Pre-Update Checks durch..."

# Check if PM2 is running (als ricoapp User)
if ! sudo -u ricoapp pm2 list | grep -q "rico-cuba"; then
    log_warning "Rico-Cuba App läuft nicht in PM2!"
    read -p "Trotzdem fortfahren? (j/n): " CONTINUE
    if [[ $CONTINUE != "j" && $CONTINUE != "J" ]]; then
        exit 1
    fi
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    log_error "Git ist nicht installiert!"
    exit 1
fi

################################################################################
# Backup erstellen
################################################################################
log_info "Erstelle Backup vor Update..."

BACKUP_DIR="/root/backups/rico-cuba-pre-update"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# DB Backup
PGPASSWORD=$(grep DATABASE_URL /var/www/CubaCuba/.env | cut -d':' -f3 | cut -d'@' -f1)
export PGPASSWORD

if pg_dump -h localhost -U ricocuba_user ricocuba | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"; then
    log_success "Datenbank-Backup erstellt: db_backup_$TIMESTAMP.sql.gz"
else
    log_warning "Datenbank-Backup fehlgeschlagen (setze ohne Backup fort)"
fi

# Code Backup
if tar -czf "$BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz" -C /var/www CubaCuba --exclude=node_modules --exclude=dist 2>/dev/null; then
    log_success "Code-Backup erstellt: code_backup_$TIMESTAMP.tar.gz"
else
    log_warning "Code-Backup fehlgeschlagen"
fi

# Uploads Backup
if tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" -C $PROJECT_DIR uploads 2>/dev/null; then
    log_success "Uploads-Backup erstellt: uploads_backup_$TIMESTAMP.tar.gz"
else
    log_warning "Uploads-Backup fehlgeschlagen"
fi

################################################################################
# Git Pull
################################################################################
log_info "Hole neueste Änderungen von Git..."

# Stash uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_warning "Unkommittete Änderungen gefunden, werden gestasht..."
    git stash
    STASHED=true
fi

# Pull latest changes
BEFORE_COMMIT=$(git rev-parse HEAD)
if git pull; then
    AFTER_COMMIT=$(git rev-parse HEAD)
    if [ "$BEFORE_COMMIT" == "$AFTER_COMMIT" ]; then
        log_info "Keine neuen Änderungen gefunden"
        echo ""
        read -p "Trotzdem neu bauen und neustarten? (j/n): " REBUILD
        if [[ $REBUILD != "j" && $REBUILD != "J" ]]; then
            log_info "Update abgebrochen"
            exit 0
        fi
    else
        log_success "Änderungen erfolgreich geholt"
        echo ""
        log_info "Commits zwischen $BEFORE_COMMIT und $AFTER_COMMIT:"
        git log --oneline "$BEFORE_COMMIT..$AFTER_COMMIT"
        echo ""
    fi
else
    log_error "Git pull fehlgeschlagen!"
    if [ "$STASHED" = true ]; then
        git stash pop
    fi
    exit 1
fi

################################################################################
# Dependencies aktualisieren
################################################################################
log_info "Prüfe Dependencies..."

# Always ensure dotenv is installed (required for .env loading in production)
log_info "Prüfe dotenv Installation..."
if ! sudo -u ricoapp npm list dotenv --depth=0 &>/dev/null; then
    log_warning "dotenv nicht gefunden, installiere..."
    sudo -u ricoapp npm install dotenv
fi

# Check if package.json changed
if git diff "$BEFORE_COMMIT" "$AFTER_COMMIT" --name-only | grep -q "package.json" || [ "$REBUILD" == "j" ] || [ "$REBUILD" == "J" ]; then
    log_info "Dependencies werden aktualisiert (als ricoapp User)..."
    sudo -u ricoapp npm install
    log_success "Dependencies aktualisiert"
else
    log_info "package.json unverändert, überspringe npm install"
fi

################################################################################
# Datenbank-Migrationen & Extensions
################################################################################
log_info "Prüfe Datenbank-Schema..."

# Enable PostgreSQL extensions for search (idempotent)
log_info "Aktiviere PostgreSQL Extensions für Suche..."
sudo -u postgres psql -d ricocuba -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || log_warning "pg_trgm Extension bereits aktiv oder Fehler"
sudo -u postgres psql -d ricocuba -c "CREATE EXTENSION IF NOT EXISTS unaccent;" 2>/dev/null || log_warning "unaccent Extension bereits aktiv oder Fehler"
log_success "PostgreSQL Extensions geprüft"

# Check if schema changed
if git diff "$BEFORE_COMMIT" "$AFTER_COMMIT" --name-only | grep -q "shared/schema.ts" || [ "$REBUILD" == "j" ] || [ "$REBUILD" == "J" ]; then
    log_warning "Datenbank-Schema wurde geändert!"
    echo ""
    read -p "Datenbank-Migration durchführen? (j/n): " RUN_MIGRATION
    if [[ $RUN_MIGRATION == "j" || $RUN_MIGRATION == "J" ]]; then
        sudo -u ricoapp npm run db:push --force || sudo -u ricoapp npm run db:push
        log_success "Datenbank-Schema aktualisiert"
    else
        log_warning "Migration übersprungen - könnte zu Problemen führen!"
    fi
else
    log_info "Datenbank-Schema unverändert"
fi

################################################################################
# PM2 Configuration Check
################################################################################
log_info "Prüfe PM2 Konfiguration..."

# Ensure ecosystem.config.cjs exists with correct settings
cat > "$PROJECT_DIR/ecosystem.config.cjs" << 'EOF'
module.exports = {
  apps: [{
    name: 'rico-cuba',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/CubaCuba',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

chown ricoapp:ricoapp "$PROJECT_DIR/ecosystem.config.cjs"
log_success "PM2 Konfiguration aktualisiert"

################################################################################
# Build
################################################################################
log_info "Baue Projekt neu (als ricoapp User)..."
sudo -u ricoapp npm run build
log_success "Build erfolgreich"

################################################################################
# Reload App
################################################################################
log_info "Lade App neu (Zero-Downtime)..."

# Check if app is already running in PM2
if sudo -u ricoapp pm2 list | grep -q "rico-cuba"; then
    log_info "App läuft bereits, führe reload durch..."
    sudo -u ricoapp pm2 reload rico-cuba
else
    log_info "App läuft nicht, starte neu..."
    sudo -u ricoapp pm2 start "$PROJECT_DIR/ecosystem.config.cjs"
    sudo -u ricoapp pm2 save
fi

log_success "App erfolgreich neu geladen"

################################################################################
# Health Check
################################################################################
log_info "Warte auf App-Start..."
sleep 3

if sudo -u ricoapp pm2 list | grep -q "rico-cuba.*online"; then
    log_success "App läuft erfolgreich!"
else
    log_error "App-Start fehlgeschlagen!"
    log_warning "Rollback zu vorherigem Zustand empfohlen"
    echo ""
    echo "Rollback durchführen:"
    echo "  1. git reset --hard $BEFORE_COMMIT"
    echo "  2. npm install"
    echo "  3. npm run build"
    echo "  4. pm2 reload rico-cuba"
    exit 1
fi

################################################################################
# Cleanup
################################################################################
log_info "Räume auf..."

# Lösche alte Backups (älter als 30 Tage)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true

# Lösche alte npm cache
npm cache clean --force > /dev/null 2>&1 || true

################################################################################
# Update abgeschlossen
################################################################################
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}║           Update erfolgreich abgeschlossen!           ║${NC}"
echo -e "${GREEN}║                                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Zusammenfassung:"
echo ""
echo "📊 App-Status:"
sudo -u ricoapp pm2 list | grep rico-cuba || sudo -u ricoapp pm2 status
echo ""

echo "📝 Logs ansehen:"
echo "   sudo -u ricoapp pm2 logs rico-cuba --lines 50"
echo ""

echo "💾 Backup-Speicherort:"
echo "   $BACKUP_DIR"
echo ""

if [ "$BEFORE_COMMIT" != "$AFTER_COMMIT" ]; then
    echo "🔄 Änderungen:"
    echo "   Von: $BEFORE_COMMIT"
    echo "   Zu:  $AFTER_COMMIT"
    echo ""
fi

echo "👨‍💼 Admin-User erstellen:"
echo "   sudo -u ricoapp bash -c 'source <(grep -v \"^#\" .env | sed \"s/^/export /\") && npx tsx scripts/make-admin.ts'"
echo ""

log_success "Update abgeschlossen! 🚀"
echo ""
