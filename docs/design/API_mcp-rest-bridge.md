# API_mcp-rest-bridge

## The Hill
Expose the Graft MCP API surface over a standard REST HTTP interface. This provides an alternative transport for clients that cannot easily speak the standard MCP protocol (stdio or SSE), allowing them to invoke Graft's structural history and agentic tools using standard HTTP GET and POST requests.

## Acceptance Criteria
- A new HTTP server entry point is created that wraps `createGraftServer()`.
- `GET /tools` lists all registered MCP tools with their schemas.
- `POST /tools/:name` executes the given MCP tool, accepting JSON arguments in the request body and returning the JSON result.
- Appropriate HTTP status codes are returned (e.g., 200 for success, 400 for bad input, 404 for unknown tool, 500 for execution errors).

## Playback Questions
- Can a client use `curl` to POST to `/tools/file_outline` with a file path and receive the same structural outline as the MCP stdio interface?
- If a tool fails gracefully with an MCP error string, does the REST API return it properly formatted?

## Non-Goals
- Complete implementation of the official MCP HTTP transport specification (this is a simplified REST bridge, not an official MCP SSE server).
- Authentication or authorization layers beyond what Graft's core already provides.
- Daemon mode support for this initial proof-of-concept (repo-local mode is the target).

## Test Strategy
- Unit tests will instantiate the REST server on an ephemeral port.
- Tests will perform a `GET /tools` to verify the list of tools.
- Tests will perform a `POST /tools/stats` (or similar safe tool) to verify execution and result serialization.
- Tests will verify error handling (404 for unknown tool).
