[CmdletBinding()]
param(
    [string]$GatewayBaseUrl = "http://127.0.0.1:8080",
    [int]$Samples = 15,
    [string]$ComposeDir = (Join-Path $PSScriptRoot "..\local"),
    [string]$EnvFile = ".env",
    [string]$OutputPath = (Join-Path $PSScriptRoot "..\reports\dashboard-benchmark-latest.json"),
    [string]$UserId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-Base64Url {
    param([byte[]]$Bytes)

    return [Convert]::ToBase64String($Bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Read-EnvFile {
    param([string]$Path)

    $values = @{}
    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf("=")
        if ($separatorIndex -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $separatorIndex).Trim()
        $value = $trimmed.Substring($separatorIndex + 1).Trim()
        $values[$key] = $value
    }

    return $values
}

function Get-SettingValue {
    param(
        [string]$Name,
        [hashtable]$EnvValues
    )

    $envItem = Get-Item "Env:$Name" -ErrorAction SilentlyContinue
    if ($null -ne $envItem -and -not [string]::IsNullOrWhiteSpace($envItem.Value)) {
        return $envItem.Value
    }

    if ($EnvValues.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($EnvValues[$Name])) {
        return $EnvValues[$Name]
    }

    throw "Missing required setting '$Name'. Set it in the current shell or in $EnvFile."
}

function Invoke-Compose {
    param(
        [string]$ComposeDirectory,
        [string]$ComposeEnvFile,
        [string[]]$Arguments
    )

    Push-Location $ComposeDirectory
    try {
        $output = & docker compose --env-file $ComposeEnvFile @Arguments 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw ($output -join [Environment]::NewLine)
        }
        return $output
    }
    finally {
        Pop-Location
    }
}

function Wait-ForHealth {
    param([string]$Url)

    for ($attempt = 1; $attempt -le 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.Content -match '"status"\s*:\s*"UP"') {
                return
            }
        }
        catch {
        }

        Start-Sleep -Seconds 2
    }

    throw "Timed out waiting for healthy endpoint: $Url"
}

function New-BenchmarkToken {
    param(
        [string]$Subject,
        [string]$Issuer,
        [string]$PrivateKeyBase64
    )

    $headerJson = '{"alg":"RS256","typ":"JWT"}'
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $payloadJson = (@{
            sub = $Subject
            iss = $Issuer
            iat = $now
            exp = $now + 3600
        } | ConvertTo-Json -Compress)

    $encodedHeader = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($headerJson))
    $encodedPayload = ConvertTo-Base64Url ([System.Text.Encoding]::UTF8.GetBytes($payloadJson))
    $unsignedToken = "$encodedHeader.$encodedPayload"

    $rsa = [System.Security.Cryptography.RSA]::Create()
    try {
        $keyBytes = [Convert]::FromBase64String($PrivateKeyBase64)
        $bytesRead = 0
        [void]$rsa.ImportPkcs8PrivateKey($keyBytes, [ref]$bytesRead)
        $signatureBytes = $rsa.SignData(
            [System.Text.Encoding]::ASCII.GetBytes($unsignedToken),
            [System.Security.Cryptography.HashAlgorithmName]::SHA256,
            [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
        )
    }
    finally {
        $rsa.Dispose()
    }

    $encodedSignature = ConvertTo-Base64Url $signatureBytes
    return "$unsignedToken.$encodedSignature"
}

function Get-Percentile {
    param(
        [double[]]$Values,
        [double]$Percentile
    )

    if ($Values.Count -eq 0) {
        return $null
    }

    $sorted = $Values | Sort-Object
    $index = [Math]::Ceiling($Percentile * $sorted.Count) - 1
    if ($index -lt 0) {
        $index = 0
    }
    if ($index -ge $sorted.Count) {
        $index = $sorted.Count - 1
    }

    return [Math]::Round([double]$sorted[$index], 2)
}

function Get-SampleUserId {
    param(
        [string]$ComposeDirectory,
        [string]$ComposeEnvFile,
        [string]$WorkoutDbUsername
    )

    $query = @"
SELECT COALESCE(
  (SELECT user_id::text FROM workout_entries ORDER BY created_at DESC LIMIT 1),
  (SELECT user_id::text FROM splits ORDER BY created_at DESC LIMIT 1),
  (SELECT user_id::text FROM workout_templates ORDER BY created_at DESC LIMIT 1)
);
"@.Trim()

    $output = Invoke-Compose $ComposeDirectory $ComposeEnvFile @(
        "exec", "-T",
        "dedicate-workout-db",
        "psql",
        "-U", $WorkoutDbUsername,
        "-d", "workout",
        "-Atqc", $query
    )

    $resolved = ($output | Select-Object -Last 1).Trim()
    if ([string]::IsNullOrWhiteSpace($resolved)) {
        throw "Could not resolve a sample user id from the restored workout database."
    }

    return $resolved
}

function Invoke-BenchmarkedRequest {
    param(
        [string]$Url,
        [hashtable]$Headers,
        [int]$SampleCount
    )

    $durations = New-Object System.Collections.Generic.List[double]
    $payloadBytes = New-Object System.Collections.Generic.List[double]
    $sqlCounts = New-Object System.Collections.Generic.List[double]

    for ($sample = 1; $sample -le $SampleCount; $sample++) {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -UseBasicParsing -TimeoutSec 30
        $stopwatch.Stop()

        $durations.Add([Math]::Round($stopwatch.Elapsed.TotalMilliseconds, 2))
        $payloadBytes.Add([System.Text.Encoding]::UTF8.GetByteCount($response.Content))

        $sqlHeader = $response.Headers["X-SQL-Statement-Count"]
        if ($null -ne $sqlHeader -and -not [string]::IsNullOrWhiteSpace($sqlHeader)) {
            $sqlCounts.Add([double]$sqlHeader)
        }
    }

    return [pscustomobject]@{
        samples = $SampleCount
        medianMs = Get-Percentile $durations.ToArray() 0.5
        p95Ms = Get-Percentile $durations.ToArray() 0.95
        medianPayloadBytes = Get-Percentile $payloadBytes.ToArray() 0.5
        p95PayloadBytes = Get-Percentile $payloadBytes.ToArray() 0.95
        medianSqlStatements = if ($sqlCounts.Count -gt 0) { [int](Get-Percentile $sqlCounts.ToArray() 0.5) } else { $null }
        p95SqlStatements = if ($sqlCounts.Count -gt 0) { [int](Get-Percentile $sqlCounts.ToArray() 0.95) } else { $null }
    }
}

$resolvedComposeDir = (Resolve-Path $ComposeDir).Path
$resolvedEnvFile = Join-Path $resolvedComposeDir $EnvFile
if (-not (Test-Path $resolvedEnvFile)) {
    throw "Could not find compose env file: $resolvedEnvFile"
}

$envValues = Read-EnvFile $resolvedEnvFile
$workoutDbUsername = Get-SettingValue "WORKOUT_DB_USERNAME" $envValues
$jwtPrivateKey = Get-SettingValue "JWT_PRIVATE_KEY_B64" $envValues
$jwtIssuer = Get-SettingValue "JWT_ISSUER" $envValues

Write-Host "Waiting for local stack health checks..."
Wait-ForHealth "$GatewayBaseUrl/actuator/health"
Wait-ForHealth "$GatewayBaseUrl/auth/actuator/health"
Wait-ForHealth "$GatewayBaseUrl/workout/actuator/health"

$resolvedUserId = if ([string]::IsNullOrWhiteSpace($UserId)) {
    Get-SampleUserId $resolvedComposeDir $EnvFile $workoutDbUsername
} else {
    $UserId
}

$token = New-BenchmarkToken -Subject $resolvedUserId -Issuer $jwtIssuer -PrivateKeyBase64 $jwtPrivateKey
$headers = @{ Authorization = "Bearer $token" }

$results = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    gatewayBaseUrl = $GatewayBaseUrl
    userId = $resolvedUserId
    samplesPerEndpoint = $Samples
    endpoints = [ordered]@{
        dashboardSummary = Invoke-BenchmarkedRequest -Url "$GatewayBaseUrl/workout/dashboard/summary" -Headers $headers -SampleCount $Samples
        dashboardInsights = Invoke-BenchmarkedRequest -Url "$GatewayBaseUrl/workout/insights/dashboard" -Headers $headers -SampleCount $Samples
        dashboardWeeklyVolume = Invoke-BenchmarkedRequest -Url "$GatewayBaseUrl/workout/analysis/training-insights/weekly-volume" -Headers $headers -SampleCount $Samples
    }
}

$outputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$json = $results | ConvertTo-Json -Depth 6
Set-Content -Path $OutputPath -Value $json

Write-Host ""
Write-Host "Dashboard benchmark complete."
Write-Host "User id: $resolvedUserId"
Write-Host "Output: $OutputPath"
Write-Host ""
$results.endpoints.GetEnumerator() | ForEach-Object {
    Write-Host ("{0}: median {1}ms, p95 {2}ms, median payload {3} bytes, median SQL {4}" -f
        $_.Key,
        $_.Value.medianMs,
        $_.Value.p95Ms,
        $_.Value.medianPayloadBytes,
        ($(if ($null -ne $_.Value.medianSqlStatements) { $_.Value.medianSqlStatements } else { "header-missing" }))
    )
}
