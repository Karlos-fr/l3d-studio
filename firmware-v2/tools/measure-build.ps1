# ============================================================================
# MeasureBuild - Extraction des tailles Flash et RAM d'une compilation Particle
# ----------------------------------------------------------------------------
# Ce script lit uniquement le journal du compilateur et le binaire généré. Il
# produit un rapport JSON stable sans effectuer de compilation ni de flash.
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$CompileLogPath,

    [Parameter(Mandatory = $true)]
    [string]$BinaryPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

# Contenu textuel complet de la sortie du compilateur Particle.
$compileLog = Get-Content -Raw -LiteralPath $CompileLogPath

# Expression correspondant à la ligne numérique placée sous `Flash RAM`.
$memoryPattern = '(?ms)Memory use:\s*Flash\s+RAM\s*(\d+)\s+(\d+)'

# Résultat de la recherche des tailles dans le journal.
$memoryMatch = [regex]::Match($compileLog, $memoryPattern)

if (-not $memoryMatch.Success) {
    throw "Les tailles Flash et RAM sont absentes du journal de compilation."
}

# Taille Flash utilisateur rapportée par le compilateur.
$flashBytes = [int]$memoryMatch.Groups[1].Value

# Taille RAM statique rapportée par le compilateur.
$staticRamBytes = [int]$memoryMatch.Groups[2].Value

# Taille physique du fichier binaire incluant son en-tête Particle.
$binaryBytes = (Get-Item -LiteralPath $BinaryPath).Length

# Limite du slot de firmware utilisateur du Photon Gen 2.
$flashLimitBytes = 131072

# Rapport sérialisable conservant les valeurs et marges importantes.
$measurement = [ordered]@{
    platform = 'photon'
    deviceOs = '2.3.1'
    flashBytes = $flashBytes
    flashLimitBytes = $flashLimitBytes
    flashRemainingBytes = $flashLimitBytes - $flashBytes
    flashPercent = [math]::Round(($flashBytes * 100.0) / $flashLimitBytes, 2)
    staticRamBytes = $staticRamBytes
    binaryBytes = $binaryBytes
    measuredAtUtc = [DateTime]::UtcNow.ToString('o')
}

$measurement | ConvertTo-Json | Set-Content -LiteralPath $OutputPath -Encoding UTF8
$measurement | Format-List
