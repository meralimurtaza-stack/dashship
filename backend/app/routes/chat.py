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
    data_context: DataContext | None = None
    is_first_message: bool = False


BASE_PROMPT = """You are a dashboard planning consultant for DashShip. Help users plan and create production-ready dashboards. Be concise and specific. When you have enough information, summarise a dashboard plan with specific charts, fields, and layout."""

PROJECT_NAME_INSTRUCTION = """

When responding to the user's FIRST message, include a suggested project name wrapped in: <project-name>Customer Insights</project-name>
The name should be 2-4 words that describe the dashboard's purpose.
Do not explain the tag — it will be parsed and removed before display."""

NO_DATA_INSTRUCTION = """

No data has been uploaded yet. When responding to the user's first message, acknowledge what they want to build. Then ask whether they'd like to use sample data (to see a dashboard in 60 seconds) or upload their own CSV/Excel file. Keep your response to 2-3 sentences. Do NOT ask multiple clarifying questions — just the data question."""


# ── System Prompt Builder ────────────────────────────────────────

def build_system_prompt(ctx: DataContext | None, is_first_message: bool = False) -> str:
    if ctx is None:
        prompt = BASE_PROMPT + NO_DATA_INSTRUCTION
        if is_first_message:
            prompt += PROJECT_NAME_INSTRUCTION
        return prompt

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

    prompt = f"""{BASE_PROMPT} The user has uploaded a dataset. You have their data profile below. Help them by: 1. Understanding what questions they want their dashboard to answer 2. Suggesting specific visualisations based on their data 3. Recommending which fields to use for each chart 4. Building toward a concrete dashboard plan Reference their actual field names.

## Data Profile

**Source:** {ctx.source_name}
**Rows:** {ctx.row_count:,}

**Dimensions ({len(dims)}):**
{chr(10).join(dim_lines) if dim_lines else "  (none)"}

**Measures ({len(measures)}):**
{chr(10).join(meas_lines) if meas_lines else "  (none)"}"""

    if is_first_message:
        prompt += PROJECT_NAME_INSTRUCTION

    return prompt


# ── Streaming Endpoint ──────────────────────────────────────────

@router.post("")
async def chat(request: ChatRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    system = build_system_prompt(request.data_context, request.is_first_message)

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
