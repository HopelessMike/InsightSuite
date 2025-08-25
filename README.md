# InsightSuite API

Backend API for InsightSuite analytics platform, built with FastAPI and deployed on Vercel.

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- pip or poetry
- Git

### Local Development

1. **Clone the repository**
```bash
git clone [your-repo-url]
cd InsightSuite
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the development server**
```bash
python run_local.py
```

The API will be available at:
- API: http://localhost:8000
- Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Testing

Run the test suite to verify all endpoints:

```bash
# Test local environment
python test_routes.py --env local

# Test staging environment
python test_routes.py --env staging

# Test production through portfolio
python test_routes.py --env production
```

## 📁 Project Structure

```
InsightSuite/
├── api/
│   └── index.py          # Main FastAPI application
├── _data/                # Data files (JSONL format)
│   ├── airbnb_reviews.jsonl
│   └── [other_project]_reviews.jsonl
├── vercel.json          # Vercel configuration
├── requirements.txt     # Python dependencies
├── run_local.py        # Local development server
├── test_routes.py      # API testing script
├── .gitignore
└── README.md
```

## 🔧 Configuration

### Environment Variables

The application uses these environment variables:

- `VERCEL_ENV`: Environment identifier (`development`, `preview`, `production`)
- Automatically set by Vercel in deployment

### Data Files

Place JSONL files in the `_data` directory with the naming convention:
- `{project_id}_reviews.jsonl`

Example JSONL format:
```json
{"id": "1", "rating": 5, "text": "Great!", "date": "2024-01-01", "sentiment": "positive"}
{"id": "2", "rating": 4, "text": "Good", "date": "2024-01-02", "sentiment": "positive"}
```

## 🌐 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and status |
| GET | `/health` | Health check endpoint |
| GET | `/projects` | List available projects |
| GET | `/reviews` | Get paginated reviews |
| GET | `/stats/{project_id}` | Get project statistics |

### Review Parameters

The `/reviews` endpoint accepts these query parameters:
- `project_id` or `projectId`: Project identifier (required)
- `page`: Page number (default: 1)
- `page_size` or `pageSize`: Items per page (default: 50, max: 100)
- `sort`: Sort field (default: "date")
- `order`: Sort order - "asc" or "desc" (default: "desc")

Example:
```
GET /reviews?project_id=airbnb&page=1&page_size=20&sort=rating&order=desc
```

## 🚢 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

### Manual Deployment via GitHub

1. Push your code to GitHub
2. Import the project in Vercel Dashboard
3. Configure:
   - Framework Preset: Other
   - Build Command: `pip install -r requirements.txt`
   - Output Directory: `.`
   - Install Command: (leave empty)

## 🔍 Debugging

### Check Vercel Logs

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to Functions tab
4. Click on the function to see logs

### Common Issues and Solutions

**404 Errors**
- Verify file structure (`api/index.py` must exist)
- Check `vercel.json` routing configuration
- Ensure Python runtime is detected

**Case Sensitivity Issues**
- The API handles case-insensitive routing automatically
- Both `/Health` and `/health` will work

**CORS Errors**
- CORS is configured for all origins in development
- Production domains are whitelisted in `api/index.py`

**Data Not Found**
- Ensure `_data` directory exists
- Check JSONL file naming: `{project_id}_reviews.jsonl`
- Verify file encoding is UTF-8

## 🔗 Integration with Portfolio

The API is designed to be proxied through your portfolio site:

1. Portfolio routes `/InsightSuite/api/*` to this API
2. The API handles the path prefix automatically
3. Works with dynamic domains without configuration changes

### Portfolio Configuration

In your portfolio's `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/InsightSuite/api/:path*",
      "destination": "https://v0-insight-suite.vercel.app/api/:path*"
    }
  ]
}
```

## 📊 Monitoring

### Health Check

Monitor API health:
```bash
curl https://v0-insight-suite.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "InsightSuite",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2024-08-25T10:00:00Z",
  "root_path": "/InsightSuite/api"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `python test_routes.py`
5. Submit a pull request

## 📝 License

[Your License Here]

## 📧 Support

For issues or questions, please open an issue on GitHub or contact the maintainer.