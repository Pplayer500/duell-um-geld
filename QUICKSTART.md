# 🚀 Duell um Geld - Quick Start Guide

## ✅ Was wurde erstellt:

### **Backend (FastAPI + WebSocket)**
- ✅ Game Engine mit vollständiger Poker-Logik
- ✅ WebSocket-Manager für Echtzeit-Updates
- ✅ REST-API für alle Spieloperationen
- ✅ Pydantic Models für Type Safety
- ✅ CORS-Middleware

### **Frontend (React + Vite)**
- ✅ Login-Page mit Host-Authentifizierung
- ✅ Lobby zum Spiel-Setup
- ✅ Poker Table mit Action Buttons
- ✅ Zustand State Management
- ✅ Custom WebSocket Hook
- ✅ Responsive CSS Design

### **Devops**
- ✅ Docker & Docker Compose Setup
- ✅ .env Konfiguration
- ✅ .gitignore für Git

---

## 🎮 Lokales Testen (2 Terminals erforderlich)

### Terminal 1 - Backend (läuft bereits):
```bash
cd backend
python run.py
# Läuft unter http://localhost:8000
```

**Info:** Der Backend ist BEREITS LAUFEND!
- API Docs: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json
- Health Check: http://localhost:8000/health

### Terminal 2 - Frontend (noch nicht gestartet):
```bash
cd frontend
npm install
npm run dev
# Läuft unter http://localhost:5173
```

---

## 🎲 Gameplay testen

### 1. **Host erstellen:**
- URL: http://localhost:5173
- Name: "Host" (oder beliebig)
- Host-Passwort: `Passwort`
- → Lobby wird geöffnet

### 2. **Spieler hinzufügen:**
- Neuer Browser/Tab
- Name: "Spieler 1"
- Passwort: (leer lassen)
- → Spiel beitreten

### 3. **Spiel starten:**
- Host klickt "Spiel starten" wenn ≥2 Spieler
- → Poker Table wird angezeigt

---

## 📁 Dateistruktur Übersicht

```
D:\Neuer Ordner/
├── backend/
│   ├── app/
│   │   ├── models/          # Datenmodelle
│   │   │   ├── game.py
│   │   │   ├── player.py
│   │   │   └── question.py
│   │   ├── routes/          # API Endpoints
│   │   │   ├── auth.py
│   │   │   └── game.py
│   │   ├── websockets/      # Real-time
│   │   │   └── manager.py
│   │   ├── config.py        # Settings
│   │   └── game_engine.py   # Kernlogik
│   ├── main.py              # FastAPI App
│   ├── run.py               # Startup Script
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # React Pages
│   │   │   ├── Login.jsx
│   │   │   ├── GameLobby.jsx
│   │   │   └── PokerTable.jsx
│   │   ├── components/      # React Components
│   │   ├── hooks/           # Custom Hooks
│   │   │   └── useWebSocket.js
│   │   ├── utils/           # Utilities
│   │   │   └── api.js
│   │   ├── store/           # State (Zustan)
│   │   │   └── gameStore.js
│   │   ├── styles/          # CSS
│   │   │   ├── global.css
│   │   │   ├── login.css
│   │   │   ├── lobby.css
│   │   │   └── poker.css
│   │   └── App.jsx
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml       # Docker Setup
├── .env                     # Environment Variables
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 WebSocket-Kommunikation

### Client → Server:
```javascript
{
  "type": "bet",
  "data": { "amount": 100 }
}
```

### Server → Client:
```javascript
{
  "type": "player_action",
  "player_id": "xxx",
  "action": "bet",
  "amount": 100
}
```

---

## 🐳 Mit Docker (Optional)

```bash
# Beide Services starten
docker-compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

---

## 📝 Nächste Schritte

1. **Frontend starten** (Terminal 2):
   ```bash
   cd frontend && npm install && npm run dev
   ```

2. **Testen:**
   - Host erstellen
   - Spieler beitreten
   - Spiel starten
   - Poker spielen!

3. **Erwiterungen:**
   - Fragen aus JSON laden
   - Chip-Management verbessern
   - Mobile-responsives Design
   - Sound/Animationen
   - Persistente Datenbank (PostgreSQL statt SQLite)

---

## ⚠️ Known Issues & Fixes

### "WebSocket connection failed"
- Backend muss auf 0.0.0.0 laufen (nicht 127.0.0.1 im Browser)
- Oder Proxy in vite.config.js prüfen

### "CORS Error"
- Sichere `CORS_ORIGINS` in `.env` sind set
- Frontend URL muss in Liste sein

### "Port 8000/5173 already in use"
```bash
# Killed process findender finden und beenden
lsof -i :[PORT]
kill -9 [PID]
```

---

## 💡 Tipps

- **Hot Reload:** Sicherstelle `npm run dev` im Frontend
- **API Docs:** Gehe zu http://localhost:8000/docs während Backend läuft
- **Browser DevTools:** F12 → Network → WS tabs um WebSocket-Messages zu sehen
- **Logs:** Pro Terminal laufen -  Backend-Logs rechts, Frontend-Logs links

---

**Viel Erfolg! 🎲**
