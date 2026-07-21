# 将 ohcard 项目提交并推送到 GitHub
# 用法（PowerShell）:
#   cd E:\work_fold\ohcard
#   .\scripts\save-to-github.ps1 -RemoteUrl "https://github.com/你的用户名/ohcard.git"
#
# 若仓库已存在 remote，可省略 -RemoteUrl

param(
    [string]$RemoteUrl = "",
    [string]$Branch = "main",
    [string]$CommitMessage = "fix(h5): 修复手机浏览器曼达拉与解压捏捏乐 canvas 布局显示"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Find-Git {
    $candidates = @(
        "git",
        "$env:ProgramFiles\Git\cmd\git.exe",
        "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe",
        "$env:LOCALAPPDATA\MinGit\cmd\git.exe"
    )
    foreach ($c in $candidates) {
        if ($c -eq "git") {
            $cmd = Get-Command git -ErrorAction SilentlyContinue
            if ($cmd) { return $cmd.Source }
        } elseif (Test-Path $c) {
            return $c
        }
    }
    throw "未找到 Git。请先安装 Git for Windows: https://git-scm.com/download/win"
}

$git = Find-Git
Write-Host "使用 Git: $git"

if (-not (Test-Path ".git")) {
    Write-Host "初始化 Git 仓库..."
    & $git init -b $Branch
}

& $git add -A
$status = & $git status --porcelain
if (-not $status) {
    Write-Host "没有需要提交的更改。"
    exit 0
}

Write-Host "即将提交的文件:"
& $git status -sb

& $git commit -m $CommitMessage

if ($RemoteUrl) {
    $remotes = & $git remote
    if ($remotes -contains "origin") {
        & $git remote set-url origin $RemoteUrl
    } else {
        & $git remote add origin $RemoteUrl
    }
}

$hasOrigin = (& $git remote) -contains "origin"
if ($hasOrigin) {
    Write-Host "推送到 origin/$Branch ..."
    & $git push -u origin $Branch
    Write-Host "完成。"
} else {
    Write-Host "尚未配置 remote。请先在 GitHub 创建空仓库，然后执行:"
    Write-Host "  .\scripts\save-to-github.ps1 -RemoteUrl `"https://github.com/你的用户名/仓库名.git`""
}
