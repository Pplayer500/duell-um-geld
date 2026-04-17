#!/usr/bin/env python
"""
Backend startup script
"""
import sys
import os

# Add parent directory to path so imports work correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Detect environment
    is_production = os.getenv("RAILWAY_ENVIRONMENT_NAME") is not None
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Listen on all interfaces (required for Railway)
        port=int(os.getenv("PORT", 8000)),
        reload=False if is_production else True,
        log_level="info"
    )
