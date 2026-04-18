# 🚀 Railroad Deployment Anleitung

## Multi-Service Setup

Dieses Projekt wird auf Railway mit 4 Services bereitgestellt:
1. **Backend** - FastAPI (Port 8000)
2. **Frontend** - React + Nginx (Port 3000)
3. **PostgreSQL** - Datenbank
4. **Redis** - Caching & WebSockets

## Schritt-für-Schritt Setup in Railroad

### 1. **Backend Service**
- **Von GitHub deployen**: `Pplayer500/duell-um-geld`
- **Root Path**: `/` (nutzt Haupten Dockerfile)
- **Port**: 8000
- **Build Command**: Automatisch (Docker)

### 2. **Frontend Service** (Neuer Service im gleichen Projekt)
- **Von GitHub deployen**: Selbes Repository
- **Dockerfile Path**: `frontend/Dockerfile`
- **Port**: 3000
- **Build Command**: Automatisch

### 3. **PostgreSQL** (Plugin)
- **Railway Plugin hinzufügen**: PostgreSQL
- **Standard Konfiguration verwenden**
- **Auto-generierte Variablen**:
  - `DATABASE_URL` → Backend
  - `PGUSER`, `PGPASSWORD`, etc.

### 4. **Redis** (Plugin)
- **Railway Plugin hinzufügen**: Redis
- **Standard Konfiguration verwenden**
- **Auto-generierte Variablen**:
  - `REDIS_URL` → Backend

## Environment Variables

### Backend braucht:
```
DATABASE_URL=<PostgreSQL URL (auto)>
REDIS_URL=<Redis URL (auto)>
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
FRONTEND_URL=https://[your-frontend-domain]
```

### Frontend braucht:
```
VITE_API_URL=https://[your-backend-domain]:8000
```

## Verknüpfung

Railway verknüpft Services automatisch:
1. Backend → PostgreSQL (über DATABASE_URL)
2. Backend → Redis (über REDIS_URL)
3. Frontend → Backend (über VITE_API_URL)

## Deployment-Reihenfolge

1. PostgreSQL Service starten
2. Redis Service starten
3. Backend Service starten (wartet auf Datenbank)
4. Frontend Service starten (fragt Backend ab)

## Testen

```bash
# Backend Health Check
curl https://[backend-domain]:8000/health

# Frontend
https://[frontend-domain]
```

## Rollback

Jeder Service kann unabhängig zurückgerollt werden.
