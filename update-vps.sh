#!/bin/bash

################################################################################
# CubaCuba VPS Update Script
#
# Dieses Script automatisiert das Deployment von Updates
#
# Verwendung:
#   chmod +x update-vps.sh
#   ./update-vps.sh
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
║         CubaCuba - Update Deployment                 ║
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

# Check if PM2 is running
if ! pm2 list | grep -q "cubacuba"; then
    log_warning "CubaCuba App läuft nicht in PM2!"
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

BACKUP_DIR="/root/backups/cubacuba-pre-update"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# DB Backup
if pg_dump -U cubacuba_user cubacuba | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"; then
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
    else
        log_success "Änderungen erfolgreich geholt"
        log_info "Commits zwischen $BEFORE_COMMIT und $AFTER_COMMIT"
        git log --oneline "$BEFORE_COMMIT..$AFTER_COMMIT"
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

# Check if package.json changed
if git diff "$BEFORE_COMMIT" "$AFTER_COMMIT" --name-only | grep -q "package.json"; then
    log_info "package.json wurde geändert, installiere Dependencies..."
    npm install
    log_success "Dependencies aktualisiert"
else
    log_info "package.json unverändert, überspringe npm install"
fi

################################################################################
# Datenbank-Migrationen
################################################################################
log_info "Prüfe Datenbank-Schema..."

# Check if schema changed
if git diff "$BEFORE_COMMIT" "$AFTER_COMMIT" --name-only | grep -q "shared/schema.ts"; then
    log_warning "Datenbank-Schema wurde geändert!"
    read -p "Datenbank-Migration durchführen? (j/n): " RUN_MIGRATION
    if [[ $RUN_MIGRATION == "j" || $RUN_MIGRATION == "J" ]]; then
        npm run db:push
        log_success "Datenbank-Schema aktualisiert"
    else
        log_warning "Migration übersprungen - könnte zu Problemen führen!"
    fi
else
    log_info "Datenbank-Schema unverändert"
fi

################################################################################
# Projekt neu bauen
################################################################################
log_info "Baue Projekt neu..."
if npm run build; then
    log_success "Build erfolgreich"
else
    log_error "Build fehlgeschlagen!"
    log_info "Stelle vorheriges Build wieder her..."
    git checkout "$BEFORE_COMMIT"
    npm install
    npm run build
    pm2 reload cubacuba
    log_error "Update abgebrochen, vorherige Version wiederhergestellt"
    exit 1
fi

################################################################################
# App neu laden
################################################################################
log_info "Lade Anwendung neu..."

# Zero-downtime reload
if pm2 reload cubacuba; then
    log_success "Anwendung neu geladen"
else
    log_error "PM2 reload fehlgeschlagen, versuche restart..."
    pm2 restart cubacuba
fi

# Wait a bit for app to start
sleep 3

################################################################################
# Health Check
################################################################################
log_info "Führe Health Check durch..."

# Check if app is responding
HEALTH_CHECK_URL="http://localhost:3000"
if curl -f -s -o /dev/null "$HEALTH_CHECK_URL"; then
    log_success "Health Check erfolgreich - App läuft"
else
    log_error "Health Check fehlgeschlagen - App antwortet nicht!"
    log_info "Prüfe Logs mit: pm2 logs cubacuba"
    exit 1
fi

################################################################################
# Cleanup
################################################################################
log_info "Räume auf..."

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    git stash pop
fi

# Clean old backups (älter als 30 Tage)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true

################################################################################
# Zusammenfassung
################################################################################
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Update erfolgreich abgeschlossen!            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Zusammenfassung:"
echo "   Commit: $BEFORE_COMMIT → $AFTER_COMMIT"
echo "   Backup: $BACKUP_DIR"
echo ""

log_info "Nützliche Befehle:"
echo "   pm2 status              - App-Status prüfen"
echo "   pm2 logs cubacuba       - Live-Logs anzeigen"
echo "   pm2 monit              - Monitoring Dashboard"
echo ""

log_info "Rollback (falls nötig):"
echo "   cd $PROJECT_DIR"
echo "   git checkout $BEFORE_COMMIT"
echo "   npm install"
echo "   npm run build"
echo "   pm2 reload cubacuba"
echo ""

log_success "Update abgeschlossen! 🚀"
