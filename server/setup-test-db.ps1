# setup-test-db.ps1
#
# One-time setup: creates the "toktickit_test" database and applies all
# migrations + seed data to it, completely separate from your dev database.
# Run this once (and again any time you add a new migration), from the
# "server" directory:
#
#   cd C:\Users\User\Downloads\toktickit\server
#   powershell -ExecutionPolicy Bypass -File .\setup-test-db.ps1
#
# Requires: psql on PATH, and server\.env.test present (copy from
# .env.test.example first).
#
# NOTE: this version deliberately avoids passing a postgresql://... URI
# string directly to psql. Some Windows psql builds mis-parse a URI when
# combined with certain flag combinations (-t -A -f together), which shows
# up as spurious "extra command-line argument ... ignored" warnings and can
# leave psql silently waiting at an interactive password prompt that never
# appears in a non-interactive script -- i.e. the script "hangs" with no
# visible error. Using explicit -h/-p/-U/-d flags plus $env:PGPASSWORD
# sidesteps both problems entirely.

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\.env.test")) {
    Write-Host "server\.env.test not found. Copy .env.test.example to .env.test first." -ForegroundColor Red
    exit 1
}

$envLine = Get-Content ".env.test" | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $envLine) {
    Write-Host "DATABASE_URL not found in .env.test" -ForegroundColor Red
    exit 1
}
$rawUrl = ($envLine -replace '^DATABASE_URL="?', '') -replace '"?$', ''

# Parse postgresql://user:password@host:port/dbname?schema=public into parts.
if ($rawUrl -notmatch '^postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)') {
    Write-Host "Could not parse DATABASE_URL in .env.test: $rawUrl" -ForegroundColor Red
    Write-Host "Expected format: postgresql://user:password@host:port/dbname?schema=public"
    exit 1
}
$pgUser = $Matches[1]
$pgPassword = $Matches[2]
$pgHost = $Matches[3]
$pgPort = $Matches[4]
$dbName = $Matches[5]

if ($dbName -notmatch "_test") {
    Write-Host "Refusing to run: '$dbName' does not look like a test database (expected '_test' in the name)." -ForegroundColor Red
    exit 1
}

Write-Host "Target test database: $dbName on $pgHost`:$pgPort (user: $pgUser)" -ForegroundColor Cyan

# PGPASSWORD avoids any interactive password prompt entirely -- this is the
# key fix for the "script just hangs" symptom.
$env:PGPASSWORD = $pgPassword

# -w: never prompt for a password (fail fast instead of hanging if
# PGPASSWORD is somehow wrong/missing).
$commonArgs = @("-h", $pgHost, "-p", $pgPort, "-U", $pgUser, "-w")

Write-Host "Checking whether '$dbName' already exists..." -ForegroundColor Cyan
$exists = & psql @commonArgs -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$dbName';"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Could not connect to PostgreSQL. Check host/port/user/password in .env.test, and that PostgreSQL is running." -ForegroundColor Red
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    exit 1
}

if (-not $exists -or $exists.Trim() -ne "1") {
    Write-Host "Creating '$dbName'..." -ForegroundColor Cyan
    & psql @commonArgs -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $dbName;"
    if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE failed" }
    Write-Host "  Created." -ForegroundColor Green
} else {
    Write-Host "  Already exists, reusing it." -ForegroundColor Yellow
}

Write-Host "Applying migrations to the test database..." -ForegroundColor Cyan
$env:DATABASE_URL = $rawUrl
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed" }

Write-Host "Seeding the test database..." -ForegroundColor Cyan
npx prisma db seed
if ($LASTEXITCODE -ne 0) { throw "prisma db seed failed" }

Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Test database ready. You can now run:" -ForegroundColor Green
Write-Host "  npm test"
Write-Host "and it will use '$dbName', never your dev database."
