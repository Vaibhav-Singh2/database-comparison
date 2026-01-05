# Run All Database Performance Tests

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Performance Testing Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will test both databases:" -ForegroundColor Yellow
Write-Host "  1. PostgreSQL (Normalized, Relational)" -ForegroundColor White
Write-Host "  2. MongoDB (Denormalized, Document)" -ForegroundColor White
Write-Host ""
Write-Host "Estimated time: 15-20 minutes" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Continue? (Y/n)"
if ($response -eq 'n' -or $response -eq 'N') {
    Write-Host "Tests cancelled." -ForegroundColor Yellow
    exit 0
}

# Ensure Docker is running
Write-Host ""
Write-Host "Checking Docker containers..." -ForegroundColor Yellow
docker-compose ps

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Starting Docker containers..." -ForegroundColor Yellow
    docker-compose up -d
    Start-Sleep -Seconds 15
}

Write-Host ""
Write-Host "Containers ready!" -ForegroundColor Green

# Test PostgreSQL
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Test 1: PostgreSQL Performance" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
npm run test-crud-pg

# Test MongoDB
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  Test 2: MongoDB Performance" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
npm run test-crud-mongo

# Compare results
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Comparing Results" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
npm run compare

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Tests Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Results saved to:" -ForegroundColor Cyan
Write-Host "  - benchmarks/postgres-results.json" -ForegroundColor White
Write-Host "  - benchmarks/mongodb-results.json" -ForegroundColor White
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  npm run dashboard  # Generate visualization" -ForegroundColor White
Write-Host ""
