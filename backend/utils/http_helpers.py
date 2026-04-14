import json

import azure.functions as func
 
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


# ── Helpers ───────────────────────────────────────────────────────────

# Return a JSON response with CORS headers
def json_response(body: dict | list, status_code: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body, default=str),
        status_code=status_code,
        headers=CORS_HEADERS,
    )

# Return a JSON error response with CORS headers.
def error_response(message: str, status_code: int = 400) -> func.HttpResponse:
    return json_response({"error": message}, status_code)

# Return a 200 OK for OPTIONS preflight requests.
def preflight_response() -> func.HttpResponse:
    return func.HttpResponse(status_code=200, headers=CORS_HEADERS)