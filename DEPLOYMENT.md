# 🚀 InsightSuite - Deployment Guide

Guida completa per il deployment di InsightSuite su Vercel e integrazione con portfolio.

## 📋 **Indice**

1. [Deployment Setup](#deployment-setup)
2. [Portfolio Integration](#portfolio-integration)
3. [Environment Variables](#environment-variables)
4. [Domain Configuration](#domain-configuration)
5. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## 🌐 **Deployment Setup**

### **Vercel Deployment**

```bash
# 1. Install Vercel CLI
pnpm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
vercel --prod
```

### **GitHub Integration**
1. **Push to GitHub**: Assicurati che il codice sia su GitHub
2. **Import in Vercel**: Dashboard → New Project → Import da GitHub
3. **Auto-deployment**: Ogni push su `main` triggera un deploy automatico

### **Build Configuration**
Vercel automaticamente detecta:
- **Framework**: Next.js (frontend)  
- **Functions**: Python serverless functions (backend)
- **Build Command**: `pnpm build` (automatico)
- **Install Command**: `pnpm install` (automatico)

---

## 🔗 **Portfolio Integration**

### **vercel.json per Portfolio**

Crea questo file nel tuo **progetto portfolio** (NON in InsightSuite):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/InsightSuite/api/:path*",
      "destination": "https://v0-insight-suite.vercel.app/api/:path*"
    },
    {
      "source": "/InsightSuite/health",
      "destination": "https://v0-insight-suite.vercel.app/health"
    },
    {
      "source": "/InsightSuite/docs",
      "destination": "https://v0-insight-suite.vercel.app/docs"
    },
    {
      "source": "/InsightSuite/openapi.json",
      "destination": "https://v0-insight-suite.vercel.app/openapi.json"
    },
    {
      "source": "/InsightSuite/:path*",
      "destination": "https://v0-insight-suite.vercel.app/:path*"
    }
  ],
  "headers": [
    {
      "source": "/InsightSuite/(.*)",
      "headers": [
        {
          "key": "X-Proxy-Pass",
          "value": "InsightSuite"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-Requested-With"
        }
      ]
    }
  ]
}
```

### **Caratteristiche della Configurazione**
- ✅ **Specifico per InsightSuite**: Solo `/InsightSuite/*` viene intercettato
- ✅ **API Portfolio Protette**: Le tue API `/api/*` del portfolio non vengono toccate
- ✅ **Future-proof**: Nuove API del portfolio funzioneranno normalmente
- ✅ **CORS Completo**: Headers configurati per cross-domain

---

## ⚙️ **Environment Variables**

### **InsightSuite Project (Vercel)**

```bash
# API Keys (Required)
VOYAGE_API_KEY=pa-7p_QDMxkrP35uqgLkL-Ct0Q1vwCa-uP5Do7x5JdTyUX
ANTHROPIC_API_KEY=sk-ant-api03-RoOl_ey5zRHxwjsbP0HLD2ipNgLaXzHvQIOYjKmoeRjQ...
VOYAGE_MODEL=voyage-3.5-lite
ANTHROPIC_MODEL=claude-3-5-sonnet

# Redis/KV (Optional - for caching)
KV_REST_API_TOKEN=Ac3vAAIncDFiZTc1ZTJiZmQ1ZjQ0ODZi...
KV_REST_API_URL=https://content-magpie-52719.upstash.io
KV_URL=rediss://default:Ac3vAAIncDFiZTc1ZTJi...

# Environment
ENVIRONMENT=production
VERCEL_ENV=production
```

### **Come Configurare in Vercel**
1. **Dashboard Vercel** → Tuo progetto `v0-insight-suite`
2. **Settings** → **Environment Variables**
3. **Add** ogni variabile:
   - Name: `VOYAGE_API_KEY`
   - Value: `pa-7p_QDMx...`
   - Environment: `Production`, `Preview`, `Development`

### **Local Development (.env.local)**
```bash
VOYAGE_API_KEY="pa-7p_QDMxkrP35uqgLkL-Ct0Q1vwCa-uP5Do7x5JdTyUX"
ANTHROPIC_API_KEY="sk-ant-api03-RoOl_ey5zRHxwjsbP0HLD2ipNgLaXzHvQIOYjKmoeRjQ..."
VOYAGE_MODEL=voyage-3.5-lite
VOYAGE_MAX_RPM=3
ANTHROPIC_MODEL=claude-3-5-sonnet

# Vercel KV (Optional)
KV_REST_API_READ_ONLY_TOKEN="As3vAAIgcDH5i5_xi5VqOe7zUCcqQWQv..."
KV_REST_API_TOKEN="Ac3vAAIncDFiZTc1ZTJiZmQ1ZjQ0ODZi..."
KV_REST_API_URL="https://content-magpie-52719.upstash.io"
KV_URL="rediss://default:Ac3vAAIncDFiZTc1ZTJi..."
REDIS_URL="rediss://default:Ac3vAAIncDFiZTc1ZTJi..."
```

---

## 🌍 **Domain Configuration**

### **URLs Disponibili**

| Environment | URL | Uso |
|------------|-----|-----|
| **Development** | `http://localhost:3000/InsightSuite` | Sviluppo locale |
| **Vercel Direct** | `https://v0-insight-suite.vercel.app/InsightSuite` | Testing diretto |
| **Portfolio** | `https://michelemiranda.com/InsightSuite` | Produzione |

### **Custom Domain Setup**

**Se vuoi un dominio dedicato per InsightSuite:**
1. **Vercel Dashboard** → `v0-insight-suite` → **Settings** → **Domains**
2. **Add Domain** → `insights.your-domain.com`
3. **Configure DNS** nel tuo provider:
   ```
   CNAME insights cname.vercel-dns.com
   ```

### **CORS Configuration**
Il backend è già configurato per accettare requests da:
- `https://michelemiranda.com`
- `https://v0-insight-suite.vercel.app`
- `http://localhost:3000` (development)

---

## 📊 **Monitoring & Troubleshooting**

### **Health Checks**

```bash
# Direct Vercel
curl https://v0-insight-suite.vercel.app/health

# Through Portfolio
curl https://michelemiranda.com/InsightSuite/health

# Expected Response
{
  "status": "ok",
  "timestamp": "2025-08-25T17:40:16.635940"
}
```

### **API Testing**

```bash
# Test Reviews API
curl "https://michelemiranda.com/InsightSuite/api/reviews?projectId=airbnb&page=1&pageSize=5"

# Test Direct API
curl "https://v0-insight-suite.vercel.app/api/reviews?projectId=airbnb&page=1&pageSize=5"
```

### **Debug Endpoint**

```bash
# Check filesystem and environment
curl https://v0-insight-suite.vercel.app/api/debug
```

### **Common Issues & Solutions**

#### **404 su Portfolio Domain**
```bash
# Problema: michelemiranda.com/InsightSuite → 404
# Soluzione: Verifica vercel.json del portfolio
# Check: Dashboard portfolio → Settings → Functions
```

#### **500 Internal Server Error**
```bash
# Problema: API returns 500
# Debug: https://v0-insight-suite.vercel.app/api/debug
# Check: Vercel logs in Functions tab
```

#### **CORS Errors**
```bash
# Problema: Frontend can't call API
# Check: Network tab per CORS headers
# Fix: Verifica origins in ai_service/main.py
```

#### **Data Not Found**
```bash
# Problema: "Reviews data not found"
# Check: /api/debug endpoint
# Verify: Files in api/insightsuite/_data/
```

### **Vercel Logs**
1. **Dashboard Vercel** → `v0-insight-suite`
2. **Functions** tab
3. **Click on function** per vedere logs
4. **Real-time logs** durante requests

### **Performance Monitoring**

```bash
# Vercel Analytics
# Automatically enabled per requests/errors

# Custom Monitoring
curl -w "%{time_total}" https://michelemiranda.com/InsightSuite/api/reviews?projectId=airbnb&page=1&pageSize=5
```

---

## 🚨 **Emergency Procedures**

### **Rollback Deployment**
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### **Environment Variable Reset**
```bash
# Remove all env vars
vercel env rm [VAR_NAME]

# Re-add from .env.local
vercel env add
```

### **Complete Redeploy**
```bash
# Force complete rebuild
vercel --prod --force
```

---

## ✅ **Deployment Checklist**

### **Pre-deployment**
- [ ] Environment variables configurate
- [ ] `.env.local` non committato
- [ ] Tests passano localmente
- [ ] Build successful (`pnpm build`)

### **Post-deployment**
- [ ] Health check OK
- [ ] Reviews API funziona
- [ ] Frontend carica correttamente
- [ ] Portfolio integration attiva
- [ ] Domain routing corretto

### **Portfolio Integration**
- [ ] `vercel.json` aggiornato nel portfolio
- [ ] Deploy portfolio completato
- [ ] CORS headers presenti
- [ ] API calls 200 status

---

**🎉 Deployment completato con successo!**

Per supporto: Issues su [GitHub](https://github.com/HopelessMike/InsightSuite/issues)