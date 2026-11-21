$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectPath
try {
  & npm run data:update
  if ($LASTEXITCODE -ne 0) { throw '更新無法完成，停止發布。個別來源失敗由畫面標示。' }
  & npm run data:validate
  if ($LASTEXITCODE -ne 0) { throw '資料驗證失敗。' }
  & npm test
  if ($LASTEXITCODE -ne 0) { throw '測試失敗。' }
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw '建置失敗。' }
  & npm run test:build
  if ($LASTEXITCODE -ne 0) { throw '正式網站檢查失敗。' }
  Write-Host '每日快照及 dist 已更新。請依網站服務商設定發布 dist。'
} finally {
  Pop-Location
}
