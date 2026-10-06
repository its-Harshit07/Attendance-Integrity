# Frontend Deployment Documentation — Vercel

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5C — Public Deployment Readiness  
**Target Platform**: Vercel (React 19 + TypeScript + Vite)  

---

## 1. Vercel Configuration & Build Settings

The React 19 + TypeScript frontend application under `frontend/` is configured for independent deployment to Vercel.

### Project Build Settings in Vercel Dashboard
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`

---

## 2. Environment Variables Configuration

In the Vercel Project Settings -> Environment Variables tab, configure:

| Environment Variable | Value | Scope |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<render-backend-name>.onrender.com/api` | Production / Preview / Development |

---

## 3. Client-Side SPA Routing (`vercel.json`)

The file `frontend/vercel.json` provides rewrite rules for single-page application routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 4. Manual Deployment Instructions

To deploy via Vercel CLI from local terminal:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend from project root
cd frontend
vercel --prod
```

During setup, select `Root Directory: frontend` and set `VITE_API_BASE_URL` to your Render backend API URL.
