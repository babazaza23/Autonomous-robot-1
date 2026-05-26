"""WMS Robot Vision AI Server - Main Entry Point."""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRAMES_DIR
from api import register_routes

# Create FastAPI app
app = FastAPI(title="WMS Robot Vision AI Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure frames directory exists
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

# Register all API routes
register_routes(app)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
