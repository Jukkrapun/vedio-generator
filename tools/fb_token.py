"""Turn a short-lived Facebook user token into a never-expiring Page token, stored in .env.

Usage (one time, or again if the token is revoked):
    1. Put these in .env:
         FB_APP_ID=...        (App settings -> Basic)
         FB_APP_SECRET=...    (App settings -> Basic)
         FB_USER_TOKEN=...    (Graph API Explorer -> Generate Access Token)
    2. python tools/fb_token.py ["page name"]

Writes FB_PAGE_ID and FB_PAGE_TOKEN to .env and removes FB_USER_TOKEN. Tokens are never printed.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

from dotenv import load_dotenv

from media import ROOT

GRAPH = "https://graph.facebook.com/v21.0"
ENV_PATH = ROOT / ".env"
DEFAULT_PAGE = "ตอนตีสอง"
TIMEOUT_SEC = 30


def graph_get(path: str, **params: str) -> dict:
    url = f"{GRAPH}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_SEC) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        detail = json.loads(exc.read() or b"{}").get("error", {}).get("message", str(exc))
        sys.exit(f"Facebook API error on /{path}: {detail}")


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        sys.exit(f"Missing {name} in .env (see the usage notes at the top of this script)")
    return value


def update_env(updates: dict[str, str | None]) -> None:
    """Set (or delete, when value is None) keys in .env, keeping every other line as is."""
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.exists() else []
    kept = [ln for ln in lines if ln.split("=", 1)[0].strip() not in updates]
    kept += [f"{k}={v}" for k, v in updates.items() if v is not None]
    ENV_PATH.write_text("\n".join(kept) + "\n", encoding="utf-8")


def main() -> None:
    load_dotenv(ENV_PATH)
    app_id, app_secret = require_env("FB_APP_ID"), require_env("FB_APP_SECRET")
    user_token = require_env("FB_USER_TOKEN")
    page_name = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PAGE

    long_user = graph_get("oauth/access_token", grant_type="fb_exchange_token", client_id=app_id,
                          client_secret=app_secret, fb_exchange_token=user_token)["access_token"]
    pages = graph_get("me/accounts", access_token=long_user, fields="id,name,access_token").get("data", [])
    if not pages:
        sys.exit("No pages found: when generating the token, tick the page and allow all permissions")
    match = [p for p in pages if p["name"] == page_name] or (pages if len(pages) == 1 else [])
    if not match:
        sys.exit(f"Page '{page_name}' not found. Pages available: {', '.join(p['name'] for p in pages)}")
    page = match[0]

    info = graph_get("debug_token", input_token=page["access_token"],
                     access_token=f"{app_id}|{app_secret}")["data"]
    expires = "never" if not info.get("expires_at") else f"unix {info['expires_at']}"
    update_env({"FB_PAGE_ID": page["id"], "FB_PAGE_TOKEN": page["access_token"], "FB_USER_TOKEN": None})
    print(f"Saved Page token for '{page['name']}' (id {page['id']}) to .env - expires: {expires}")
    print(f"Scopes: {', '.join(info.get('scopes', []))}")


if __name__ == "__main__":
    main()
