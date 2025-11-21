# Rico Scraper VPS Setup Tutorial

Vollständige Anleitung für die Installation des rico-scraper auf einem VPS parallel zu Rico-Cuba.

---

## Voraussetzungen

- Ubuntu/Debian VPS mit sudo-Rechten
- Rico-Cuba läuft bereits auf dem VPS
- Git installiert
- Python 3.11+ wird benötigt

---

## 1. System-Dependencies installieren

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Python 3.11+ installieren (falls nicht vorhanden)
sudo apt install -y python3 python3-pip python3-venv

# Firefox ESR für Selenium installieren
sudo apt install -y firefox-esr

# Geckodriver installieren
cd /tmp
wget https://github.com/mozilla/geckodriver/releases/download/v0.34.0/geckodriver-v0.34.0-linux64.tar.gz
tar -xvzf geckodriver-v0.34.0-linux64.tar.gz
sudo mv geckodriver /usr/local/bin/
sudo chmod +x /usr/local/bin/geckodriver
geckodriver --version  # Verifizieren
```

---

## 2. Git Repository clonen

```bash
# Als normaler User (z.B. ricoapp oder dein User)
cd /var/www  # Oder ein anderer Ort deiner Wahl

# Repository clonen (URL anpassen!)
sudo git clone https://github.com/YOUR_USERNAME/rico-scraper.git
sudo chown -R ricoapp:ricoapp rico-scraper
cd rico-scraper
```

---

## 3. Python Virtual Environment einrichten

```bash
cd /var/www/rico-scraper

# Virtual Environment erstellen
python3 -m venv venv

# Aktivieren
source venv/bin/activate

# Dependencies installieren
pip install --upgrade pip
pip install flask flask-socketio flask-sqlalchemy
pip install beautifulsoup4 lxml requests selenium webdriver-manager
pip install cloudscraper fake-useragent brotli
pip install psycopg2-binary  # Für PostgreSQL Support
pip install python-socketio eventlet  # Für WebSocket

# Falls pyproject.toml vorhanden ist:
pip install -e .
```

---

## 4. Konfiguration anpassen

### 4.1 App-Konfiguration prüfen

```bash
# app.py öffnen und Port prüfen (sollte 5000 sein)
nano app.py

# Stelle sicher, dass am Ende steht:
# socketio.run(app, host='0.0.0.0', port=5000, debug=False)
```

### 4.2 Umgebungsvariablen (optional)

```bash
# .env Datei erstellen (falls benötigt)
cat > .env << 'EOF'
FLASK_ENV=production
DATABASE_URL=sqlite:///revolico_customers.db
SECRET_KEY=dein_geheimer_schluessel_hier
EOF
```

---

## 5. Datenbank initialisieren

```bash
# Aktiviere Virtual Environment (falls noch nicht aktiv)
source venv/bin/activate

# Datenbank wird automatisch beim ersten Start erstellt
# Test: Python Shell starten
python3 << 'EOF'
from app import app, db
with app.app_context():
    db.create_all()
    print("✅ Datenbank erfolgreich erstellt!")
EOF
```

---

## 6. PM2 Setup für automatischen Start

### 6.1 PM2 Ecosystem Config erstellen

```bash
cat > ecosystem.scraper.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'rico-scraper',
    script: 'venv/bin/python',
    args: 'app.py',
    cwd: '/var/www/rico-scraper',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      FLASK_ENV: 'production',
      PYTHONUNBUFFERED: '1'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
EOF
```

### 6.2 Logs-Verzeichnis erstellen

```bash
mkdir -p logs
```

### 6.3 Mit PM2 starten

```bash
# Starten
pm2 start ecosystem.scraper.config.cjs

# Status prüfen
pm2 list

# Logs anschauen
pm2 logs rico-scraper

# Bei Systemstart automatisch starten
pm2 save
```

---

## 7. Nginx Reverse Proxy (Optional, aber empfohlen)

Falls du den Scraper von außen erreichbar machen willst:

```bash
# Nginx Config erstellen
sudo nano /etc/nginx/sites-available/rico-scraper

# Folgendes einfügen:
server {
    listen 80;
    server_name scraper.deine-domain.com;  # Anpassen!

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Config aktivieren
sudo ln -s /etc/nginx/sites-available/rico-scraper /etc/nginx/sites-enabled/

# Nginx testen und neu laden
sudo nginx -t
sudo systemctl reload nginx

# Optional: SSL mit Let's Encrypt
sudo certbot --nginx -d scraper.deine-domain.com
```

---

## 8. Rico-Cuba mit Scraper verbinden

### 8.1 Environment Variable in Rico-Cuba setzen

```bash
cd /var/www/CubaCuba

# .env bearbeiten
nano .env

# Diese Zeile hinzufügen:
SCRAPER_API_URL=http://localhost:5000
```

### 8.2 Rico-Cuba neu starten

```bash
pm2 restart rico-cuba
```

---

## 9. Testen & Verifizieren

### 9.1 Scraper Status prüfen

```bash
# Port 5000 prüfen
curl http://localhost:5000/api/status

# Sollte JSON zurückgeben wie:
# {"scraping_active":false,"whatsapp_active":false,...}
```

### 9.2 Von Rico-Cuba aus testen

```bash
# Im Rico-Cuba Admin Panel:
# 1. Login als Admin
# 2. Gehe zu "Revolico Import"
# 3. Klicke "Import starten"
# 4. Schaue ob Listings importiert werden
```

### 9.3 PM2 Status prüfen

```bash
pm2 list
# Sollte zeigen:
# rico-cuba     | online
# rico-scraper  | online

pm2 logs rico-scraper --lines 50
```

---

## 10. Wartung & Updates

### Git Pull & Neustart

```bash
cd /var/www/rico-scraper

# Backup erstellen (optional)
cp -r . ../rico-scraper-backup-$(date +%Y%m%d-%H%M%S)

# Git pull
git pull

# Dependencies aktualisieren
source venv/bin/activate
pip install --upgrade -r requirements.txt

# PM2 restart
pm2 restart rico-scraper

# Logs prüfen
pm2 logs rico-scraper
```

### Automatisches Update-Script erstellen

```bash
cat > update-scraper.sh << 'EOF'
#!/bin/bash
set -e

PROJECT_DIR="/var/www/rico-scraper"
cd "$PROJECT_DIR"

echo "🚀 Rico-Scraper Update gestartet..."

# Git pull
echo "📥 Git pull..."
git pull

# Activate venv
echo "🐍 Virtual Environment aktivieren..."
source venv/bin/activate

# Update dependencies
echo "📦 Dependencies aktualisieren..."
pip install --upgrade -r requirements.txt 2>/dev/null || pip install -e .

# Restart PM2
echo "♻️  PM2 restart..."
pm2 restart rico-scraper

sleep 2
echo ""
echo "✅ Update abgeschlossen!"
pm2 list | grep rico-scraper
EOF

chmod +x update-scraper.sh
```

---

## 11. Troubleshooting

### Scraper startet nicht

```bash
# Logs prüfen
pm2 logs rico-scraper --lines 100

# Manuell starten zum Debuggen
source venv/bin/activate
python app.py
# Fehler notieren
```

### Port 5000 bereits belegt

```bash
# Port prüfen
sudo lsof -i :5000

# Falls belegt, anderen Port in app.py verwenden:
# socketio.run(app, host='0.0.0.0', port=5001, ...)
# Dann auch SCRAPER_API_URL in Rico-Cuba anpassen!
```

### Firefox/Geckodriver Fehler

```bash
# Firefox prüfen
firefox-esr --version

# Geckodriver prüfen
geckodriver --version

# Neu installieren falls nötig (siehe Schritt 1)
```

### Datenbank-Fehler

```bash
# Datenbank neu erstellen
cd /var/www/rico-scraper
rm revolico_customers.db
source venv/bin/activate
python3 -c "from app import app, db; app.app_context().push(); db.create_all()"
```

### Permissions-Probleme

```bash
# Alle Dateien an ricoapp übergeben
sudo chown -R ricoapp:ricoapp /var/www/rico-scraper

# Logs-Verzeichnis beschreibbar machen
chmod 755 logs
```

---

## 12. Monitoring & Performance

### Ressourcen überwachen

```bash
# PM2 Monitoring
pm2 monit

# Speicher-Nutzung
pm2 list
```

### Logs rotieren (wichtig!)

```bash
# PM2 Log Rotation installieren
pm2 install pm2-logrotate

# Konfigurieren
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 13. Sicherheit

### Firewall

```bash
# Scraper nur von localhost erreichbar machen (empfohlen)
# Kein UFW-Port für 5000 öffnen!
# Rico-Cuba verbindet sich über localhost:5000
```

### Sichere Secrets

```bash
# SECRET_KEY in .env mit starkem Wert
openssl rand -hex 32
# Ergebnis in .env eintragen
```

---

## 14. Quick Commands Reference

```bash
# Scraper starten
pm2 start ecosystem.scraper.config.cjs

# Scraper stoppen
pm2 stop rico-scraper

# Scraper neu starten
pm2 restart rico-scraper

# Logs live anzeigen
pm2 logs rico-scraper --lines 100

# Status prüfen
pm2 list
curl http://localhost:5000/api/status

# Update durchführen
./update-scraper.sh
```

---

## 15. Checkliste nach Installation

- [ ] Python 3.11+ installiert
- [ ] Firefox ESR & Geckodriver installiert
- [ ] Git Repository geclont nach /var/www/rico-scraper
- [ ] Virtual Environment erstellt und Dependencies installiert
- [ ] Datenbank initialisiert
- [ ] PM2 Config erstellt und Scraper gestartet
- [ ] PM2 Status zeigt "online"
- [ ] API Status Endpoint antwortet (curl localhost:5000/api/status)
- [ ] SCRAPER_API_URL in Rico-Cuba .env gesetzt
- [ ] Rico-Cuba neu gestartet
- [ ] Import-Test im Admin Panel erfolgreich
- [ ] Logs sehen gut aus (keine Fehler)
- [ ] pm2 save ausgeführt (Autostart)

---

## Support & Weitere Infos

**Ports:**
- Rico-Cuba: Port 3000 (Node.js)
- Rico-Scraper: Port 5000 (Python Flask)

**Logs-Locations:**
- PM2: `~/.pm2/logs/`
- Scraper: `/var/www/rico-scraper/logs/`

**Wichtige Dateien:**
- `/var/www/rico-scraper/app.py` - Hauptanwendung
- `/var/www/rico-scraper/ecosystem.scraper.config.cjs` - PM2 Config
- `/var/www/CubaCuba/.env` - SCRAPER_API_URL

---

Viel Erfolg! 🚀
