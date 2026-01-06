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

# Seed databases
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Seeding Databases" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Seeding PostgreSQL..." -ForegroundColor Yellow
npm run seed-postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Failed to seed PostgreSQL database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Seeding MongoDB..." -ForegroundColor Yellow
npm run seed-mongodb
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Failed to seed MongoDB database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Databases seeded successfully!" -ForegroundColor Green

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

# Run Advanced Tests
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Advanced Performance Tests" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Running advanced tests:" -ForegroundColor Yellow
Write-Host "  - Bulk Operations (100-2000 records)" -ForegroundColor White
Write-Host "  - Aggregation Pipelines" -ForegroundColor White
Write-Host "  - Concurrent Connections (10-100)" -ForegroundColor White
Write-Host ""
npm run test-advanced

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Tests Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Results saved to:" -ForegroundColor Cyan
Write-Host "  Basic Tests:" -ForegroundColor Yellow
Write-Host "    - benchmarks/postgres-results.json" -ForegroundColor White
Write-Host "    - benchmarks/mongodb-results.json" -ForegroundColor White
Write-Host "  Advanced Tests:" -ForegroundColor Yellow
Write-Host "    - benchmarks/bulk-operations-results.json" -ForegroundColor White
Write-Host "    - benchmarks/aggregation-results.json" -ForegroundColor White
Write-Host "    - benchmarks/concurrent-results.json" -ForegroundColor White
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  npm run dashboard  # Generate visualization" -ForegroundColor White
Write-Host ""
