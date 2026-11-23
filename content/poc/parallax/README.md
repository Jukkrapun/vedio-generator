# POC: 2.5D parallax (free, CPU only)

Still image -> depth map (Depth Anything V2 Small, CPU) -> depth-weighted camera move -> mp4.
Separate venv here (torch CPU + transformers + opencv) so the main `.venv` is untouched.

```powershell
cd content/poc/parallax
.venv\Scripts\python.exe parallax.py src/bedroom.png --pan 0.04 0 --zoom 0.10
.venv\Scripts\python.exe parallax.py src/desk.png --pan 0.02 -0.02 --zoom 0.12
```

Outputs (in `output/poc/parallax/`) `<name>-depth.png`, `-zoom.mp4` (today's Ken Burns), `-parallax.mp4`, `-compare.mp4` (side by side).
Options: `--pan x y`, `--zoom`, `--focus` (depth that stays still), `--seconds`.

Result 2026-11-23: works on both test images (CPU, a few minutes total incl. first model download), no tearing at these strengths.
Not wired into `render_reel.py` yet.
