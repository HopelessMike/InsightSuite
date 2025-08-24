"""
Pydantic models for API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

# Review models
class Review(BaseModel):
    """Individual review model"""
    id: str
    text: str
    clusterId: Optional[str] = None
    clusterLabel: Optional[str] = None
    sentiment: float = Field(ge=-1, le=1)
    lang: str
    date: Optional[str] = None
    rating: Optional[float] = Field(None, ge=1, le=5)
    sourceId: str
    projectId: str

class ReviewPage(BaseModel):
    """Paginated review response"""
    total: int
    page: int
    pageSize: int
    items: List[Review]

class ReviewQuery(BaseModel):
    """Review query parameters"""
    projectId: str
    q: Optional[str] = None
    clusterId: Optional[str] = None
    lang: Optional[str] = None
    ratingMin: Optional[int] = Field(None, ge=1, le=5)
    ratingMax: Optional[int] = Field(None, ge=1, le=5)
    sentimentMin: Optional[float] = Field(-1.0, ge=-1, le=1)
    sentimentMax: Optional[float] = Field(1.0, ge=-1, le=1)
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    sort: Literal["date", "sentiment", "rating"] = "date"
    order: Literal["asc", "desc"] = "desc"
    page: int = Field(1, ge=1)
    pageSize: int = Field(50, ge=1, le=200)

class Quote(BaseModel):
    """Review quote model"""
    id: str
    text: str
    rating: Optional[float] = None
    lang: str

class TrendPoint(BaseModel):
    """Trend data point"""
    week: str
    count: int

class Cluster(BaseModel):
    """Cluster model"""
    id: str
    label: str
    size: int
    share: float = Field(ge=0, le=1)
    sentiment: float = Field(ge=-1, le=1)
    trend: List[TrendPoint]
    keywords: List[str]
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    opportunity_score: float = Field(ge=0, le=1)
    quotes: List[Quote]
    co_occurs: List[str]

class Persona(BaseModel):
    """User persona model"""
    id: str
    name: str
    share: float = Field(ge=0, le=1)
    goals: List[str]
    pains: List[str]
    clusters: List[str]
    quotes: List[str]
    channels: List[str]

class ProjectMeta(BaseModel):
    """Project metadata"""
    project_id: str
    name: str
    source: str
    date_range: List[str] = Field(min_items=2, max_items=2)
    languages: List[str]
    totals: Dict[str, int]

class SentimentDistribution(BaseModel):
    """Sentiment distribution"""
    neg: float = Field(ge=0, le=1)
    neu: float = Field(ge=0, le=1)
    pos: float = Field(ge=0, le=1)

class Aggregates(BaseModel):
    """Aggregate statistics"""
    sentiment_mean: float = Field(ge=-1, le=1)
    sentiment_dist: SentimentDistribution
    rating_hist: List[List[float]]

class ProjectData(BaseModel):
    """Complete project data"""
    meta: ProjectMeta
    aggregates: Aggregates
    clusters: List[Cluster]
    personas: List[Persona]

# Job models for async processing

class JobStatus(BaseModel):
    """Job status"""
    id: str
    status: str = Field(pattern="^(pending|running|completed|failed)$")
    progress: float = Field(ge=0, le=100)
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class CreateJobRequest(BaseModel):
    """Request to create analysis job"""
    dataset_url: str
    dataset_type: str = Field(pattern="^(airbnb|mobile|ecommerce|custom)$")
    project_name: str
    options: Optional[Dict[str, Any]] = None

class CreateJobResponse(BaseModel):
    """Response after creating job"""
    job_id: str
    status: str
    message: str

# Health check models

class HealthStatus(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    version: str = "1.0.0"
    services: Dict[str, bool]