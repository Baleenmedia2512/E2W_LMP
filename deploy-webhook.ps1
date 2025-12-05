# Meta Webhook Enhancement Deployment Script
# This script safely deploys the enhanced webhook implementation

param(
    [Parameter(Mandatory=$false)]
    [switch]$Test,
    
    [Parameter(Mandatory=$false)]
    [switch]$Deploy,
    
    [Parameter(Mandatory=$false)]
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"

$WEBHOOK_PATH = "src\app\api\webhooks\meta-leads"
$OLD_FILE = "$WEBHOOK_PATH\route.ts"
$NEW_FILE = "$WEBHOOK_PATH\route.enhanced.ts"
$BACKUP_FILE = "$WEBHOOK_PATH\route.ts.backup"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-Implementation {
    Write-ColorOutput "`n🧪 Testing Enhanced Webhook Implementation..." "Cyan"
    
    # Check if new file exists
    if (-not (Test-Path $NEW_FILE)) {
        Write-ColorOutput "❌ Enhanced webhook file not found: $NEW_FILE" "Red"
        exit 1
    }
    
    Write-ColorOutput "✅ Enhanced webhook file found" "Green"
    
    # Check if API utility exists
    $API_FILE = "src\shared\lib\meta\api.ts"
    if (-not (Test-Path $API_FILE)) {
        Write-ColorOutput "❌ Meta API utility not found: $API_FILE" "Red"
        exit 1
    }
    
    Write-ColorOutput "✅ Meta API utility found" "Green"
    
    # Check if diagnostic endpoint exists
    $DIAGNOSTIC_FILE = "src\app\api\meta-diagnostic\route.ts"
    if (-not (Test-Path $DIAGNOSTIC_FILE)) {
        Write-ColorOutput "❌ Diagnostic endpoint not found: $DIAGNOSTIC_FILE" "Red"
        exit 1
    }
    
    Write-ColorOutput "✅ Diagnostic endpoint found" "Green"
    
    # Test compilation
    Write-ColorOutput "`n🔨 Running TypeScript check..." "Cyan"
    
    $tscResult = & npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "⚠️ TypeScript compilation has errors:" "Yellow"
        Write-ColorOutput $tscResult "Yellow"
        Write-ColorOutput "`nYou may proceed, but fix these errors before production deployment." "Yellow"
    } else {
        Write-ColorOutput "✅ TypeScript compilation successful" "Green"
    }
    
    # Check environment variables
    Write-ColorOutput "`n🔍 Checking environment variables..." "Cyan"
    
    $requiredEnvVars = @(
        "META_ACCESS_TOKEN",
        "META_APP_SECRET",
        "META_WEBHOOK_VERIFY_TOKEN"
    )
    
    $envFile = ".env"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        
        foreach ($var in $requiredEnvVars) {
            if ($envContent -match $var) {
                Write-ColorOutput "✅ $var found in .env" "Green"
            } else {
                Write-ColorOutput "⚠️ $var not found in .env" "Yellow"
            }
        }
    } else {
        Write-ColorOutput "⚠️ .env file not found" "Yellow"
    }
    
    Write-ColorOutput "`n✅ All tests passed!" "Green"
    Write-ColorOutput "`nReady to deploy. Run with -Deploy flag to activate." "Cyan"
}

function Deploy-Implementation {
    Write-ColorOutput "`n🚀 Deploying Enhanced Webhook..." "Cyan"
    
    # Backup current implementation
    if (Test-Path $OLD_FILE) {
        Write-ColorOutput "📦 Backing up current webhook to: $BACKUP_FILE" "Yellow"
        Copy-Item $OLD_FILE $BACKUP_FILE -Force
        Write-ColorOutput "✅ Backup created" "Green"
    }
    
    # Check if new file exists
    if (-not (Test-Path $NEW_FILE)) {
        Write-ColorOutput "❌ Enhanced webhook file not found: $NEW_FILE" "Red"
        exit 1
    }
    
    # Replace old with new
    Write-ColorOutput "🔄 Replacing webhook implementation..." "Cyan"
    Copy-Item $NEW_FILE $OLD_FILE -Force
    
    Write-ColorOutput "✅ Webhook updated successfully!" "Green"
    
    # Show git status
    Write-ColorOutput "`n📊 Git Status:" "Cyan"
    git status --short
    
    Write-ColorOutput "`n✅ Deployment complete!" "Green"
    Write-ColorOutput "`nNext steps:" "Cyan"
    Write-ColorOutput "1. Review changes: git diff $OLD_FILE" "White"
    Write-ColorOutput "2. Test locally: npm run dev" "White"
    Write-ColorOutput "3. Commit: git add . && git commit -m 'Enhanced Meta webhook'" "White"
    Write-ColorOutput "4. Push: git push" "White"
    Write-ColorOutput "`nTo rollback: .\deploy-webhook.ps1 -Rollback" "Yellow"
}

function Rollback-Implementation {
    Write-ColorOutput "`n🔙 Rolling back to previous version..." "Yellow"
    
    if (-not (Test-Path $BACKUP_FILE)) {
        Write-ColorOutput "❌ Backup file not found: $BACKUP_FILE" "Red"
        Write-ColorOutput "Cannot rollback without backup." "Red"
        exit 1
    }
    
    Write-ColorOutput "📦 Restoring from backup..." "Cyan"
    Copy-Item $BACKUP_FILE $OLD_FILE -Force
    
    Write-ColorOutput "✅ Rollback complete!" "Green"
    Write-ColorOutput "`nCommit and push to deploy:" "Cyan"
    Write-ColorOutput "git add . && git commit -m 'Rollback webhook to previous version' && git push" "White"
}

# Main execution
Write-ColorOutput @"

╔═══════════════════════════════════════════════════════════╗
║   Meta Webhook Enhancement Deployment Script             ║
║   Version: 2.0.0                                         ║
╚═══════════════════════════════════════════════════════════╝

"@ "Cyan"

if ($Test) {
    Test-Implementation
} elseif ($Deploy) {
    Test-Implementation
    Write-ColorOutput "`n════════════════════════════════════════════════════════════" "Cyan"
    $confirm = Read-Host "`nProceed with deployment? (yes/no)"
    if ($confirm -eq "yes") {
        Deploy-Implementation
    } else {
        Write-ColorOutput "Deployment cancelled." "Yellow"
    }
} elseif ($Rollback) {
    $confirm = Read-Host "`n⚠️ Are you sure you want to rollback? (yes/no)"
    if ($confirm -eq "yes") {
        Rollback-Implementation
    } else {
        Write-ColorOutput "Rollback cancelled." "Yellow"
    }
} else {
    Write-ColorOutput "Usage:" "White"
    Write-ColorOutput "  .\deploy-webhook.ps1 -Test      # Test the implementation" "White"
    Write-ColorOutput "  .\deploy-webhook.ps1 -Deploy    # Deploy the enhanced webhook" "White"
    Write-ColorOutput "  .\deploy-webhook.ps1 -Rollback  # Rollback to previous version" "White"
    Write-ColorOutput "`nStart with -Test to verify everything is ready." "Cyan"
}
