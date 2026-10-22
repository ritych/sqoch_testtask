import json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .cashier import checkout

app = FastAPI(title="Касса зала «Лен»")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def read_json(request: Request):
    raw = await request.body()
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def respond(result: dict) -> JSONResponse:
    return JSONResponse(result["body"], status_code=result["status"], headers={"Cache-Control": "no-store"})


@app.get("/api/event")
def event() -> JSONResponse:
    return JSONResponse(checkout.availability(), headers={"Cache-Control": "no-store"})


@app.post("/api/event/reset")
def reset_event() -> JSONResponse:
    return JSONResponse(checkout.reset(), headers={"Cache-Control": "no-store"})


@app.post("/api/orders/preview")
async def preview_order(request: Request) -> JSONResponse:
    return respond(checkout.preview(await read_json(request)))


@app.post("/api/orders")
async def create_order(request: Request) -> JSONResponse:
    return respond(checkout.confirm(await read_json(request)))
