# Cleanup Script for Database Comparison Project

param(
    [switch]$All,
    [switch]$Results,
    [switch]$Docker,
    [switch]$NodeModules,
    [switch]$Help
)

function Show-Help {
    Write-Host ""
    Write-Host "Database Comparison - Cleanup Script" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\cleanup.ps1 [options]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Results       Remove test results (JSON and HTML files)" -ForegroundColor White
    Write-Host "  -Docker        Stop and remove Docker containers" -ForegroundColor White
    Write-Host "  -NodeModules   Remove node_modules directory" -ForegroundColor White
    Write-Host "  -All           Remove everything (Results + Docker + NodeModules)" -ForegroundColor White
    Write-Host "  -Help          Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\cleanup.ps1 -Results      # Remove only test results" -ForegroundColor Gray
    Write-Host "  .\cleanup.ps1 -Docker       # Stop Docker containers" -ForegroundColor Gray
    Write-Host "  .\cleanup.ps1 -All          # Full cleanup" -ForegroundColor Gray
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

if (-not ($All -or $Results -or $Docker -or $NodeModules)) {
    Write-Host ""
    Write-Host "No cleanup option specified!" -ForegroundColor Yellow
    Show-Help
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Comparison Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$cleaned = $false

# Clean test results
if ($All -or $Results) {
    Write-Host "Cleaning test results..." -ForegroundColor Yellow
    
    $resultFiles = @(
        "benchmarks\postgres-results.json",
        "benchmarks\mongodb-results.json",
        "benchmarks\bulk-operations-results.json",
        "benchmarks\aggregation-results.json",
        "benchmarks\concurrent-results.json"
    )
    
    $htmlFiles = @(
        "benchmarks\dashboard.html"
    )
    
    $removedCount = 0
    
    foreach ($file in $resultFiles) {
        if (Test-Path $file) {
            Remove-Item $file -Force
            Write-Host "  ✓ Removed: $file" -ForegroundColor Green
            $removedCount++
        }
    }
    
    foreach ($file in $htmlFiles) {
        if (Test-Path $file) {
            Remove-Item $file -Force
            Write-Host "  ✓ Removed: $file" -ForegroundColor Green
            $removedCount++
        }
    }
    
    if ($removedCount -eq 0) {
        Write-Host "  No test results found" -ForegroundColor Gray
    } else {
        Write-Host "  Removed $removedCount file(s)" -ForegroundColor Cyan
    }
    
    $cleaned = $true
    Write-Host ""
}

# Clean Docker
if ($All -or $Docker) {
    Write-Host "Cleaning Docker resources..." -ForegroundColor Yellow
    
    # Stop containers
    Write-Host "  Stopping containers..." -ForegroundColor Gray
    docker-compose down 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Containers stopped and removed" -ForegroundColor Green
    } else {
        Write-Host "  No containers running" -ForegroundColor Gray
    }
    
    # Optional: Remove volumes
    $removeVolumes = Read-Host "  Remove Docker volumes (database data)? (y/N)"
    if ($removeVolumes -eq 'y' -or $removeVolumes -eq 'Y') {
        Write-Host "  Removing volumes..." -ForegroundColor Gray
        docker-compose down -v 2>&1 | Out-Null
        Write-Host "  ✓ Volumes removed" -ForegroundColor Green
    }
    
    # Optional: Remove images
    $removeImages = Read-Host "  Remove Docker images? (y/N)"
    if ($removeImages -eq 'y' -or $removeImages -eq 'Y') {
        Write-Host "  Removing images..." -ForegroundColor Gray
        
        $images = @(
            "database-comparison-app"
        )
        
        foreach ($image in $images) {
            docker rmi $image 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Removed image: $image" -ForegroundColor Green
            }
        }
    }
    
    $cleaned = $true
    Write-Host ""
}

# Clean node_modules
if ($All -or $NodeModules) {
    Write-Host "Cleaning node_modules..." -ForegroundColor Yellow
    
    if (Test-Path "node_modules") {
        $confirm = Read-Host "  This will delete node_modules. Continue? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            Remove-Item -Path "node_modules" -Recurse -Force
            Write-Host "  ✓ Removed node_modules" -ForegroundColor Green
            Write-Host "  Run 'npm install' to reinstall dependencies" -ForegroundColor Cyan
        } else {
            Write-Host "  Skipped node_modules removal" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No node_modules directory found" -ForegroundColor Gray
    }
    
    $cleaned = $true
    Write-Host ""
}

if ($cleaned) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Cleanup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "No cleanup performed" -ForegroundColor Yellow
    Write-Host ""
}
