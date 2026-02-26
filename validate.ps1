Write-Host "Starting Frontend Validation..." -ForegroundColor Cyan
pnpm ci:validate
if ($LASTEXITCODE -eq 0) {
    Write-Host "----------------------------------------" -ForegroundColor Green
    Write-Host "✅ Frontend Validation passed successfully!" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Green
}
else {
    Write-Host "----------------------------------------" -ForegroundColor Red
    Write-Host "❌ Frontend Validation failed!" -ForegroundColor Red
    Write-Host "----------------------------------------" -ForegroundColor Red
    exit 1
}
