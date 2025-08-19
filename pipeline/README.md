# InsightSuite Data Pipeline

## Overview

This pipeline processes customer review datasets through advanced NLP techniques to generate actionable insights, including:
- Semantic clustering of reviews
- Sentiment analysis
- Theme extraction
- Persona generation
- Opportunity scoring

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set API keys (optional but recommended)
export VOYAGE_API_KEY=your_key_here
export ANTHROPIC_API_KEY=your_key_here

# Run pipeline
python run_demo.py \
  --airbnb path/to/airbnb.csv \
  --mobile path/to/mobile.csv \
  --ecommerce path/to/ecommerce.csv \
  --out ./out
```

## Pipeline Stages

### 1. Data Loading (`utils.py`)
- Loads CSV files with automatic encoding detection
- Normalizes to common schema: `id, text, rating, timestamp, lang, source`
- Handles multiple formats (Airbnb, mobile app reviews, e-commerce)

### 2. Sentiment Analysis (`utils.py`)
- Model: `cardiffnlp/twitter-xlm-roberta-base-sentiment`
- Multilingual support (IT, EN, ES, FR, DE, ID)
- Output: Score between -1 (negative) and +1 (positive)

### 3. Embeddings (`embed.py`)
- Service: Voyage AI API
- Model: `voyage-3-lite` (1024 dimensions)
- Fallback: TF-IDF if API unavailable
- Caching: Automatic disk cache to avoid redundant API calls

### 4. Clustering (`cluster.py`)
- Algorithm: HDBSCAN (Hierarchical DBSCAN)
- Adaptive parameters based on dataset size
- Extracts keywords using TF-IDF
- Calculates temporal trends

### 5. Summarization (`summarize.py`)
- LLM: Claude 3.5 Sonnet
- Generates: Labels, summaries, strengths, weaknesses
- Fallback: Rule-based summaries if API unavailable

### 6. Persona Generation (`personas.py`)
- Creates 2-4 user personas
- Based on cluster patterns and behaviors
- Includes goals, pain points, preferred channels

## Configuration

### API Keys

Create a `.env` file in the project root:
```env
VOYAGE_API_KEY=your_voyage_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Parameters

- `--max-reviews`: Limit reviews per dataset (default: 5000)
- `--out`: Output directory for JSON files
- `--test-apis`: Test API connections without processing

## Output Format

The pipeline generates JSON files compatible with the TypeScript schema:

```json
{
  "meta": {
    "project_id": "airbnb",
    "name": "Airbnb Analysis",
    "source": "Reviews",
    "date_range": ["2024-01-01", "2024-12-31"],
    "languages": ["en", "it"],
    "totals": { "reviews": 1000, "clusters": 8 }
  },
  "aggregates": {
    "sentiment_mean": 0.65,
    "sentiment_dist": { "neg": 0.2, "neu": 0.3, "pos": 0.5 },
    "rating_hist": [[1, 50], [2, 100], ...]
  },
  "clusters": [...],
  "personas": [...]
}
```

## Caching

The pipeline uses intelligent caching:
- Embeddings cached by text hash
- API responses cached to disk
- Cache location: `./cache/embeddings/`

## Error Handling

- Automatic fallbacks when APIs unavailable
- Graceful degradation of features
- Detailed error messages in console

## Performance

Processing times (approximate):
- 1,000 reviews: ~2 minutes
- 5,000 reviews: ~5-10 minutes
- 10,000 reviews: ~15-20 minutes

Factors affecting performance:
- API rate limits
- Embedding computation
- LLM summarization calls

## Troubleshooting

### "API key not found"
- Check `.env` file exists
- Verify environment variables are set
- Use `--test-apis` to validate connections

### Memory errors
- Reduce `--max-reviews`
- Process datasets individually
- Increase Python heap size

### Encoding errors
- Pipeline auto-detects encoding
- Convert files to UTF-8 if issues persist

## Development

### Adding a new dataset format

1. Create loader function in `utils.py`:
```python
def load_custom_reviews(path: str) -> pd.DataFrame:
    # Load and map to standard schema
    return df
```

2. Add to `run_demo.py`:
```python
parser.add_argument('--custom', type=str, help='Custom dataset')
```

### Customizing clustering

Edit parameters in `cluster.py`:
```python
min_cluster_size = 50  # Minimum cluster size
cluster_selection_epsilon = 0.1  # Merge distance
```

### Modifying prompts

Edit prompts in `summarize.py` and `personas.py` for different output styles.

## License

See main project LICENSE and ATTRIBUTION.md for dataset licenses.