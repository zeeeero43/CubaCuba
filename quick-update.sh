#!/bin/bash

################################################################################
# Rico-Cuba Quick Update Script
#
# Schnelles Update ohne Backups und Prompts
# Verwendung: chmod +x quick-update.sh && sudo ./quick-update.sh
################################################################################

set -e

PROJECT_DIR="/var/www/CubaCuba"
cd "$PROJECT_DIR"

echo "🚀 Quick Update gestartet..."

# Git pull
echo "📥 Git pull..."
git pull || { echo "❌ Git pull fehlgeschlagen!"; exit 1; }

# Fix file permissions before npm install
echo "🔧 Korrigiere Dateiberechtigungen..."
chown -R ricoapp:ricoapp "$PROJECT_DIR"
find "$PROJECT_DIR" -type d -exec chmod 755 {} \;
find "$PROJECT_DIR" -type f -exec chmod 644 {} \;
chmod +x "$PROJECT_DIR"/*.sh 2>/dev/null || true

# Clean npm cache to avoid permission issues
echo "🧹 Räume npm Cache auf..."
sudo -u ricoapp npm cache clean --force 2>/dev/null || true

# Ensure dotenv is installed
echo "📦 Prüfe dotenv..."
sudo -u ricoapp npm list dotenv --depth=0 &>/dev/null || sudo -u ricoapp npm install dotenv

# Install dependencies
echo "📦 npm install..."
sudo -u ricoapp npm install

# Enable PostgreSQL extensions
echo "🔍 PostgreSQL Extensions..."
sudo -u postgres psql -d ricocuba -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true
sudo -u postgres psql -d ricocuba -c "CREATE EXTENSION IF NOT EXISTS unaccent;" 2>/dev/null || true

# Clean dist folder
echo "🗑️  Lösche dist Ordner..."
rm -rf "$PROJECT_DIR/dist"

# Build
echo "🔨 npm run build..."
sudo -u ricoapp npm run build

# Update PM2 config
echo "⚙️  PM2 Config aktualisieren..."
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

# Restart PM2
echo "♻️  PM2 restart..."
if sudo -u ricoapp pm2 list | grep -q "rico-cuba"; then
    sudo -u ricoapp pm2 reload rico-cuba
else
    sudo -u ricoapp pm2 start "$PROJECT_DIR/ecosystem.config.cjs"
    sudo -u ricoapp pm2 save
fi

# Wait and check
sleep 3
echo ""
echo "✅ Update abgeschlossen!"
echo ""
echo "📊 Status:"
sudo -u ricoapp pm2 list | grep rico-cuba

echo ""
echo "📝 Logs:"
echo "   sudo -u ricoapp pm2 logs rico-cuba --lines 30"
echo ""
echo "👨‍💼 Admin erstellen:"
echo "   sudo -u ricoapp bash -c 'source <(grep -v \"^#\" .env | sed \"s/^/export /\") && npx tsx scripts/make-admin.ts'"
echo ""
