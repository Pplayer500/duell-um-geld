# 🔧 PostgreSQL & Redis Setup für Railway

## Automatische Umgebungsvariablen von Railway

Wenn du PostgreSQL & Redis Plugins zu Railway hinzufügst, erstellt Railway **automatisch** diese Variablen:

### PostgreSQL Plugin
Railway erstellt automatisch:
- `DATABASE_URL` - Vollständige Verbindungszeichenfolge
- `PGUSER` - Benutzername
- `PGPASSWORD` - Passwort
- `PGHOST` - Host/Server
- `PGPORT` - Port (normalerweise 5432)
- `PGDATABASE` - Datenbankname

### Redis Plugin
Railway erstellt automatisch:
- `REDIS_URL` - Vollständige Verbindungszeichenfolge
- `REDIS_HOST` - Host/Server
- `REDIS_PORT` - Port (normalerweise 6379)
- `REDIS_PASSWORD` - Passwort (falls vorhanden)

## Schritte im Railway Dashboard

### 1. PostgreSQL hinzufügen
1. Gehe zu: https://railway.app/dashboard
2. Klick auf dein Projekt **"duell-um-geld"**
3. **"Add"** (rechts oben)
4. Wähle **"PostgreSQL"**
5. Railway erstellt automatisch einen PostgreSQL Service
6. ✅ Fertig! `DATABASE_URL` wird automatisch gesetzt

### 2. Redis hinzufügen
1. Klick auf **"Add"** (nochmal)
2. Wähle **"Redis"**
3. Railway erstellt automatisch einen Redis Service
4. ✅ Fertig! `REDIS_URL` wird automatisch gesetzt

### 3. Backend mit Datenbank verbinden
1. Klick auf den **"duell-um-geld"** Service (Backend)
2. Tab: **"Variables"**
3. Überprüfe, dass diese Variablen da sind:
   - ✅ `DATABASE_URL` (Automatisch von PostgreSQL)
   - ✅ `REDIS_URL` (Automatisch von Redis)
   - ✅ `API_HOST=0.0.0.0`
   - ✅ `API_PORT=8000`
   - ✅ `DEBUG=false`
4. Falls etwas fehlt, füge es manuell hinzu

### 4. Backend Upgrade
1. Im Backend Service Tab: **"Settings"**
2. Klick **"Redeploy"** (damit der Backend die neuen Variablen bekommt)
3. Warte bis Status **"Running"** ist

## Quick Reference: Was Railway automatisch macht

```
PostgreSQL Plugin aktivieren → DATABASE_URL ✅
Redis Plugin aktivieren → REDIS_URL ✅
Backend liest diese Variablen automatisch → Verbindung funktioniert ✅
```

## Troubleshooting

### "DATABASE_URL not found"
- PostgreSQL Plugin aktivieren (siehe oben)
- Backend redeploy
- Überprüfe Variables im Backend Service

### "Connection refused"
- PostgreSQL/Redis sind nicht "Running"
- Überprüfe Dashboard: beide sollten **grüne Checkmarks** haben
- Falls rot: Plugin-Fehler → kontaktiere Railway Support

### Backend-Test
```bash
# Logs checken
railway logs
```

Wenn du siehst:
```
[INFO] Database connected ✓
[INFO] Redis connected ✓
[INFO] Server running on http://0.0.0.0:8000
```

→ Alles funktioniert! 🎉
