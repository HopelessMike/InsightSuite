# 🔌 InsightSuite API Documentation

Documentazione completa delle API REST per l'accesso ai dati e alle funzionalità di InsightSuite.

## 📋 **Indice**

1. [Base URLs](#base-urls)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Endpoints](#endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## 🌐 **Base URLs**

| Environment | Base URL | Uso |
|-------------|----------|-----|
| **Development** | `http://localhost:8000` | Sviluppo locale |
| **Production** | `https://v0-insight-suite.vercel.app` | API diretta |
| **Portfolio** | `https://michelemiranda.com/InsightSuite` | Tramite portfolio |

---

## 🔐 **Authentication**

Le API pubbliche di InsightSuite **non richiedono autenticazione** per la lettura dei dati. 

Per operazioni future che richiederanno autenticazione:
```http
Authorization: Bearer your-api-token
```

---

## 📝 **Response Format**

### **Success Response**
```json
{
  "success": true,
  "data": {...},
  "meta": {
    "timestamp": "2025-08-25T17:40:16.635940",
    "version": "1.0.0"
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "error": {
    "code": "REVIEWS_NOT_FOUND",
    "message": "Reviews data not found for project airbnb",
    "details": {...}
  }
}
```

---

## 🔗 **Endpoints**

### **1. Health Check**

#### `GET /health`

Verifica lo stato dell'API.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-25T17:40:16.635940"
}
```

---

### **2. API Status**

#### `GET /api/status`

Informazioni dettagliate sui servizi.

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2025-08-25T17:40:16.635940",
  "version": "1.0.0",
  "services": {
    "api": true,
    "voyage_ai": true,
    "anthropic": true,
    "database": true,
    "cache": true
  }
}
```

---

### **3. Reviews**

#### `GET /api/reviews`

Recupera recensioni paginata con filtri opzionali.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | string | ✅ | - | ID progetto (`airbnb`, `mobile`, `ecommerce`) |
| `page` | integer | ❌ | 1 | Numero pagina |
| `pageSize` | integer | ❌ | 10 | Elementi per pagina (max: 200) |
| `q` | string | ❌ | - | Ricerca testuale |
| `clusterId` | string | ❌ | - | Filtra per cluster ID |
| `lang` | string | ❌ | - | Filtra per lingua (`it`, `en`, etc.) |
| `ratingMin` | integer | ❌ | - | Rating minimo (1-5) |
| `ratingMax` | integer | ❌ | - | Rating massimo (1-5) |
| `sentimentMin` | float | ❌ | -1.0 | Sentiment minimo (-1.0 to 1.0) |
| `sentimentMax` | float | ❌ | 1.0 | Sentiment massimo (-1.0 to 1.0) |
| `dateFrom` | string | ❌ | - | Data inizio (ISO format) |
| `dateTo` | string | ❌ | - | Data fine (ISO format) |
| `sort` | string | ❌ | `date` | Campo ordinamento (`date`, `sentiment`, `rating`) |
| `order` | string | ❌ | `desc` | Direzione (`asc`, `desc`) |

**Example Request:**
```http
GET /api/reviews?projectId=airbnb&page=1&pageSize=10&sort=sentiment&order=desc&lang=it
```

**Response:**
```json
{
  "total": 480,
  "page": 1,
  "pageSize": 10,
  "items": [
    {
      "id": "review_001",
      "text": "Appartamento fantastico nel centro di Roma...",
      "clusterId": "cluster_location_positive",
      "clusterLabel": "Posizione Eccellente",
      "sentiment": 0.85,
      "lang": "it",
      "date": "2024-08-15",
      "rating": 5,
      "sourceId": "airbnb_123456",
      "projectId": "airbnb"
    },
    // ... altre recensioni
  ]
}
```

---

### **4. Reviews Statistics**

#### `GET /api/reviews/stats`

Statistiche aggregate per progetto.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | ✅ | ID progetto |

**Example Request:**
```http
GET /api/reviews/stats?projectId=airbnb
```

**Response:**
```json
{
  "total": 480,
  "languages": {
    "it": 350,
    "en": 130
  },
  "clusters": {
    "cluster_location_positive": 45,
    "cluster_service_negative": 32,
    "cluster_price_neutral": 28
  },
  "sentiment": {
    "mean": 0.13,
    "std": 0.45,
    "min": -0.89,
    "max": 0.95
  },
  "rating": {
    "mean": 4.2,
    "distribution": {
      "5": 180,
      "4": 150,
      "3": 80,
      "2": 45,
      "1": 25
    }
  }
}
```

---

### **5. Jobs (Processing)**

#### `POST /api/v1/jobs/start`

Avvia un job di processing (future feature).

**Request Body:**
```json
{
  "project_id": "airbnb",
  "description": "Generate new personas",
  "parameters": {
    "min_cluster_size": 10,
    "sentiment_threshold": 0.1
  }
}
```

**Response:**
```json
{
  "job_id": "job_uuid_123",
  "status": "processing",
  "created_at": "2025-08-25T17:40:16.635940",
  "estimated_completion": "2025-08-25T17:45:16.635940"
}
```

#### `GET /api/v1/jobs/{job_id}/status`

Stato del job di processing.

**Response:**
```json
{
  "job_id": "job_uuid_123",
  "status": "completed",
  "progress": 100,
  "result": {
    "personas_generated": 5,
    "clusters_identified": 12,
    "processing_time": "4.2s"
  },
  "created_at": "2025-08-25T17:40:16.635940",
  "completed_at": "2025-08-25T17:44:32.123456"
}
```

---

### **6. Debug Information**

#### `GET /api/debug`

Informazioni di debug per troubleshooting (solo development/staging).

**Response:**
```json
{
  "cwd": "/var/task",
  "file_path": "/var/task/ai_service",
  "env_vars": {
    "INSIGHTS_DATA_DIR": "/var/task/api/insightsuite/_data",
    "VERCEL": "1",
    "VERCEL_ENV": "production"
  },
  "paths_checked": [
    {
      "path": "/var/task/api/insightsuite/_data",
      "exists": true,
      "files": [
        "airbnb_reviews.jsonl",
        "ecommerce_reviews.jsonl",
        "mobile_reviews.jsonl"
      ]
    }
  ]
}
```

---

## ⚠️ **Error Handling**

### **HTTP Status Codes**

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Resource not found |
| 422 | Validation Error | Invalid data format |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### **Error Response Format**

```json
{
  "detail": "Reviews data not found for project invalid_project",
  "status_code": 404,
  "error_type": "RESOURCE_NOT_FOUND"
}
```

### **Common Errors**

#### **Project Not Found (404)**
```json
{
  "detail": "Reviews data not found for project xyz"
}
```

#### **Validation Error (422)**
```json
{
  "detail": [
    {
      "loc": ["query", "pageSize"],
      "msg": "ensure this value is less than or equal to 200",
      "type": "value_error.number.not_le"
    }
  ]
}
```

#### **Rate Limited (429)**
```json
{
  "detail": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

---

## 🚦 **Rate Limiting**

### **Current Limits**
- **Public APIs**: 1000 requests/hour per IP
- **Future authenticated**: 10000 requests/hour per token

### **Headers**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## 💡 **Examples**

### **cURL Examples**

#### **Basic Health Check**
```bash
curl -X GET "https://v0-insight-suite.vercel.app/health"
```

#### **Get Reviews with Filters**
```bash
curl -X GET "https://v0-insight-suite.vercel.app/api/reviews?projectId=airbnb&page=1&pageSize=5&sentiment_min=0.5&lang=it" \
  -H "Accept: application/json"
```

#### **Get Project Statistics**
```bash
curl -X GET "https://v0-insight-suite.vercel.app/api/reviews/stats?projectId=airbnb" \
  -H "Accept: application/json"
```

### **JavaScript Examples**

#### **Fetch Reviews**
```javascript
async function getReviews(projectId, page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    projectId,
    page: page.toString(),
    pageSize: pageSize.toString()
  });
  
  const response = await fetch(`/api/reviews?${params}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// Usage
getReviews('airbnb', 1, 10)
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### **Advanced Filtering**
```javascript
async function getFilteredReviews(filters) {
  const params = new URLSearchParams();
  
  // Required parameter
  params.append('projectId', filters.projectId);
  
  // Optional filters
  if (filters.sentiment) {
    params.append('sentimentMin', filters.sentiment.min);
    params.append('sentimentMax', filters.sentiment.max);
  }
  
  if (filters.rating) {
    params.append('ratingMin', filters.rating.min);
    params.append('ratingMax', filters.rating.max);
  }
  
  if (filters.language) {
    params.append('lang', filters.language);
  }
  
  if (filters.search) {
    params.append('q', filters.search);
  }
  
  const response = await fetch(`/api/reviews?${params}`);
  return await response.json();
}

// Usage
const filters = {
  projectId: 'airbnb',
  sentiment: { min: 0.5, max: 1.0 },
  rating: { min: 4, max: 5 },
  language: 'it',
  search: 'posizione'
};

getFilteredReviews(filters)
  .then(data => console.log(`Found ${data.total} reviews`));
```

### **Python Examples**

#### **Using requests**
```python
import requests
from typing import Dict, Any

class InsightSuiteAPI:
    def __init__(self, base_url: str = "https://v0-insight-suite.vercel.app"):
        self.base_url = base_url
    
    def get_reviews(self, project_id: str, page: int = 1, page_size: int = 10, **filters) -> Dict[str, Any]:
        params = {
            'projectId': project_id,
            'page': page,
            'pageSize': page_size,
            **filters
        }
        
        response = requests.get(f"{self.base_url}/api/reviews", params=params)
        response.raise_for_status()
        
        return response.json()
    
    def get_stats(self, project_id: str) -> Dict[str, Any]:
        params = {'projectId': project_id}
        
        response = requests.get(f"{self.base_url}/api/reviews/stats", params=params)
        response.raise_for_status()
        
        return response.json()

# Usage
api = InsightSuiteAPI()

# Get reviews with high sentiment
reviews = api.get_reviews(
    project_id='airbnb',
    page=1,
    page_size=20,
    sentimentMin=0.7,
    lang='it'
)

print(f"Found {reviews['total']} positive reviews")

# Get project statistics
stats = api.get_stats('airbnb')
print(f"Average sentiment: {stats['sentiment']['mean']:.2f}")
```

---

## 📚 **SDK & Libraries**

### **Official Libraries** (Future)
- `@insightsuite/js-sdk` - JavaScript/TypeScript
- `insightsuite-python` - Python
- `insightsuite-go` - Go

### **Community Libraries**
- Contribuisci creando wrapper per il tuo linguaggio preferito!

---

## 🔄 **Versioning**

L'API segue **Semantic Versioning**:
- **Major** (v2.x.x): Breaking changes
- **Minor** (v1.x.x): Nuove funzionalità
- **Patch** (v1.0.x): Bug fixes

**Current Version**: `v1.0.0`

---

## 📞 **Support**

Per supporto API:
- 📧 **Email**: api@insightsuite.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/HopelessMike/InsightSuite/issues)
- 📖 **Docs**: [Full Documentation](https://docs.insightsuite.com/api)

---

**Made with ❤️ by the InsightSuite Team**