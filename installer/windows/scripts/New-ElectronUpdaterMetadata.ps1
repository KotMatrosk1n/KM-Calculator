# SPDX-License-Identifier: MIT

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $Version,
    [Parameter(Mandatory = $true)] [string] $InstallerPath,
    [Parameter(Mandatory = $true)] [string] $OutputPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Electron updater metadata requires a numeric three-part version."
}

$installer = Get-Item -LiteralPath $InstallerPath
if ($installer.Name -notmatch '^[A-Za-z0-9._-]+\.exe$') {
    throw "Installer asset names must contain only ASCII letters, digits, dots, underscores, and hyphens."
}

$stream = [IO.File]::OpenRead($installer.FullName)
try {
    $algorithm = [Security.Cryptography.SHA512]::Create()
    try {
        $sha512 = [Convert]::ToBase64String($algorithm.ComputeHash($stream))
    } finally {
        $algorithm.Dispose()
    }
} finally {
    $stream.Dispose()
}

$releaseDate = [DateTime]::UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", [Globalization.CultureInfo]::InvariantCulture)
$yaml = @(
    "version: $Version"
    "files:"
    "  - url: $($installer.Name)"
    "    sha512: $sha512"
    "    size: $($installer.Length)"
    "path: $($installer.Name)"
    "sha512: $sha512"
    "releaseDate: '$releaseDate'"
) -join "`n"

$outputFullPath = [IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($outputFullPath)) | Out-Null
[IO.File]::WriteAllText($outputFullPath, $yaml + "`n", [Text.UTF8Encoding]::new($false))
Write-Host "Wrote electron-updater metadata: $outputFullPath"
