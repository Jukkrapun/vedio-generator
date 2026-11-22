"""Step timing for pipeline logs: `with step("name"): ...` prints start/end with duration;
report() prints a summary table of every step (also failed ones)."""
import time
from contextlib import contextmanager

_steps: list[tuple[str, float, str]] = []  # (name, seconds, status)
_t0 = time.time()


def _clock() -> str:
    return time.strftime("%H:%M:%S")


def fmt(sec: float) -> str:
    m, s = divmod(int(round(sec)), 60)
    return f"{m}m{s:02d}s" if m else f"{sec:.1f}s"


@contextmanager
def step(name: str):
    t = time.time()
    print(f"[{_clock()}] >> {name}", flush=True)
    status = "ok"
    try:
        yield
    except BaseException:
        status = "FAILED"
        raise
    finally:
        dur = time.time() - t
        _steps.append((name, dur, status))
        print(f"[{_clock()}] TIME {name}: {fmt(dur)}{'' if status == 'ok' else ' (FAILED)'}", flush=True)


def report() -> None:
    if not _steps:
        return
    width = max(len(n) for n, _, _ in _steps)
    print("\n=== Time per step ===")
    for name, dur, status in _steps:
        print(f"  {name:<{width}}  {fmt(dur):>8}  {'' if status == 'ok' else status}")
    print(f"  {'TOTAL (wall clock)':<{width}}  {fmt(time.time() - _t0):>8}", flush=True)
