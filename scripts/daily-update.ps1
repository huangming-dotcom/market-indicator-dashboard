$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectPath
try {
  & npm run data:update -- --strict
  if ($LASTEXITCODE -ne 0) { throw '資料來源更新未全部成功，保留歷史但停止發布。' }
  & npm run data:validate
  if ($LASTEXITCODE -ne 0) { throw '資料驗證失敗。' }
  & npm test
  if ($LASTEXITCODE -ne 0) { throw '測試失敗。' }
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw '建置失敗。' }
  Write-Host '每日快照及 dist 已更新。請依網站服務商設定發布 dist。'
} finally {
  Pop-Location
}
