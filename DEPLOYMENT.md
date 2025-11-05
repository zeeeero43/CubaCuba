# Deployment Anleitung für Strato VPS

## Voraussetzungen

- Frischer VPS mit Ubuntu 22.04 oder 24.04
- Root-Zugriff oder sudo-Rechte
- Domain-Name (optional, aber empfohlen für SSL)

## 1. Server-Vorbereitung

### Als Root/mit sudo auf dem VPS einloggen:

```bash
ssh root@deine-server-ip
```

### System aktualisieren:

```bash
apt update && apt upgrade -y
```

### Firewall einrichten:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 2. Node.js installieren

```bash
# Node.js 22.x (LTS) installieren
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Überprüfen
node -v  # sollte v22.x.x zeigen
npm -v
```

## 3. PostgreSQL installieren und konfigurieren

```bash
# PostgreSQL installieren
apt install -y postgresql postgresql-contrib

# PostgreSQL starten
systemctl start postgresql
systemctl enable postgresql

# Datenbank und Benutzer erstellen
sudo -u postgres psql << EOF
CREATE DATABASE cubacuba;
CREATE USER cubacuba_user WITH PASSWORD 'dein_sicheres_password';
GRANT ALL PRIVILEGES ON DATABASE cubacuba TO cubacuba_user;
ALTER DATABASE cubacuba OWNER TO cubacuba_user;
\c cubacuba
GRANT ALL ON SCHEMA public TO cubacuba_user;
EOF
```

## 4. Projekt hochladen und konfigurieren

### Option A: Mit Git (empfohlen)

```bash
# Git installieren
apt install -y git

# Projektverzeichnis erstellen
mkdir -p /var/www
cd /var/www

# Repository klonen (ersetze mit deiner Repository-URL)
git clone https://github.com/dein-username/CubaCuba.git
cd CubaCuba
```

### Option B: Mit SCP/SFTP

Vom lokalen Rechner aus:
```bash
# Projekt-Ordner hochladen
scp -r /pfad/zu/CubaCuba root@deine-server-ip:/var/www/
```

### Umgebungsvariablen konfigurieren:

```bash
cd /var/www/CubaCuba

# .env Datei erstellen
cat > .env << 'EOF'
# Datenbank
DATABASE_URL=postgresql://cubacuba_user:dein_sicheres_password@localhost:5432/cubacuba

# Session Secret (generiere einen zufälligen String)
SESSION_SECRET=dein_sehr_langer_zufaelliger_string_mindestens_32_zeichen

# Node Environment
NODE_ENV=production

# Server Port (intern)
PORT=3000

# Optional: Object Storage (wenn du Google Cloud Storage verwendest)
# PUBLIC_OBJECT_SEARCH_PATHS=/bucket-name/public
# PRIVATE_OBJECT_DIR=/bucket-name/private

# Optional: OAuth (wenn du Social Login verwendest)
# GOOGLE_CLIENT_ID=deine_google_client_id
# GOOGLE_CLIENT_SECRET=dein_google_client_secret
# GOOGLE_CALLBACK_URL=https://deine-domain.de/api/auth/google/callback
# FACEBOOK_APP_ID=deine_facebook_app_id
# FACEBOOK_APP_SECRET=dein_facebook_app_secret
# FACEBOOK_CALLBACK_URL=https://deine-domain.de/api/auth/facebook/callback
EOF

# Sichere Berechtigungen setzen
chmod 600 .env
```

**Wichtig:** Generiere einen sicheren SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Dependencies installieren und Projekt bauen:

```bash
npm install
npm run db:push  # Datenbankschema erstellen
npm run build    # Projekt bauen
```

## 5. PM2 Process Manager installieren

```bash
# PM2 global installieren
npm install -g pm2

# Anwendung mit PM2 starten
cd /var/www/CubaCuba
pm2 start npm --name "cubacuba" -- start

# PM2 beim Systemstart automatisch starten
pm2 startup systemd
# Führe den Befehl aus, den PM2 dir anzeigt

# Aktuelle PM2-Konfiguration speichern
pm2 save
```

### Nützliche PM2 Befehle:

```bash
pm2 status              # Status anzeigen
pm2 logs cubacuba       # Logs anzeigen
pm2 restart cubacuba    # App neustarten
pm2 stop cubacuba       # App stoppen
pm2 reload cubacuba     # App neu laden (zero-downtime)
pm2 monit              # Monitoring
```

## 6. Nginx als Reverse Proxy einrichten

```bash
# Nginx installieren
apt install -y nginx

# Nginx-Konfiguration erstellen
cat > /etc/nginx/sites-available/cubacuba << 'EOF'
server {
    listen 80;
    server_name deine-domain.de www.deine-domain.de;

    # Erhöhe die Limits für File Uploads
    client_max_body_size 50M;

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

        # Timeouts für lange Requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support (falls benötigt)
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Konfiguration aktivieren
ln -s /etc/nginx/sites-available/cubacuba /etc/nginx/sites-enabled/

# Default-Seite deaktivieren
rm -f /etc/nginx/sites-enabled/default

# Nginx-Konfiguration testen
nginx -t

# Nginx starten
systemctl restart nginx
systemctl enable nginx
```

**Wichtig:** Ersetze `deine-domain.de` mit deiner echten Domain oder verwende die IP-Adresse für Tests.

## 7. SSL-Zertifikat mit Let's Encrypt (Optional aber empfohlen)

```bash
# Certbot installieren
apt install -y certbot python3-certbot-nginx

# SSL-Zertifikat erstellen (ersetze mit deiner Domain)
certbot --nginx -d deine-domain.de -d www.deine-domain.de

# Automatische Erneuerung testen
certbot renew --dry-run
```

Certbot konfiguriert Nginx automatisch für HTTPS!

## 8. Deployment-Updates

### Wenn du Code-Änderungen deployen möchtest:

```bash
cd /var/www/CubaCuba

# Neueste Änderungen holen (mit Git)
git pull

# Dependencies aktualisieren (falls nötig)
npm install

# Datenbank-Schema aktualisieren (falls geändert)
npm run db:push

# Neu bauen
npm run build

# App ohne Downtime neu laden
pm2 reload cubacuba

# Logs überprüfen
pm2 logs cubacuba --lines 50
```

### Backup-Strategie:

```bash
# Datenbank-Backup erstellen
pg_dump -U cubacuba_user cubacuba > backup_$(date +%Y%m%d_%H%M%S).sql

# Automatisches tägliches Backup einrichten
cat > /usr/local/bin/backup-cubacuba << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
pg_dump -U cubacuba_user cubacuba | gzip > $BACKUP_DIR/cubacuba_$(date +%Y%m%d_%H%M%S).sql.gz
# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "cubacuba_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-cubacuba

# Cronjob für tägliches Backup um 2 Uhr nachts
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-cubacuba") | crontab -
```

## 9. Monitoring und Logs

### System-Logs überwachen:

```bash
# Nginx-Logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PM2-Logs
pm2 logs cubacuba

# PostgreSQL-Logs
tail -f /var/log/postgresql/postgresql-*-main.log

# System-Ressourcen
htop  # (installiere mit: apt install htop)
```

### PM2 Web-Monitoring (optional):

```bash
pm2 install pm2-server-monit
```

## 10. Sicherheits-Tipps

### Fail2Ban installieren (schützt vor Brute-Force-Angriffen):

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### SSH absichern:

```bash
# /etc/ssh/sshd_config bearbeiten:
# - PasswordAuthentication no (nachdem SSH-Keys eingerichtet sind)
# - PermitRootLogin no (erstelle erst einen sudo-User)
# - Port 22 ändern zu einem custom Port

# SSH neu starten
systemctl restart sshd
```

### Regelmäßige Updates:

```bash
# Auto-Updates für Security-Patches
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

### Problem: App startet nicht

```bash
# Logs überprüfen
pm2 logs cubacuba --lines 100

# .env Datei überprüfen
cat /var/www/CubaCuba/.env

# Datenbankverbindung testen
psql -U cubacuba_user -d cubacuba -h localhost
```

### Problem: Nginx zeigt 502 Bad Gateway

```bash
# Überprüfe ob die App läuft
pm2 status

# Überprüfe ob Port 3000 offen ist
netstat -tlnp | grep 3000

# Nginx-Logs überprüfen
tail -f /var/log/nginx/error.log
```

### Problem: Datenbankmigrationen schlagen fehl

```bash
cd /var/www/CubaCuba

# Stelle sicher, dass DATABASE_URL korrekt ist
echo $DATABASE_URL

# Führe Migration manuell aus
npm run db:push
```

## Performance-Optimierung

### Node.js Memory Limit erhöhen (falls nötig):

```bash
# PM2-App mit mehr Memory starten
pm2 delete cubacuba
pm2 start npm --name "cubacuba" --max-memory-restart 1G -- start
pm2 save
```

### Nginx Caching aktivieren:

Füge in `/etc/nginx/sites-available/cubacuba` hinzu:
```nginx
# Cache für statische Assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 7d;
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

## Checkliste vor dem Go-Live

- [ ] Domain-DNS auf VPS-IP zeigt
- [ ] SSL-Zertifikat installiert
- [ ] Alle Umgebungsvariablen konfiguriert
- [ ] Datenbank-Backups eingerichtet
- [ ] Firewall aktiv und konfiguriert
- [ ] PM2 beim Boot automatisch startet
- [ ] Monitoring eingerichtet (PM2, Logs)
- [ ] OAuth-Callbacks (falls verwendet) auf Production-URL aktualisiert
- [ ] SESSION_SECRET ist sicher und zufällig
- [ ] PostgreSQL User hat sichere Passwörter
- [ ] SSH ist abgesichert
- [ ] Fail2Ban aktiv

## Support

Bei Problemen:
1. Überprüfe die Logs: `pm2 logs cubacuba`
2. Überprüfe den Server-Status: `pm2 status`
3. Überprüfe Nginx: `systemctl status nginx`
4. Überprüfe PostgreSQL: `systemctl status postgresql`
