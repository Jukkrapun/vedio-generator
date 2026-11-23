# Run the ops job worker on the host (needs the local `claude` and `codex` logins for scripts/images).
# Stops the Docker worker first so only one worker picks up jobs.
#   powershell -ExecutionPolicy Bypass -File D:\Project\vdio-generator\ops\start-worker.ps1
Set-Location (Split-Path $PSScriptRoot -Parent)
# docker prints progress on stderr; Windows PowerShell 5.1 turns that into an error record, so run it via cmd
cmd /c "docker compose stop worker >nul 2>&1"
Write-Host "Docker worker stopped. Host worker running - Ctrl+C to stop (then 'docker compose start worker' to go back)."
& .\.venv\Scripts\python.exe ops\worker.py
