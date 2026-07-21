# Remove Open CMD / PowerShell here context menu

$keys = @(
    'HKCU:\Software\Classes\Directory\Background\shell\OpenCmdHere',
    'HKCU:\Software\Classes\Directory\Background\shell\OpenPowerShellHere',
    'HKCU:\Software\Classes\Directory\shell\OpenCmdHere',
    'HKCU:\Software\Classes\Directory\shell\OpenPowerShellHere'
)

foreach ($k in $keys) {
    if (Test-Path $k) {
        Remove-Item -Path $k -Recurse -Force
    }
}

Write-Host 'Removed.' -ForegroundColor Green
