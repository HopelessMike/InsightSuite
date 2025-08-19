"""
Jobs router for async analysis tasks
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, List, Optional
from datetime import datetime
import uuid
import asyncio

from ai_service.models import (
    CreateJobRequest,
    CreateJobResponse,
    JobStatus
)

router = APIRouter()

# In-memory job storage (replace with database in production)
jobs_store: Dict[str, JobStatus] = {}

@router.post("/jobs/analyze", response_model=CreateJobResponse)
async def create_analysis_job(
    request: CreateJobRequest,
    background_tasks: BackgroundTasks
) -> CreateJobResponse:
    """
    Create a new analysis job
    
    Args:
        request: Job creation request with dataset info
        background_tasks: FastAPI background tasks
        
    Returns:
        Job creation response with job ID
    """
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Create job status
    job = JobStatus(
        id=job_id,
        status="pending",
        progress=0.0,
        message="Job created, waiting to start",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        completed_at=None,
        result=None,
        error=None
    )
    
    # Store job
    jobs_store[job_id] = job
    
    # Add to background tasks
    background_tasks.add_task(
        process_analysis_job,
        job_id,
        request
    )
    
    return CreateJobResponse(
        job_id=job_id,
        status="pending",
        message=f"Analysis job created for {request.project_name}"
    )

@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str) -> JobStatus:
    """
    Get status of a specific job
    
    Args:
        job_id: Job identifier
        
    Returns:
        Job status information
    """
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return jobs_store[job_id]

@router.get("/jobs", response_model=List[JobStatus])
async def list_jobs(
    status: Optional[str] = None,
    limit: int = 10,
    offset: int = 0
) -> List[JobStatus]:
    """
    List all jobs with optional filtering
    
    Args:
        status: Filter by job status
        limit: Maximum number of jobs to return
        offset: Number of jobs to skip
        
    Returns:
        List of job statuses
    """
    jobs = list(jobs_store.values())
    
    # Filter by status if provided
    if status:
        jobs = [j for j in jobs if j.status == status]
    
    # Sort by creation date (newest first)
    jobs.sort(key=lambda x: x.created_at, reverse=True)
    
    # Apply pagination
    return jobs[offset:offset + limit]

@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str) -> Dict[str, str]:
    """
    Cancel a running job
    
    Args:
        job_id: Job identifier
        
    Returns:
        Cancellation confirmation
    """
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    job = jobs_store[job_id]
    
    if job.status in ["completed", "failed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job in {job.status} state"
        )
    
    # Update job status
    job.status = "failed"
    job.error = "Job cancelled by user"
    job.updated_at = datetime.utcnow()
    
    return {"message": f"Job {job_id} cancelled"}

async def process_analysis_job(job_id: str, request: CreateJobRequest):
    """
    Process analysis job in background
    
    This is a placeholder implementation. In production, this would:
    1. Download/access the dataset
    2. Run the analysis pipeline
    3. Store results
    4. Update job status throughout
    """
    job = jobs_store[job_id]
    
    try:
        # Update status to running
        job.status = "running"
        job.progress = 10.0
        job.message = "Loading dataset..."
        job.updated_at = datetime.utcnow()
        
        # Simulate processing steps
        await asyncio.sleep(2)  # Simulate data loading
        
        job.progress = 30.0
        job.message = "Computing embeddings..."
        job.updated_at = datetime.utcnow()
        await asyncio.sleep(3)  # Simulate embedding computation
        
        job.progress = 50.0
        job.message = "Performing clustering..."
        job.updated_at = datetime.utcnow()
        await asyncio.sleep(2)  # Simulate clustering
        
        job.progress = 70.0
        job.message = "Generating summaries..."
        job.updated_at = datetime.utcnow()
        await asyncio.sleep(2)  # Simulate summarization
        
        job.progress = 90.0
        job.message = "Creating personas..."
        job.updated_at = datetime.utcnow()
        await asyncio.sleep(1)  # Simulate persona generation
        
        # Mark as completed
        job.status = "completed"
        job.progress = 100.0
        job.message = "Analysis completed successfully"
        job.completed_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        job.result = {
            "project_id": f"analysis_{job_id[:8]}",
            "clusters_found": 8,
            "personas_created": 3,
            "total_reviews": 1000,
            "output_path": f"/results/{job_id}.json"
        }
        
    except Exception as e:
        # Handle errors
        job.status = "failed"
        job.error = str(e)
        job.message = "Analysis failed"
        job.updated_at = datetime.utcnow()

@router.post("/jobs/{job_id}/retry")
async def retry_job(
    job_id: str,
    background_tasks: BackgroundTasks
) -> CreateJobResponse:
    """
    Retry a failed job
    
    Args:
        job_id: Job identifier to retry
        background_tasks: FastAPI background tasks
        
    Returns:
        Job creation response for retried job
    """
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    old_job = jobs_store[job_id]
    
    if old_job.status != "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Can only retry failed jobs, current status: {old_job.status}"
        )
    
    # Create new job ID for retry
    new_job_id = str(uuid.uuid4())
    
    # Clone job with new ID
    new_job = JobStatus(
        id=new_job_id,
        status="pending",
        progress=0.0,
        message=f"Retrying job {job_id[:8]}",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        completed_at=None,
        result=None,
        error=None
    )
    
    jobs_store[new_job_id] = new_job
    
    # Note: In production, you'd need to preserve the original request data
    # For now, return a placeholder response
    
    return CreateJobResponse(
        job_id=new_job_id,
        status="pending",
        message=f"Retry job created with ID {new_job_id}"
    )