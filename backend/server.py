"""
FastAPI proxy server that forwards all requests to the Node.js backend.
The Node.js backend runs on port 5001, this proxy runs on 8001 (via supervisor).
"""
import subprocess
import os
import signal
import sys
import time
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

NODE_PORT = 5001
NODE_PROCESS = None

def start_node_backend():
    global NODE_PROCESS
    env = os.environ.copy()
    env['PORT'] = str(NODE_PORT)
    
    # Use full path to ts-node-dev
    ts_node_dev = os.path.join('/app/backend/node_modules/.bin/ts-node-dev')
    NODE_PROCESS = subprocess.Popen(
        [ts_node_dev, '--respawn', '--transpile-only', 'src/index.ts'],
        cwd='/app/backend',
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    # Wait for node to start
    time.sleep(5)
    return NODE_PROCESS

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_node_backend()
    yield
    if NODE_PROCESS:
        NODE_PROCESS.terminate()

app = FastAPI(lifespan=lifespan)

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(request: Request, path: str):
    target_url = f"http://127.0.0.1:{NODE_PORT}/{path}"
    
    # Build query string
    if request.query_params:
        target_url += f"?{request.query_params}"
    
    # Get request body
    body = await request.body()
    
    # Forward headers
    headers = dict(request.headers)
    headers.pop('host', None)
    headers.pop('content-length', None)
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                content=body if body else None,
                headers=headers,
            )
            
            # Build response headers
            resp_headers = dict(response.headers)
            resp_headers.pop('content-length', None)
            resp_headers.pop('transfer-encoding', None)
            resp_headers.pop('content-encoding', None)
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=resp_headers,
            )
    except httpx.ConnectError:
        return Response(
            content='{"error": "Backend service starting up, please retry in a few seconds"}',
            status_code=503,
            media_type="application/json"
        )
    except Exception as e:
        return Response(
            content=f'{{"error": "Proxy error: {str(e)}"}}',
            status_code=502,
            media_type="application/json"
        )
