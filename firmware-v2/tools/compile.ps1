# ============================================================================
# CompileFirmware - Compilation cloud reproductible du firmware L3D Cube
# ----------------------------------------------------------------------------
# Ce script authentifie silencieusement le CLI Particle depuis `.env.local`,
# compile pour Photon avec Device OS 2.3.1 et délègue l'extraction des mesures.
# Il ne flashe aucun appareil et ne doit jamais afficher les secrets chargés.
# ============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Répertoire racine du projet firmware-v2.
$firmwareRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

# Répertoire racine du dépôt partagé.
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $firmwareRoot '..')).Path

# Fichier local contenant les identifiants Particle non versionnés.
$environmentFile = Join-Path $repositoryRoot '.env.local'

# Répertoire réservé aux artefacts non versionnés.
$buildDirectory = Join-Path $firmwareRoot 'build'

# Chemin du binaire produit par le compilateur cloud.
$binaryPath = Join-Path $buildDirectory 'l3d-studio-photon-2.3.1.bin'

# Chemin du journal brut de compilation sans secrets.
$compileLogPath = Join-Path $buildDirectory 'compile.log'

# Chemin du rapport JSON généré par le script de mesure.
$measurementPath = Join-Path $buildDirectory 'measurement.json'

# Collection locale des valeurs chargées depuis `.env.local`.
$configuration = @{}

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "Le fichier .env.local est introuvable à la racine du dépôt."
}

Get-Content -LiteralPath $environmentFile | ForEach-Object {
    $parts = $_ -split '=', 2
    if ($parts.Count -ne 2 -or $parts[0].Trim().StartsWith('#')) {
        return
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    $configuration[$key] = $value
}

$authenticated = $false

if ($configuration['PARTICLE_TOKEN']) {
    $null = & particle login --token $configuration['PARTICLE_TOKEN'] --quiet 2>&1
    $authenticated = $LASTEXITCODE -eq 0
}

if (-not $authenticated -and
    $configuration['PARTICLE_USERNAME'] -and
    $configuration['PARTICLE_PASSWORD']) {
    $null = & particle login `
        --username $configuration['PARTICLE_USERNAME'] `
        --password $configuration['PARTICLE_PASSWORD'] `
        --quiet 2>&1
    $authenticated = $LASTEXITCODE -eq 0
}

if (-not $authenticated) {
    throw "L'authentification Particle a échoué avec les identifiants disponibles."
}

New-Item -ItemType Directory -Force -Path $buildDirectory | Out-Null

if (Test-Path -LiteralPath $binaryPath) {
    Remove-Item -LiteralPath $binaryPath -Force
}

$compileOutput = & particle compile photon $firmwareRoot `
    --target 2.3.1 `
    --saveTo $binaryPath 2>&1
$compileExitCode = $LASTEXITCODE

$compileOutput | Set-Content -LiteralPath $compileLogPath -Encoding UTF8
$compileOutput | ForEach-Object { Write-Host $_ }

if ($compileExitCode -ne 0) {
    throw "La compilation Particle a échoué. Consulter build/compile.log."
}

& (Join-Path $PSScriptRoot 'measure-build.ps1') `
    -CompileLogPath $compileLogPath `
    -BinaryPath $binaryPath `
    -OutputPath $measurementPath

if ($LASTEXITCODE -ne 0) {
    throw "L'extraction des mesures de compilation a échoué."
}
