# 🎲 Duell um Geld - Multiplayer Poker Game

Ein modernes, echtzeit-multiplayer Pokerspiel mit Fragen-Komponente, gebaut mit **FastAPI** + **React** + **WebSocket**.

> **Neu & Verbessert:** Komplett überarbeitete Version gegenüber dem ursprünglichen Streamlit-Projekt
> - ✅ Skalierbar für 50+ Spieler
> - ✅ Echte WebSocket-Kommunikation (kein Polling)
> - ✅ Moderne, anpassbare UI
> - ✅ Unabhängig vom Internet bei lokalem Hosting

## 🚀 Features

- **Echtzeit-Multiplayer** - Alle Spieler sehen Updates live
- **Poker-Mechanik** - Small/Big Blind, Betting Rounds, Folding, All-In
- **Fragen-Integration** - Spieler beantworten Fragen, gewinnen/verlieren Chips
- **Host-Kontrolle** - Host verwaltet Spieler, Chips, Fragen
- **Automatische Eliminierung** - Spieler mit 0 Chips werden automatisch eliminiert
- **Rankings** - Endplatzierung mit finalen Chip-Werten

## 📋 Anforderungen

- **Backend:** Python 3.11+
- **Frontend:** Node.js 18+
- **Optional:** Docker & Docker Compose für einfaches Deployment

## 🏗️ Projektstruktur

```
.
├── backend/
│   ├── app/
│   │   ├── models/          # Pydantic models
│   │   ├── routes/          # API endpoints
│   │   ├── websockets/      # WebSocket manager
│   │   ├── config.py        # Einstellungen
│   │   └── game_engine.py   # Kernlogik
│   ├── main.py              # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utility functions
│   │   ├── styles/          # CSS
│   │   ├── store/           # State management (Zustand)
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## ⚡ Quick Start (Development)

### Backend starten:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend läuft unter: `http://localhost:8000`

### Frontend starten (neues Terminal):

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft unter: `http://localhost:5173`

### Mit Docker Compose:

```bash
docker-compose up --build
```

Dann öffne `http://localhost:5173`

## 🌐 API-Dokumentation

### REST Endpoints:

- `POST /api/auth/login` - Login/Register
- `POST /api/game/create` - Spiel erstellen
- `POST /api/game/join` - Spiel beitreten
- `POST /api/game/start` - Spiel starten
- `POST /api/game/answer` - Frage beantworten
- `POST /api/game/bet` - Einsatz platzieren
- `GET /api/game/status/{game_id}` - Spielstatus
- `GET /api/game/rankings/{game_id}` - Platzierungen

### WebSocket:

```
ws://localhost:8000/ws/{game_id}/{player_id}

Message Format:
{
  "type": "bet" | "fold" | "answer" | "action",
  "data": {...}
}
```

## 🎮 Gameplay

### Für Spieler:
1. Login mit Namen
2. Host-Code eingeben oder auf Einladung warten
3. Chips erhalten
4. Frage beantworten
5. Pokerhand spielen (Bet, Fold, All-In)
6. Rankings sehen

### Für Host:
1. Login mit Host-Passwort: `Passwort`
2. Spiel erstellen
3. Spieler hinzufügen
4. Chips-Sets konfigurieren
5. Fragen verwalten
6. Poker-Runden steuern
7. Rankings anzeigen

## 🔧 Konfiguration

### Backend (.env):

```
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
DATABASE_URL=sqlite:///./game.db
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:5173
```

### Game Parameters:

```python
# In app/game_engine.py
- small_blind_initial: 10
- big_blind_initial: 20
- raise_percent: 100 (Blinds erhöhen sich um 100% alle 2 Fragen)
- max_rounds: 20
```

## 📦 Dependencies

### Backend:
- FastAPI - Web framework
- Uvicorn - ASGI server
- Pydantic - Data validation
- SQLAlchemy - ORM (optional)
- Redis - Caching (optional)

### Frontend:
- React 18 - UI library
- Vite - Build tool
- Axios - HTTP client
- Zustand - State management
- CSS3 - Styling

## 🚀 Deployment

### Mit DigitalOcean:

1. VPS erstellen ($6/Mo)
2. Docker installieren
3. Repository clonen
4. `docker-compose up -d` ausführen
5. Domain konfigurieren (optional)

### Mit Heroku:

```bash
heroku login
heroku create your-app-name
git push heroku main
```

## 📝 Lizenz

MIT - Gerne verwenden!

## 🤝 Beiträge

Issues und Pull Requests sind willkommen!

## 📧 Support

Für Fragen: marc@example.com

---

**Viel Spaß beim Spielen! 🎲♠️♥️♦️♣️**
