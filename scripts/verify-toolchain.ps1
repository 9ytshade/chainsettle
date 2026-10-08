<#!
.SYNOPSIS
Checks the project GenLayer toolchain for ChainSettle.
#>

$ErrorActionPreference = "Stop"

$venvPython = "..\proofpay\.venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $venvPython)) {
    if (Test-Path -LiteralPath ".venv\Scripts\python.exe") {
        $venvPython = ".venv\Scripts\python.exe"
    } else {
        throw "Missing Python virtual environment with genlayer tools."
    }
}

& $venvPython -c @"
from importlib.metadata import version
import sys

expected = {
    'genlayer-py': '0.16.3',
    'genlayer-test': '0.29.2',
    'genvm-linter': '0.7.1',
}
for package, required in expected.items():
    installed = version(package)
    if installed != required:
        sys.exit(f'{package}: expected {required}, found {installed}')
    print(f'{package}: {installed}')
"@
if ($LASTEXITCODE -ne 0) {
    throw "Toolchain verification failed for Python packages."
}

$cliVersion = (& npx --no-install genlayer --version 2>$null)
if (-not $cliVersion) {
    $cliVersion = (& npx genlayer --version).Trim()
}
Write-Output "genlayer CLI: $cliVersion"
Write-Output "ChainSettle toolchain verification passed."
