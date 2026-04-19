# Backend Deployment Guide

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository connection enabled
- Backend code pushed to GitHub

## Local Setup (before deployment)

1. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

2. **Update .env with local values:**
   ```env
   DATABASE_URL=sqlite:///./game.db
   DEBUG=True
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run locally:**
   ```bash
   python run.py
   ```
   Or directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Railway Deployment

### Step 1: Connect GitHub Repository

1. Go to https://railway.app/dashboard
2. Create new project
3. Select "Deploy from GitHub"
4. Choose repository: `Pplayer500/duell-um-geld`
5. Select only the `backend/` folder:
   - In deployment settings, set **Root Directory** to `backend/`

### Step 2: Add PostgreSQL Database

1. In Railway project, click **+ Add Service**
2. Select **PostgreSQL**
3. Railway automatically creates `DATABASE_URL` environment variable

### Step 3: Configure Environment Variables

In Railway project Variables tab, set:

```
SECRET_KEY=your-very-long-random-secret-key-here-2024
HOST_PASSWORD=Passwort
FRONTEND_URL=https://duell-um-geld.vercel.app
DEBUG=False
```

Railway will automatically provide:
- `DATABASE_URL` (from PostgreSQL service)
- `RAILWAY_ENVIRONMENT_NAME` (set by Railway)
- `PORT` (set by Railway, defaults to 8000)

### Step 4: Configure Build & Deploy

Railway should auto-detect Python and run:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: Will use `Dockerfile`

If not auto-detected:
1. Go to project **Settings**
2. Set **Build Command**: `pip install -r requirements.txt`
3. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 5: Deploy

1. Push changes to GitHub `main` branch
2. Railway automatically deploys on git push
3. View deployment status in Railway dashboard

## Verify Deployment

Once deployed:

1. Get the Railway domain (e.g., `https://backend-prod-2024.railway.app`)
2. Test health endpoint:
   ```bash
   curl https://backend-prod-2024.railway.app/health
   ```

3. Update frontend `.env` or API URL to point to Railway backend:
   ```javascript
   // In frontend/src/services/api.js or where API_BASE_URL is defined
   const API_BASE_URL = process.env.REACT_APP_API_URL || "https://your-railway-domain.railway.app";
   ```

4. Redeploy frontend to Vercel

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL service is running in Railway
- Check DATABASE_URL format in variables
- Ensure tables are created (app will auto-create on startup)

### Port Issues
- Railway sets `PORT` environment variable automatically
- Do NOT hardcode port numbers
- Use `int(os.getenv("PORT", 8000))` in code

### CORS Issues
- Check `CORS_ORIGINS` in `app/config.py`
- Frontend URL must be in allowed list
- Update after frontend URL changes

### Build Fails
- Check **Dockerfile** exists in root directory
- Verify `requirements.txt` lists all dependencies
- Check build logs in Railway dashboard

## Rollback

If deployment has issues:
1. Go to Railway deployment history
2. Click **Redeploy** on previous working version
3. Or push fix to GitHub to trigger new deployment

## CI/CD Pipeline

The setup uses:
- **GitHub** → Source control
- **Railway** → Auto-deploys on git push to `main` branch
- **Vercel** → Frontend (already deployed)

Just do: `git push` → Everything redeploys! 🚀
