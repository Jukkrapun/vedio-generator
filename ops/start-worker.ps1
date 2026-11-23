# Run the ops job worker on the host (needs the local `claude` and `codex` logins for scripts/images).
# Stops the Docker worker first so only one worker picks up jobs.
#   powershell -ExecutionPolicy Bypass -File ops/start-worker.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
docker compose stop worker 2>$null | Out-Null
Write-Host "Docker worker stopped. Host worker running - Ctrl+C to stop (then 'docker compose start worker' to go back)."
& .\.venv\Scripts\python.exe ops\worker.py
