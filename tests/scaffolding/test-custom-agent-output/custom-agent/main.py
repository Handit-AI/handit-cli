#!/usr/bin/env python3
"""
FastAPI application for Custom Agent (LangGraph)
Following FastAPI best practices for production deployment
"""

import os
from typing import Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

from handit_ai import configure, tracing

# Load environment variables
load_dotenv()

# Configure Handit
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

from src.agent import LangGraphAgent

# Global agent instance
agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global agent
    
    # Startup
    print(f"🚀 Starting Custom Agent (LangGraph + FastAPI)")
    
    # Initialize agent
    agent = LangGraphAgent()
    
    # Print graph information
    graph_info = agent.get_graph_info()
    print(f"📊 Graph structure: {graph_info}")
    print(f"✅ Custom Agent initialized successfully")
    
    yield
    
    # Shutdown
    print(f"🔄 Shutting down Custom Agent")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Custom Agent",
    description="LangGraph-powered AI agent API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "0.0.0.0"]
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost,http://localhost:3000,http://localhost:8000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Request/Response Models
class ProcessRequest(BaseModel):
    input_data: str = Field(..., description="Input data to process", min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Optional metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "input_data": "Hello, how can you help me today?",
                "metadata": {"user_id": "user123", "session_id": "session456"}
            }
        }

class ProcessResponse(BaseModel):
    result: Any = Field(..., description="Processing result")
    success: bool = Field(..., description="Whether processing was successful")
    metadata: Dict[str, Any] = Field(..., description="Response metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "result": "I can help you with various tasks...",
                "success": True,
                "metadata": {
                    "agent": "Custom Agent",
                    "framework": "langgraph",
                    "processing_time_ms": 150
                }
            }
        }

class HealthResponse(BaseModel):
    status: str = Field(..., description="Health status")
    agent: str = Field(..., description="Agent name")
    framework: str = Field(..., description="Framework used")
    uptime: str = Field(..., description="Application uptime")

class GraphInfoResponse(BaseModel):
    graph_info: Dict[str, Any] = Field(..., description="Graph structure information")

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# API Routes
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Custom Agent API",
        "framework": "langgraph",
        "docs": "/docs",
        "health": "/health"
    }

@app.post("/process", response_model=ProcessResponse, tags=["Agent"])
@tracing(agent="Custom Agent")
async def process_endpoint(request: ProcessRequest):
    """
    Main processing endpoint - sends input through the LangGraph agent
    This is the main entry point for agent execution, so it has tracing.
    """
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    try:
        import time
        start_time = time.time()
        
        result = await agent.process(request.input_data)
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        return ProcessResponse(
            result=result,
            success=True,
            metadata={
                "agent": "Custom Agent",
                "framework": "langgraph",
                "processing_time_ms": round(processing_time, 2),
                **request.metadata
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    import time
    uptime = time.time() - start_time if 'start_time' in globals() else 0
    
    return HealthResponse(
        status="healthy",
        agent="Custom Agent",
        framework="langgraph",
        uptime=f"{uptime:.2f} seconds"
    )

@app.get("/graph/info", response_model=GraphInfoResponse, tags=["Graph"])
async def graph_info():
    """Get graph structure information"""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    return GraphInfoResponse(
        graph_info=agent.get_graph_info()
    )

# Development server
if __name__ == "__main__":
    import time
    start_time = time.time()
    
    port = 8000
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"🌐 Starting Custom Agent FastAPI server")
    print(f"📍 Server will be available at: http://{host}:{port}")
    print(f"📚 API Documentation: http://{host}:{port}/docs")
    print(f"🔍 Alternative docs: http://{host}:{port}/redoc")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
