# test-lab3-migration.ps1
#
# Proves that the Lab 3 migration (20260913000000_lab3_users_roles_workflow)
# preserves pre-existing Lab 2 data, instead of destroying it. Run this from
# the "server" directory, e.g.:
#
#   cd C:\Users\User\Downloads\toktickit\server
#   powershell -ExecutionPolicy Bypass -File .\test-lab3-migration.ps1
#
# Requires: psql on PATH (comes with a normal PostgreSQL install - check
# with `psql --version`; if missing, add
# "C:\Program Files\PostgreSQL\<version>\bin" to your PATH first).

$ErrorActionPreference = "Stop"
$AnyFailure = $false

function Write-Step($msg) {
    Write-Host ""
    Write-Host "== $msg ==" -ForegroundColor Cyan
}
function Write-Pass($msg) { Write-Host "  PASS: $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red; $script:AnyFailure = $true }

# Runs a SQL string against $url by writing it to a temp .sql file first.
# This avoids nesting PowerShell string-escaping inside psql's -c argument,
# which is fragile once the SQL itself needs double-quoted identifiers.
function Invoke-Sql {
    param([string]$Url, [string]$Sql, [switch]$Quiet)
    $tmp = [System.IO.Path]::GetTempFileName() + ".sql"
    Set-Content -Path $tmp -Value $Sql -Encoding UTF8
    try {
        if ($Quiet) {
            psql -v ON_ERROR_STOP=1 -f $tmp $Url | Out-Null
        } else {
            psql -v ON_ERROR_STOP=1 -t -A -f $tmp $Url
        }
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

# --- 0. Preconditions -------------------------------------------------------
if (-not (Test-Path ".\prisma\schema.prisma")) {
    Write-Host "Run this script from the 'server' directory (prisma\schema.prisma not found here)." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "psql was not found on PATH. Add PostgreSQL's bin folder to PATH and re-run, e.g.:" -ForegroundColor Red
    Write-Host '  $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"'
    exit 1
}
if (-not (Test-Path ".\.env")) {
    Write-Host ".env not found in server\ - copy .env.example to .env first." -ForegroundColor Red
    exit 1
}

# --- 1. Parse DATABASE_URL from .env to build the test DB's URL ------------
Write-Step "Reading DATABASE_URL from .env"
$envLine = Get-Content ".env" | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $envLine) {
    Write-Host "DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}
$originalUrl = ($envLine -replace '^DATABASE_URL="?', '') -replace '"?$', ''
if ($originalUrl -notmatch '^(postgresql://[^/]+)/([^?]+)(\?.*)?$') {
    Write-Host "Could not parse DATABASE_URL: $originalUrl" -ForegroundColor Red
    exit 1
}
$hostPart  = $Matches[1]
$queryPart = $Matches[3]
$maintenanceUrl = "$hostPart/postgres"
$testDbName = "toktickit_migration_test"
$testUrl = "$hostPart/$testDbName$queryPart"
# psql (libpq) does not understand Prisma's "schema" URI query parameter and
# errors on it ("invalid URI query parameter"). Use this variant, without any
# query string, for every raw psql/Invoke-Sql call. $testUrl (with the query
# string) is still used for Prisma's DATABASE_URL.
$testUrlPsql = "$hostPart/$testDbName"

Write-Host "  Real dev DB URL   : $originalUrl"
Write-Host "  Test DB URL       : $testUrl"
Write-Host "  (Your real 'toktickit' database is never touched by this script.)"

# --- 2. Create a clean test database ----------------------------------------
Write-Step "Creating throwaway database '$testDbName'"
Invoke-Sql -Url $maintenanceUrl -Sql "DROP DATABASE IF EXISTS $testDbName;" -Quiet
Invoke-Sql -Url $maintenanceUrl -Sql "CREATE DATABASE $testDbName;" -Quiet
Write-Host "  Created."

# --- 3. Apply Lab 2-only migrations -----------------------------------------
Write-Step "Applying Lab 2 migrations only (Lab 3 migration temporarily set aside)"
$lab3MigrationDir = ".\prisma\migrations\20260912164321_lab3_users_roles"
$tempHoldDir = "..\_temp_lab3_migration_holder"

if (-not (Test-Path $lab3MigrationDir)) {
    Write-Host "Expected migration folder not found: $lab3MigrationDir" -ForegroundColor Red
    Write-Host "Check the folder name matches exactly, then re-run." -ForegroundColor Red
    exit 1
}

if (Test-Path $tempHoldDir) { Remove-Item $tempHoldDir -Recurse -Force }
Move-Item $lab3MigrationDir $tempHoldDir

$env:DATABASE_URL = $testUrl
try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy (Lab 2 only) failed" }
} finally {
    Move-Item $tempHoldDir $lab3MigrationDir
}
Write-Host "  Lab 2 schema applied to test DB."

# --- 4. Insert fake "real Lab 2 usage" data ---------------------------------
Write-Step "Inserting pre-existing Lab 2 data (simulating real prior usage)"

$seedSql = @'
INSERT INTO "Category" (name, "isActive") VALUES ('Hardware', true)
  ON CONFLICT (name) DO NOTHING;

INSERT INTO "RelatedSystem" (name, "isActive") VALUES ('Corporate Laptop', true)
  ON CONFLICT (name) DO NOTHING;

INSERT INTO "RequesterUser" (name, email, "isActive", "updatedAt")
  VALUES ('Old Lab2 User', 'old.lab2.user@kmutt.ac.th', true, NOW())
  ON CONFLICT (email) DO NOTHING;
'@
Invoke-Sql -Url $testUrlPsql -Sql $seedSql -Quiet

$requesterId = (Invoke-Sql -Url $testUrlPsql -Sql "SELECT id FROM ""RequesterUser"" WHERE email = 'old.lab2.user@kmutt.ac.th';").Trim()
$categoryId  = (Invoke-Sql -Url $testUrlPsql -Sql "SELECT id FROM ""Category"" WHERE name = 'Hardware';").Trim()
$systemId    = (Invoke-Sql -Url $testUrlPsql -Sql "SELECT id FROM ""RelatedSystem"" WHERE name = 'Corporate Laptop';").Trim()

if (-not $requesterId) { Write-Fail "Could not obtain a RequesterUser id after insert"; exit 1 }

$ticketSql = @"
INSERT INTO "Ticket" ("ticketNumber", "requesterId", "categoryId", "relatedSystemId", summary, description, "requestedPriority", "itPriority", "currentStatus", "updatedAt")
VALUES ('TKT-OLD-000001', $requesterId, $categoryId, $systemId, 'Pre-existing Lab 2 ticket', 'Created before Lab 3 migration ran.', 'MEDIUM', 'MEDIUM', 'NEW', NOW())
ON CONFLICT ("ticketNumber") DO NOTHING;
"@
Invoke-Sql -Url $testUrlPsql -Sql $ticketSql -Quiet
$ticketId = (Invoke-Sql -Url $testUrlPsql -Sql "SELECT id FROM ""Ticket"" WHERE ""ticketNumber"" = 'TKT-OLD-000001';").Trim()

Write-Host "  Inserted RequesterUser id=$requesterId, Ticket id=$ticketId ('TKT-OLD-000001')."

# --- 5. Apply the Lab 3 migration on TOP of this real data ------------------
Write-Step "Applying Lab 3 migration on top of pre-existing data (the real test)"
$env:DATABASE_URL = $testUrl
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Fail "prisma migrate deploy (Lab 3) exited with an error - see output above."
} else {
    Write-Host "  Lab 3 migration applied without error."
}

# --- 6. Verify the pre-existing data survived, correctly transformed --------
Write-Step "Verifying pre-existing data survived the migration"

$userRow = Invoke-Sql -Url $testUrlPsql -Sql "SELECT id || '|' || name || '|' || email || '|' || role::text || '|' || ""isActive""::text || '|' || ""mustChangePassword""::text FROM ""User"" WHERE email = 'old.lab2.user@kmutt.ac.th';"
if (-not $userRow.Trim()) {
    Write-Fail "The migrated user row is GONE. Data was lost."
} else {
    $parts = $userRow.Trim().Split("|")
    $uid = $parts[0]; $urole = $parts[3]; $uactive = $parts[4]; $umustchange = $parts[5]
    if ($uid -eq $requesterId) { Write-Pass "User kept the same id ($uid) across the rename" }
    else { Write-Fail "User id changed ($requesterId -> $uid) - foreign keys may now be wrong" }
    if ($urole -eq "REQUESTER") { Write-Pass "role defaulted to REQUESTER" }
    else { Write-Fail "role is '$urole', expected 'REQUESTER'" }
    if ($umustchange -eq "true") { Write-Pass "mustChangePassword defaulted to true (forces a real password at next login)" }
    else { Write-Fail "mustChangePassword is '$umustchange', expected true" }
    if ($uactive -eq "true") { Write-Pass "isActive preserved as true" }
    else { Write-Fail "isActive is '$uactive', expected true" }
}

$ticketRow = Invoke-Sql -Url $testUrlPsql -Sql "SELECT id || '|' || ""ticketNumber"" || '|' || ""requesterId""::text || '|' || COALESCE(""ownerId""::text, 'NULL') || '|' || ""currentStatus""::text || '|' || ""problemAppearsResolved""::text FROM ""Ticket"" WHERE ""ticketNumber"" = 'TKT-OLD-000001';"
if (-not $ticketRow.Trim()) {
    Write-Fail "The pre-existing Ticket row is GONE. Data was lost."
} else {
    $tparts = $ticketRow.Trim().Split("|")
    $tid = $tparts[0]; $treq = $tparts[2]; $towner = $tparts[3]; $tstatus = $tparts[4]; $tresolved = $tparts[5]
    if ($tid -eq $ticketId) { Write-Pass "Ticket kept the same id ($tid)" }
    else { Write-Fail "Ticket id changed ($ticketId -> $tid)" }
    if ($treq -eq $requesterId) { Write-Pass "Ticket.requesterId still points at the same (renamed) User row - ownership intact" }
    else { Write-Fail "Ticket.requesterId is '$treq', expected '$requesterId' - ownership broken" }
    if ($towner -eq "NULL") { Write-Pass "ownerId correctly NULL (unassigned) on a migrated ticket" }
    else { Write-Fail "ownerId is '$towner', expected NULL for a freshly-migrated ticket" }
    if ($tstatus -eq "NEW") { Write-Pass "currentStatus preserved as NEW" }
    else { Write-Fail "currentStatus is '$tstatus', expected 'NEW' (should not change on migration)" }
    if ($tresolved -eq "false") { Write-Pass "problemAppearsResolved correctly defaulted to false" }
    else { Write-Fail "problemAppearsResolved is '$tresolved', expected false" }
}

# --- 7. Restore your shell's DATABASE_URL and report ------------------------
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue

Write-Step "Result"
if ($AnyFailure) {
    Write-Host "MIGRATION TEST FAILED - see FAIL lines above. Do not merge feature/lab3-db-migration yet." -ForegroundColor Red
} else {
    Write-Host "MIGRATION TEST PASSED - the Lab 3 migration preserves pre-existing Lab 2 data correctly." -ForegroundColor Green
    Write-Host "You can now check this off in tests.md (e.g. MIG-01) with this script's output as evidence."
}

Write-Host ""
Write-Host "Note: '$testDbName' was left in place so you can inspect it with Prisma Studio:"
Write-Host "  `$env:DATABASE_URL = `"$testUrl`""
Write-Host "  npx prisma studio"
Write-Host "When done, drop it with (run from server\, using your normal DATABASE_URL):"
Write-Host "  psql `"$maintenanceUrl`" -c `"DROP DATABASE $testDbName;`""
Write-Host ""
Write-Host "Your .env file was never modified - your real dev database is untouched."
