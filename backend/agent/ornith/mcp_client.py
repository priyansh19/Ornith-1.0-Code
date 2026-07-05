from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import os, asyncio, concurrent.futures

def _run_async(coro):
    """Runs a coroutine to completion regardless of whether an event loop is
    already running in this thread. asyncio.run() raises if one is (e.g. when
    this module gets imported during FastAPI/uvicorn's own startup, which was
    silently breaking every MCP tool registration) — in that case the
    coroutine runs in a fresh thread with its own loop instead."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result()

MCP_SERVERS = {
    "filesystem": StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem", os.path.join(os.path.dirname(__file__), "..", "..", "workspace")],
    ),
}

async def list_mcp_tools(server_params: StdioServerParameters) -> list[dict]:
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            return [{"name": t.name, "description": t.description} for t in tools.tools]

async def call_mcp_tool(server_params: StdioServerParameters, tool_name: str, arguments: dict) -> str:
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(tool_name, arguments)
            return "\n".join(c.text for c in result.content if hasattr(c, "text"))

def call_mcp_tool_sync(server_name: str, tool_name: str, arguments: dict) -> str:
    server_params = MCP_SERVERS[server_name]
    return _run_async(call_mcp_tool(server_params, tool_name, arguments))