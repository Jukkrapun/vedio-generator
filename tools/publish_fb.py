"""Upload an episode to the Facebook Page as a Reel, published now or scheduled.

Usage:
    python tools/publish_fb.py <episode_dir> --at "2026-11-22 22:00"   # schedule (Thai time)
    python tools/publish_fb.py <episode_dir> --now
    python tools/publish_fb.py <episode_dir> --at "..." --dry-run      # show what would be sent

Video: output/<series>/<episode>.mp4. Caption: the "## Facebook Reels" block of publish.md.
The post is logged in episode.json -> "posts" (platform "facebook") and the catalog is refreshed.
Needs FB_PAGE_ID + FB_PAGE_TOKEN in .env (create with tools/fb_token.py).
Meta's API cannot set the "AI info" label: add it in Meta Business Suite before the post goes live.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

from catalog import build_catalog
from media import ROOT

GRAPH = "https://graph.facebook.com/v21.0"
THAI_TZ = dt.timezone(dt.timedelta(hours=7))
MIN_LEAD = dt.timedelta(minutes=20)    # Meta requires scheduled time >= ~10 min ahead
MAX_LEAD = dt.timedelta(days=29)       # and at most ~30 days ahead
TIMEOUT_SEC = 600
FB_BLOCK_RE = re.compile(r"## Facebook Reels.*?```\n(.*?)\n```", re.S)


def request(url: str, data: bytes | None = None, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body = exc.read() or b"{}"
        try:
            detail = json.loads(body).get("error", {}).get("message", body.decode(errors="replace"))
        except json.JSONDecodeError:
            detail = body.decode(errors="replace")
        sys.exit(f"Facebook API error: {detail}")


def graph_post(path: str, **params: str) -> dict:
    return request(f"{GRAPH}/{path}", data=urllib.parse.urlencode(params).encode())


def read_caption(episode_dir: Path) -> str:
    text = (episode_dir / "publish.md").read_text(encoding="utf-8")
    match = FB_BLOCK_RE.search(text)
    if not match or "<" in match.group(1):
        sys.exit(f"No filled-in Facebook caption in {episode_dir / 'publish.md'}")
    return match.group(1).strip()


def parse_time(value: str) -> dt.datetime:
    when = dt.datetime.strptime(value, "%Y-%m-%d %H:%M").replace(tzinfo=THAI_TZ)
    lead = when - dt.datetime.now(THAI_TZ)
    if not MIN_LEAD <= lead <= MAX_LEAD:
        sys.exit(f"--at must be between 20 minutes and 29 days from now (Thai time), got {value}")
    return when


def upload_reel(page_id: str, token: str, video: Path, caption: str, when: dt.datetime | None) -> str:
    start = graph_post(f"{page_id}/video_reels", upload_phase="start", access_token=token)
    video_id = start["video_id"]
    data = video.read_bytes()
    request(start["upload_url"], data=data, headers={
        "Authorization": f"OAuth {token}", "offset": "0", "file_size": str(len(data))})
    finish = {"upload_phase": "finish", "video_id": video_id, "description": caption, "access_token": token}
    if when:
        finish.update(video_state="SCHEDULED", scheduled_publish_time=str(int(when.timestamp())))
    else:
        finish.update(video_state="PUBLISHED")
    if not graph_post(f"{page_id}/video_reels", **finish).get("success"):
        sys.exit(f"Upload finished but Facebook did not confirm the Reel (video id {video_id})")
    return video_id


def log_post(episode_dir: Path, video_id: str, when: dt.datetime) -> None:
    path = episode_dir / "episode.json"
    episode = json.loads(path.read_text(encoding="utf-8"))
    post = {"platform": "facebook", "date": when.strftime("%Y-%m-%d"), "time": when.strftime("%H:%M"),
            "url": f"https://www.facebook.com/reel/{video_id}", "video_id": video_id,
            "views": 0, "likes": 0, "saves": 0}
    episode["posts"] = [*episode.get("posts", []), post]
    path.write_text(json.dumps(episode, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("episode_dir", type=Path)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--at", help='Thai time "YYYY-MM-DD HH:MM"')
    group.add_argument("--now", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    episode_dir = args.episode_dir.resolve()
    series = episode_dir.parent.parent.name
    video = ROOT / "output" / series / f"{episode_dir.name}.mp4"
    if not video.is_file():
        sys.exit(f"Rendered video not found: {video}")
    episode = json.loads((episode_dir / "episode.json").read_text(encoding="utf-8"))
    if any(p.get("platform") == "facebook" for p in episode.get("posts", [])):
        sys.exit("This episode already has a Facebook post in episode.json - refusing to post twice")
    caption = read_caption(episode_dir)
    when = None if args.now else parse_time(args.at)
    label = "now" if when is None else when.strftime("%Y-%m-%d %H:%M (Thai time)")

    print(f"Episode: {episode_dir.name}\nVideo:   {video.name} ({video.stat().st_size / 1e6:.1f} MB)\nWhen:    {label}")
    print(f"Caption:\n{caption}\n")
    if args.dry_run:
        print("Dry run - nothing sent.")
        return

    load_dotenv(ROOT / ".env")
    page_id, token = os.environ.get("FB_PAGE_ID"), os.environ.get("FB_PAGE_TOKEN")
    if not page_id or not token:
        sys.exit("Missing FB_PAGE_ID / FB_PAGE_TOKEN in .env - run tools/fb_token.py first")
    video_id = upload_reel(page_id, token, video, caption, when)
    log_post(episode_dir, video_id, when or dt.datetime.now(THAI_TZ))
    build_catalog(series)
    print(f"Done: Reel {video_id} {'scheduled' if when else 'published'}. "
          "Add the AI label in Meta Business Suite before it goes live.")


if __name__ == "__main__":
    main()
