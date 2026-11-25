# Run the ops job worker on the host (needs the local `claude` and `codex` logins for scripts/images).
# Stops the Docker worker first so only one worker picks up jobs. The worker exits with code 3 when
# ops/worker.py is updated (between jobs); this loop then relaunches it with the new code.
#   powershell -ExecutionPolicy Bypass -File D:\Project\vdio-generator\ops\start-worker.ps1
Set-Location (Split-Path $PSScriptRoot -Parent)
# docker prints progress on stderr; Windows PowerShell 5.1 turns that into an error record, so run it via cmd
cmd /c "docker compose stop worker >nul 2>&1"
Write-Host "Docker worker stopped. Host worker running - Ctrl+C to stop (then 'docker compose start worker' to go back)."
do {
    & .\.venv\Scripts\python.exe ops\worker.py
    $code = $LASTEXITCODE
    if ($code -eq 3) { Write-Host "Reloading worker (code updated)..." }
} while ($code -eq 3)
