import json
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


PORT = int(os.getenv("AGENT_PORT", "4000"))


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class AgentHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(204, {})

    def do_GET(self):
        if self.path != "/health":
            self._send_json(404, {"error": "not found"})
            return

        self._send_json(
            200,
            {
                "service": "agent",
                "status": "ok",
                "timestamp": utc_now(),
            },
        )

    def do_POST(self):
        if self.path != "/chat":
            self._send_json(404, {"error": "not found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json(400, {"error": "invalid json"})
            return

        message = str(payload.get("message", "")).strip()

        if not message:
            self._send_json(400, {"error": "message is required"})
            return

        self._send_json(200, {"reply": f"Agent received: {message}", "source": "agent"})

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), AgentHandler)
    print(f"Agent service listening on http://localhost:{PORT}")
    server.serve_forever()
