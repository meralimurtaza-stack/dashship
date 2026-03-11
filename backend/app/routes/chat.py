from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic

from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ── Models ───────────────────────────────────────────────────────

class ColumnContext(BaseModel):
    name: str
    display_name: str | None = None
    type: str
    role: str
    sample_values: list[str] = []


class DataContext(BaseModel):
    source_name: str
    row_count: int
    columns: list[ColumnContext]


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    data_context: DataContext


# ── System Prompt Builder ────────────────────────────────────────

def build_system_prompt(ctx: DataContext) -> str:
    dims = [c for c in ctx.columns if c.role == "dimension"]
    measures = [c for c in ctx.columns if c.role == "measure"]

    dim_lines = []
    for c in dims:
        name = c.display_name or c.name
        samples = ", ".join(c.sample_values[:4]) if c.sample_values else ""
        dim_lines.append(f"  - {name} ({c.type}){f' — e.g. {samples}' if samples else ''}")

    meas_lines = []
    for c in measures:
        name = c.display_name or c.name
        samples = ", ".join(c.sample_values[:3]) if c.sample_values else ""
        meas_lines.append(f"  - {name} ({c.type}){f' — e.g. {samples}' if samples else ''}")

    return f"""You are a dashboard planning consultant for DashShip. The user has uploaded a dataset and wants to create a production-ready dashboard. You have their data profile below. Help them by: 1. Understanding what questions they want their dashboard to answer 2. Suggesting specific visualisations based on their data 3. Recommending which fields to use for each chart 4. Building toward a concrete dashboard plan Be concise and specific. Reference their actual field names. When you have enough information, summarise a dashboard plan with specific charts, fields, and layout.

## Data Profile

**Source:** {ctx.source_name}
**Rows:** {ctx.row_count:,}

**Dimensions ({len(dims)}):**
{chr(10).join(dim_lines) if dim_lines else "  (none)"}

**Measures ({len(measures)}):**
{chr(10).join(meas_lines) if meas_lines else "  (none)"}"""


# ── Streaming Endpoint ──────────────────────────────────────────

@router.post("")
async def chat(request: ChatRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    system = build_system_prompt(request.data_context)

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def generate():
        try:
            with client.messages.stream(
                model="claude-sonnet-4-5-20250929",
                max_tokens=2048,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except anthropic.APIError as e:
            yield f"\n\n[Error: {str(e)}]"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
