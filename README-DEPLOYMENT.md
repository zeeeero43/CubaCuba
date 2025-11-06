# 🚀 Rico-Cuba VPS Deployment Guide

Vollständige Anleitung zum Deployment von Rico-Cuba auf einem Ubuntu 22.04 VPS.

---

## 📋 Voraussetzungen

### Server-Anforderungen
- **OS:** Ubuntu 22.04 LTS (empfohlen)
- **Min. Specs:** 8 vCores, 32 GB RAM, 480 GB SSD
- **Empfohlen:** 16 vCores, 64 GB RAM, 960 GB SSD (für Zukunftssicherheit)
- **Root-Zugriff:** SSH-Zugriff mit sudo/root-Rechten

### Externe Services
- **DeepSeek API Key** (ERFORDERLICH!)
  - Registriere dich auf: https://platform.deepseek.com
  - Erstelle einen API Key unter "API Keys"
  - Ohne diesen Key funktioniert die App NICHT!

### Lokale Werkzeuge
- Git
- SSH Client
- (Optional) FileZilla oder rsync für File-Upload

---

## 🎯 Deployment-Prozess (Schnellstart)

### Option 1: Automatisches Setup (Empfohlen)

```bash
# 1. Mit VPS verbinden
ssh root@deine-server-ip

# 2. Projekt-Verzeichnis erstellen
mkdir -p /var/www/rico-cuba

# 3. Projekt auf VPS hochladen (von deinem lokalen Rechner)
# Option A: Git Clone
cd /var/www
git clone https://github.com/dein-username/rico-cuba.git

# Option B: rsync (falls du keinen Git Remote hast)
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  /pfad/zu/lokalem/projekt/ root@deine-server-ip:/var/www/rico-cuba/

# 4. Setup-Script ausführbar machen und starten
cd /var/www/rico-cuba
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```

Das war's! 🎉 Das Script macht alles automatisch:
- ✅ System-Update & Firewall
- ✅ Node.js 22 & PostgreSQL Installation
- ✅ Datenbank-Konfiguration
- ✅ Environment Variables
- ✅ Dependencies & Build
- ✅ PM2 Process Manager
- ✅ Nginx Reverse Proxy
- ✅ SSL-Zertifikat (optional)
- ✅ Automatische Backups

---

## 📝 Detaillierte Schritt-für-Schritt-Anleitung

### Schritt 1: VPS vorbereiten

```bash
# Mit VPS verbinden
ssh root@deine-server-ip

# System aktualisieren
apt update && apt upgrade -y

# Basis-Tools installieren (falls nicht vorhanden)
apt install -y git curl wget
```

### Schritt 2: Projekt hochladen

#### Via Git (Empfohlen)
```bash
cd /var/www
git clone https://github.com/dein-username/rico-cuba.git
cd rico-cuba
```

#### Via rsync (Alternativ)
```bash
# Auf deinem lokalen Rechner ausführen
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  /pfad/zu/rico-cuba/ root@SERVER_IP:/var/www/rico-cuba/
```

#### Via SFTP (FileZilla)
1. Verbinde zu `SERVER_IP` Port 22
2. Lade alle Files nach `/var/www/rico-cuba/` hoch
3. Überspringe `node_modules` und `dist` Ordner

### Schritt 3: WICHTIGE Code-Änderung VOR dem Setup

⚠️ **KRITISCH:** Bearbeite `vite.config.ts` VOR dem Setup-Script!

```bash
nano /var/www/rico-cuba/vite.config.ts
```

Ändere Zeilen 7-21 von:

```typescript
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),  // <- PROBLEM: Läuft auch in Production!
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer")...
```

Zu:

```typescript
export default defineConfig({
  plugins: [
    react(),
    // WICHTIG: Alle Replit-Plugins nur in Development
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          runtimeErrorOverlay(),  // <- Hierhin verschoben!
          await import("@replit/vite-plugin-cartographer")...
```

Speichern: `STRG+O`, `Enter`, `STRG+X`

**Warum?** Replit-Plugins funktionieren nur auf Replit. In Production würden sie Fehler werfen.

### Schritt 4: Setup-Script ausführen

```bash
cd /var/www/rico-cuba
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```

Das Script fragt dich nach:
1. **DeepSeek API Key** (WICHTIG!)
2. Domain (optional, sonst wird Server-IP verwendet)
3. SSL-Zertifikat (empfohlen bei Domain)

**Notiere alle Credentials die angezeigt werden!** Sie werden nur einmal angezeigt.

### Schritt 5: Erste Schritte nach Setup

```bash
# App-Status prüfen (PM2 läuft unter ricoapp)
sudo -u ricoapp pm2 status

# Live-Logs ansehen
sudo -u ricoapp pm2 logs rico-cuba

# System-Ressourcen überwachen
htop
```

**App testen:**
- Öffne Browser: `http://DEINE-SERVER-IP` oder `https://DEINE-DOMAIN`
- Registriere ersten Admin-Account
- Erstelle Test-Anzeige (prüft DeepSeek AI-Moderation)

---

## 🔧 Nach dem Setup

### DeepSeek API Key nachträglich hinzufügen (falls übersprungen)

```bash
nano /var/www/rico-cuba/.env
```

Setze:
```
DEEPSEEK_API_KEY=sk-dein-api-key-hier
```

Speichern und App neustarten:
```bash
sudo -u ricoapp pm2 restart rico-cuba
```

### SSL-Zertifikat nachträglich einrichten

```bash
# Certbot installieren (falls nicht geschehen)
apt install -y certbot python3-certbot-nginx

# Zertifikat erstellen
certbot --nginx -d deine-domain.com -d www.deine-domain.com

# Auto-Renewal testen
certbot renew --dry-run
```

### Firewall-Regeln prüfen

```bash
ufw status verbose
```

Sollte zeigen:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (OpenSSH)          ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

---

## 🔄 Updates deployen

### Automatisches Update-Script (Empfohlen)

```bash
cd /var/www/rico-cuba
sudo ./update-vps.sh
```

**Wichtig:** Script muss als root ausgeführt werden! Es führt intern alle npm/pm2 Befehle sicher als ricoapp User aus.

Das Script:
- ✅ Erstellt automatisches Backup
- ✅ Pulled neuesten Code (Git)
- ✅ Installiert Dependencies (als ricoapp User)
- ✅ Migriert Datenbank (falls nötig)
- ✅ Baut Projekt neu (als ricoapp User)
- ✅ Reload mit Zero-Downtime (PM2 unter ricoapp)

### Manuelles Update

```bash
cd /var/www/rico-cuba

# 1. Backup erstellen (als root)
sudo /usr/local/bin/backup-rico-cuba

# 2. Code aktualisieren
git pull

# 3. Dependencies aktualisieren (als ricoapp User!)
sudo -u ricoapp npm install

# 4. Datenbank migrieren (als ricoapp User!)
sudo -u ricoapp npm run db:push

# 5. Neu bauen (als ricoapp User!)
sudo -u ricoapp npm run build

# 6. App neu laden (PM2 unter ricoapp!)
sudo -u ricoapp pm2 reload rico-cuba
```

**Wichtig:** Alle npm und pm2 Befehle müssen als ricoapp User ausgeführt werden, nicht als root!

---

## 💾 Backup & Restore

### Automatische Backups

Sind bereits konfiguriert (täglich 3 Uhr):
```bash
# Manuelles Backup erstellen
/usr/local/bin/backup-rico-cuba

# Backup-Location
ls -lh /root/backups/rico-cuba/
```

### Datenbank wiederherstellen

```bash
# Liste verfügbare Backups
ls -lh /root/backups/rico-cuba/

# Restore aus Backup (komprimiert)
PGPASSWORD=dein-db-password \
gunzip < /root/backups/rico-cuba/ricocuba_20250101_030000.sql.gz | \
psql -h localhost -U ricocuba_user ricocuba

# Alternative: Mit zcat
zcat /root/backups/rico-cuba/ricocuba_20250101_030000.sql.gz | \
PGPASSWORD=dein-db-password psql -h localhost -U ricocuba_user ricocuba
```

### Uploads wiederherstellen

```bash
# Backup entpacken
tar -xzf /root/backups/rico-cuba/uploads_20250101_030000.tar.gz -C /var/www/rico-cuba/
```

---

## 📊 Monitoring & Logs

### App-Logs

```bash
# Live-Logs anzeigen (PM2 läuft unter ricoapp)
sudo -u ricoapp pm2 logs rico-cuba

# Letzte 100 Zeilen
sudo -u ricoapp pm2 logs rico-cuba --lines 100

# Nur Error-Logs
sudo -u ricoapp pm2 logs rico-cuba --err

# Log-File direkt (App läuft als ricoapp User)
sudo tail -f /home/ricoapp/.pm2/logs/rico-cuba-out.log
sudo tail -f /home/ricoapp/.pm2/logs/rico-cuba-error.log
```

### Nginx-Logs

```bash
# Access Log (alle Requests)
tail -f /var/log/nginx/access.log

# Error Log (nur Fehler)
tail -f /var/log/nginx/error.log

# Log-Analyse
cat /var/log/nginx/access.log | grep "POST /api/listings"
```

### System-Monitoring

```bash
# Interaktiv
htop

# CPU & RAM
top

# Disk Space
df -h

# Network Connections
netstat -tulpn | grep :3000
```

### PM2 Monitoring

```bash
# Status-Übersicht (PM2 läuft unter ricoapp)
sudo -u ricoapp pm2 status

# Monitoring Dashboard
sudo -u ricoapp pm2 monit

# CPU/RAM Historie
sudo -u ricoapp pm2 describe rico-cuba
```

---

## 🔒 Sicherheit

### Empfohlene Härtungsmaßnahmen

#### 1. SSH-Zugriff absichern

```bash
nano /etc/ssh/sshd_config
```

Ändere:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart:
```bash
systemctl restart sshd
```

#### 2. Fail2Ban-Konfiguration prüfen

```bash
# Status prüfen
fail2ban-client status

# Gebannte IPs anzeigen
fail2ban-client status sshd
```

#### 3. Automatische Security-Updates

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

#### 4. PostgreSQL Hardening

```bash
nano /etc/postgresql/*/main/pg_hba.conf
```

Stelle sicher:
```
local   all   ricocuba_user   scram-sha-256
host    all   all   127.0.0.1/32   scram-sha-256
```

Restart:
```bash
systemctl restart postgresql
```

---

## 🐛 Troubleshooting

### Problem: App startet nicht

```bash
# Logs prüfen (PM2 läuft unter ricoapp)
sudo -u ricoapp pm2 logs rico-cuba --err --lines 50

# Häufige Ursachen:
# 1. DATABASE_URL falsch
grep DATABASE_URL /var/www/rico-cuba/.env

# 2. Port 3000 belegt
netstat -tulpn | grep :3000

# 3. Dependencies fehlen
cd /var/www/rico-cuba && sudo -u ricoapp npm install
```

### Problem: 502 Bad Gateway (Nginx)

```bash
# App läuft? (PM2 unter ricoapp)
sudo -u ricoapp pm2 status

# Nginx läuft?
systemctl status nginx

# Nginx Error Log
tail -f /var/log/nginx/error.log

# Fix: Restart beider Services
sudo -u ricoapp pm2 restart rico-cuba
systemctl restart nginx
```

### Problem: Datenbank-Verbindung fehlgeschlagen

```bash
# PostgreSQL läuft?
systemctl status postgresql

# Credentials prüfen
cat /var/www/rico-cuba/.env | grep DATABASE_URL

# Manuell testen
psql -U ricocuba_user -d ricocuba -h localhost
```

### Problem: DeepSeek API Fehler

```bash
# API Key prüfen
grep DEEPSEEK_API_KEY /var/www/rico-cuba/.env

# Test-Request
curl -X POST "https://api.deepseek.com/v1/chat/completions" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

### Problem: Uploads funktionieren nicht

```bash
# Verzeichnis existiert?
ls -la /var/www/rico-cuba/uploads

# Berechtigungen prüfen
stat /var/www/rico-cuba/uploads

# Fix Permissions (App läuft als ricoapp, NICHT www-data!)
chown -R ricoapp:ricoapp /var/www/rico-cuba/uploads
chmod 755 /var/www/rico-cuba/uploads
```

---

## 📈 Performance-Optimierung

### Nginx Caching aktivieren

```bash
nano /etc/nginx/sites-available/rico-cuba
```

Füge hinzu:
```nginx
# Cache-Zone definieren
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=rico_cache:10m max_size=1g inactive=60m;

server {
    # ... bestehende Config

    location /api/listings {
        proxy_cache rico_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key "$request_uri";
        proxy_pass http://localhost:3000;
    }
}
```

### PostgreSQL Performance Tuning

```bash
nano /etc/postgresql/*/main/postgresql.conf
```

Für 32 GB RAM Server:
```
shared_buffers = 8GB
effective_cache_size = 24GB
maintenance_work_mem = 2GB
work_mem = 128MB
max_connections = 200
```

Restart:
```bash
systemctl restart postgresql
```

### PM2 Cluster Mode (für höhere Last)

```bash
sudo -u ricoapp pm2 delete rico-cuba
sudo -u ricoapp pm2 start npm --name "rico-cuba" -i 4 -- start
sudo -u ricoapp pm2 save
```

---

## 🎯 Production Checklist

Vor Go-Live prüfen:

- [ ] ✅ DeepSeek API Key gesetzt und funktioniert
- [ ] ✅ SSL-Zertifikat installiert (HTTPS)
- [ ] ✅ Firewall aktiviert (nur 22, 80, 443)
- [ ] ✅ Fail2Ban läuft
- [ ] ✅ Automatische Backups konfiguriert (täglich 3 Uhr)
- [ ] ✅ PostgreSQL läuft und ist erreichbar
- [ ] ✅ PM2 Auto-Restart konfiguriert
- [ ] ✅ Nginx Reverse Proxy funktioniert
- [ ] ✅ Upload-Verzeichnis Permissions korrekt (755)
- [ ] ✅ Environment Variables korrekt (.env)
- [ ] ✅ SSH Root-Login deaktiviert
- [ ] ✅ Monitoring eingerichtet (pm2 monit, htop)
- [ ] ✅ Domain DNS konfiguriert (A-Record)
- [ ] ✅ Email-Benachrichtigungen (optional)
- [ ] ✅ Erste Test-Anzeige erfolgreich erstellt

---

## 📞 Support & Weitere Ressourcen

### Nützliche Befehle (Quick Reference)

```bash
# App Management (PM2 läuft unter ricoapp!)
sudo -u ricoapp pm2 status                    # Status anzeigen
sudo -u ricoapp pm2 logs rico-cuba            # Live-Logs
sudo -u ricoapp pm2 restart rico-cuba         # Neustart
sudo -u ricoapp pm2 reload rico-cuba          # Zero-Downtime Reload
sudo -u ricoapp pm2 monit                     # Monitoring Dashboard

# Backups
/usr/local/bin/backup-rico-cuba  # Manuelles Backup
ls /root/backups/rico-cuba/      # Backups anzeigen

# Updates
sudo ./update-vps.sh                           # Automatisches Update
sudo -u ricoapp bash -c 'git pull && npm run build'  # Manuelles Update

# Logs
tail -f /var/log/nginx/error.log           # Nginx Errors
sudo -u ricoapp pm2 logs rico-cuba --err   # App Errors
tail -f /var/log/rico-cuba-backup.log      # Backup Log

# System
htop                          # Ressourcen-Monitor
df -h                         # Disk Space
systemctl status postgresql   # DB Status
systemctl status nginx        # Nginx Status
```

### Wichtige Dateien & Pfade

| Datei/Pfad | Beschreibung |
|------------|--------------|
| `/var/www/rico-cuba/` | Projekt-Root |
| `/var/www/rico-cuba/.env` | Environment Variables |
| `/var/www/rico-cuba/uploads/` | Hochgeladene Bilder |
| `/root/backups/rico-cuba/` | Backup-Verzeichnis |
| `/etc/nginx/sites-available/rico-cuba` | Nginx Config |
| `/home/ricoapp/.pm2/logs/` | PM2 Log-Files (App läuft als ricoapp) |
| `/var/log/nginx/` | Nginx Logs |

---

## 🎉 Fertig!

Deine Rico-Cuba Plattform läuft jetzt auf deinem VPS!

**Nächste Schritte:**
1. Registriere ersten Admin-Account
2. Erstelle Test-Anzeige
3. Konfiguriere Kategorien
4. Aktiviere gewünschte Features
5. Teile die URL! 🚀

Bei Fragen oder Problemen:
- Prüfe die Troubleshooting-Sektion
- Schau in die Logs: `pm2 logs rico-cuba`
- Überprüfe die System-Ressourcen: `htop`

Viel Erfolg! 🇨🇺
