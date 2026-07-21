# Right-click menu: Open CMD / PowerShell here
# Run: powershell -ExecutionPolicy Bypass -File install-terminal-context-menu.ps1

$ErrorActionPreference = 'Stop'

function Set-ContextMenu {
    param(
        [string]$Root,
        [string]$KeyName,
        [string]$Label,
        [string]$Icon,
        [string]$Command
    )
    $base = "HKCU:\Software\Classes\$Root\shell\$KeyName"
    New-Item -Path $base -Force | Out-Null
    Set-ItemProperty -Path $base -Name '(default)' -Value $Label
    Set-ItemProperty -Path $base -Name 'Icon' -Value $Icon
    New-Item -Path "$base\command" -Force | Out-Null
    Set-ItemProperty -Path "$base\command" -Name '(default)' -Value $Command
}

Set-ContextMenu -Root 'Directory\Background' -KeyName 'OpenCmdHere' `
    -Label 'Open CMD here' -Icon 'cmd.exe' `
    -Command 'cmd.exe /s /k pushd "%V"'

Set-ContextMenu -Root 'Directory\Background' -KeyName 'OpenPowerShellHere' `
    -Label 'Open PowerShell here' -Icon 'powershell.exe' `
    -Command 'powershell.exe -NoExit -Command Set-Location -LiteralPath ''%V'''

Set-ContextMenu -Root 'Directory' -KeyName 'OpenCmdHere' `
    -Label 'Open CMD here' -Icon 'cmd.exe' `
    -Command 'cmd.exe /s /k pushd "%1"'

Set-ContextMenu -Root 'Directory' -KeyName 'OpenPowerShellHere' `
    -Label 'Open PowerShell here' -Icon 'powershell.exe' `
    -Command 'powershell.exe -NoExit -Command Set-Location -LiteralPath ''%1'''

Write-Host 'Done. Restart Explorer if menu not visible.' -ForegroundColor Green
