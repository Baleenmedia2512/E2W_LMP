# Update Database Credentials Script
# Run this after getting correct credentials from Supabase

Write-Host "=== Supabase Database Credentials Update ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Before running this script, get your credentials from:"
Write-Host "https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database" -ForegroundColor Yellow
Write-Host ""

# Get inputs
$projectRef = Read-Host "Enter your Supabase Project Ref (e.g., wkwrrdcjknvupwsfdjtd)"
$password = Read-Host "Enter your database password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# URL encode the password
Add-Type -AssemblyName System.Web
$passwordEncoded = [System.Web.HttpUtility]::UrlEncode($passwordPlain)

# Build connection strings
$poolerUrl = "postgresql://postgres:${passwordEncoded}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
$directUrl = "postgresql://postgres:${passwordEncoded}@db.${projectRef}.supabase.co:5432/postgres"

Write-Host ""
Write-Host "Generated connection strings (password masked):" -ForegroundColor Green
Write-Host "DATABASE_URL=" -NoNewline
Write-Host $poolerUrl.Replace($passwordEncoded, "***")
Write-Host "DIRECT_DATABASE_URL=" -NoNewline
Write-Host $directUrl.Replace($passwordEncoded, "***")
Write-Host ""

$confirm = Read-Host "Update .env.local and .env files with these credentials? (y/n)"

if ($confirm -eq 'y') {
    # Update .env.local
    $envLocalContent = Get-Content .env.local -Raw
    if ($envLocalContent -match 'DATABASE_URL=') {
        $envLocalContent = $envLocalContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$poolerUrl`""
    } else {
        $envLocalContent += "`n`n# Database - Supabase PostgreSQL`nDATABASE_URL=`"$poolerUrl`""
    }
    
    if ($envLocalContent -match 'DIRECT_DATABASE_URL=') {
        $envLocalContent = $envLocalContent -replace 'DIRECT_DATABASE_URL="[^"]*"', "DIRECT_DATABASE_URL=`"$directUrl`""
    } else {
        $envLocalContent += "`nDIRECT_DATABASE_URL=`"$directUrl`""
    }
    
    $envLocalContent | Set-Content .env.local -NoNewline
    Write-Host "✓ Updated .env.local" -ForegroundColor Green
    
    # Update .env
    $envContent = Get-Content .env -Raw
    $envContent = $envContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$poolerUrl`""
    $envContent = $envContent -replace 'DIRECT_DATABASE_URL="[^"]*"', "DIRECT_DATABASE_URL=`"$directUrl`""
    $envContent | Set-Content .env -NoNewline
    Write-Host "✓ Updated .env" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart your Next.js dev server (Ctrl+C then npm run dev)"
    Write-Host "2. Run: npx prisma generate"
    Write-Host "3. Test connection: node test-db-connection.js"
} else {
    Write-Host "Cancelled. No files were updated." -ForegroundColor Yellow
}
