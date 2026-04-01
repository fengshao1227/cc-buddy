# Claude Buddy Reroller — One-Click Launcher (Windows)
# Usage: .\run.ps1 search --species duck --rarity legendary

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script = Join-Path $ScriptDir "buddy-reroll.mjs"

# Prefer Bun (100% accurate), fallback to Node.js
$bun = Get-Command bun -ErrorAction SilentlyContinue
$node = Get-Command node -ErrorAction SilentlyContinue

if ($bun) {
    & bun $Script @args
} elseif ($node) {
    $ver = (node -v) -replace 'v','' -split '\.' | Select-Object -First 1
    if ([int]$ver -lt 16) {
        Write-Host "Node.js v16+ required (found v$ver)." -ForegroundColor Red
        Write-Host "Or install Bun: powershell -c `"irm bun.sh/install.ps1 | iex`"" -ForegroundColor Yellow
        exit 1
    }
    & node $Script @args
} else {
    Write-Host "No JavaScript runtime found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install one of:" -ForegroundColor Yellow
    Write-Host "  Bun (recommended):  powershell -c `"irm bun.sh/install.ps1 | iex`""
    Write-Host "  Node.js:            https://nodejs.org/"
    exit 1
}
