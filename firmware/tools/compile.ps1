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

# Répertoire racine du projet firmware.
$firmwareRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

# Répertoire racine du dépôt partagé.
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $firmwareRoot '..')).Path

# Fichier local contenant les identifiants Particle non versionnés.
$environmentFile = Join-Path $repositoryRoot '.env.local'

# Répertoire réservé aux artefacts non versionnés.
$buildDirectory = Join-Path $firmwareRoot 'build'

# Configuration firmware utilisée comme source unique des versions publiées.
$buildConfigPath = Join-Path $firmwareRoot 'src/config/build_config.h'

# Contrat bytecode utilisé comme source unique de la version binaire.
$bytecodeFormatPath = Join-Path $firmwareRoot 'src/bytecode/bytecode_format.h'

# Texte de configuration lu sans évaluer de directive C++.
$buildConfig = Get-Content -LiteralPath $buildConfigPath -Raw

# Texte du contrat bytecode lu sans lancer de préprocesseur.
$bytecodeFormat = Get-Content -LiteralPath $bytecodeFormatPath -Raw

# Capture de la révision publique déclarée par le firmware.
$firmwareRevisionMatch = [regex]::Match(
    $buildConfig,
    '#define\s+BUILD_REVISION\s+"([^"]+)"')

# Capture de la cible Device OS déclarée par le firmware.
$deviceOsVersionMatch = [regex]::Match(
    $buildConfig,
    '#define\s+BUILD_DEVICE_OS_VERSION\s+"([^"]+)"')

# Capture de la version entière du format bytecode.
$bytecodeFormatVersionMatch = [regex]::Match(
    $bytecodeFormat,
    'BYTECODE_FORMAT_VERSION\s*=\s*(\d+)')

# Capture de l'état par défaut de la fonctionnalité bytecode.
$bytecodeEnabledMatch = [regex]::Match(
    $buildConfig,
    '#define\s+L3D_BYTECODE_ENABLED\s+([01])')

if (-not $firmwareRevisionMatch.Success -or
    -not $deviceOsVersionMatch.Success -or
    -not $bytecodeFormatVersionMatch.Success -or
    -not $bytecodeEnabledMatch.Success) {
    throw "Les versions publiques du firmware sont introuvables."
}

# Révision fonctionnelle extraite du firmware compilé.
$firmwareRevision = $firmwareRevisionMatch.Groups[1].Value

# Version Device OS imposée à la cible Photon.
$deviceOsVersion = $deviceOsVersionMatch.Groups[1].Value

# Version du format bytecode incluse dans le build actif.
$bytecodeFormatVersion = [int]$bytecodeFormatVersionMatch.Groups[1].Value

# Indique si la VM est incluse dans le binaire courant.
$bytecodeEnabled = $bytecodeEnabledMatch.Groups[1].Value -eq '1'

# Suffixe distinguant clairement un build actif d'un rollback sans VM.
$bytecodeArtifactSuffix = if ($bytecodeEnabled) {
    "bytecode-v$bytecodeFormatVersion"
} else {
    'bytecode-disabled'
}

# Nom versionné permettant d'identifier l'artefact sans configuration locale.
$binaryFileName = "l3d-studio-firmware-$firmwareRevision-photon-$deviceOsVersion-$bytecodeArtifactSuffix.bin"

# Chemin du binaire produit par le compilateur cloud.
$binaryPath = Join-Path $buildDirectory $binaryFileName

# Chemin du journal brut de compilation sans secrets.
$compileLogPath = Join-Path $buildDirectory 'compile.log'

# Chemin du rapport JSON généré par le script de mesure.
$measurementPath = Join-Path $buildDirectory 'measurement.json'

# Chemin du manifeste public décrivant exactement le binaire produit.
$releaseManifestPath = Join-Path $buildDirectory 'release.json'

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
    --target $deviceOsVersion `
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

# Mesures relues pour produire un manifeste sans chemin ni identifiant local.
$measurement = Get-Content -LiteralPath $measurementPath -Raw | ConvertFrom-Json

# Empreinte cryptographique du binaire exact produit par Particle.
$binaryHash = (Get-FileHash -LiteralPath $binaryPath -Algorithm SHA256).Hash

# Manifeste de livraison limité aux versions, mesures et empreinte publiques.
$releaseManifest = [ordered]@{
    artifact = $binaryFileName
    firmwareRevision = $firmwareRevision
    bytecodeEnabled = $bytecodeEnabled
    bytecodeFormatVersion = $bytecodeFormatVersion
    platform = 'photon'
    deviceOs = $deviceOsVersion
    flashBytes = $measurement.flashBytes
    staticRamBytes = $measurement.staticRamBytes
    binaryBytes = $measurement.binaryBytes
    sha256 = $binaryHash
    measuredAtUtc = $measurement.measuredAtUtc
}

$releaseManifest |
    ConvertTo-Json |
    Set-Content -LiteralPath $releaseManifestPath -Encoding UTF8

Write-Host "Release manifest: $releaseManifestPath"
