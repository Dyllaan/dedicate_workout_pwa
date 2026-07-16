[CmdletBinding()]
param(
    [ValidateSet("all", "tests", "smoke", "images")]
    [string]$Mode = "all",
    [string]$ComposeEnvFile,
    [string]$ComposeProjectName,
    [switch]$KeepStackRunning,
    [switch]$SkipNpmCi
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$composeFile = Join-Path $repoRoot "ops\local\docker-compose.yml"
$composeEnvTemplate = Join-Path $repoRoot "ops\local\.env.ci.example"
$runtimeHelperScript = Join-Path $repoRoot "ops\scripts\jlink-runtime.sh"
$frontendDir = Join-Path $repoRoot "frontend"
$authServiceDir = Join-Path $repoRoot "auth-service"
$gatewayDir = Join-Path $repoRoot "gateway"
$workoutServiceDir = Join-Path $repoRoot "workout_service"
$frontendSecurityContainerName = "dedicate-frontend-security-test"
$frontendSecurityImageName = "dedicate-frontend-security-test"
$authImageName = "dedicate-auth-service-ci:local"
$gatewayImageName = "dedicate-api-gateway-ci:local"
$workoutImageName = "dedicate-workout-service-ci:local"
$script:isWindowsPlatform = if ($PSVersionTable.PSEdition -eq "Core") {
    $IsWindows
}
else {
    $env:OS -eq "Windows_NT"
}

$script:composeWasStarted = $false
$script:generatedComposeEnvFile = $null
$script:activeComposeEnvFile = $null
$script:composeProjectName = $null
$script:frontendDependenciesReady = $false
$script:playwrightBrowsersReady = $false
$script:runFailure = $null

function Write-Phase {
    param([string]$Message)

    Write-Host ""
    Write-Host ("==> {0}" -f $Message) -ForegroundColor Cyan
}

function Resolve-RepoPath {
    param([string]$PathValue)

    $candidate = $PathValue
    if (-not [System.IO.Path]::IsPathRooted($candidate)) {
        $candidate = Join-Path $repoRoot $candidate
    }

    return (Resolve-Path $candidate).Path
}

function Get-RequiredCommand {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        throw "Required command '$Name' was not found in PATH."
    }

    return $command.Source
}

function Get-PythonCommand {
    if ($script:isWindowsPlatform) {
        $windowsAliasRoots = @(
            (Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps").ToLowerInvariant()
        )

        $candidates = @(
            @{ Name = "python"; Arguments = @() },
            @{ Name = "py"; Arguments = @("-3") },
            @{ Name = "python3"; Arguments = @() }
        )

        $sawWindowsAlias = $false
        foreach ($candidate in $candidates) {
            $command = Get-Command $candidate.Name -ErrorAction SilentlyContinue
            if ($null -eq $command) {
                continue
            }

            $source = $command.Source
            $normalizedSource = if ([string]::IsNullOrWhiteSpace($source)) { "" } else { $source.ToLowerInvariant() }
            $isWindowsAlias = $false
            foreach ($aliasRoot in $windowsAliasRoots) {
                if (-not [string]::IsNullOrWhiteSpace($aliasRoot) -and $normalizedSource.StartsWith($aliasRoot)) {
                    $isWindowsAlias = $true
                    break
                }
            }

            if ($isWindowsAlias) {
                $sawWindowsAlias = $true
                continue
            }

            return [pscustomobject]@{
                FilePath  = $source
                Arguments = $candidate.Arguments
            }
        }

        if ($sawWindowsAlias) {
            throw "Python was found only via the Microsoft Store app execution alias in WindowsApps. Install a real Python interpreter or disable the Store alias and retry."
        }

        throw "Required command 'python', 'py -3', or 'python3' was not found in PATH."
    }

    foreach ($name in @("python3", "python")) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($null -ne $command) {
            return [pscustomobject]@{
                FilePath  = $command.Source
                Arguments = @()
            }
        }
    }

    throw "Required command 'python3' or 'python' was not found in PATH."
}

function Invoke-PythonScript {
    param(
        [string]$ScriptPath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = $repoRoot,
        [hashtable]$Environment = @{}
    )

    $pythonCommand = Get-PythonCommand
    Invoke-LoggedCommand -FilePath $pythonCommand.FilePath -Arguments ($pythonCommand.Arguments + @($ScriptPath) + $Arguments) -WorkingDirectory $WorkingDirectory -Environment $Environment
}

function Invoke-LoggedCommand {
    param(
        [string]$FilePath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = $repoRoot,
        [hashtable]$Environment = @{}
    )

    $displayArguments = $Arguments | ForEach-Object {
        if ($_ -match "\s") {
            '"{0}"' -f $_
        }
        else {
            $_
        }
    }
    Write-Host ("[{0}] {1} {2}" -f (Split-Path -Leaf $WorkingDirectory), $FilePath, ($displayArguments -join " "))

    $originalEnvironment = @{}
    Push-Location $WorkingDirectory
    try {
        foreach ($entry in $Environment.GetEnumerator()) {
            $envPath = "Env:{0}" -f $entry.Key
            $existingValue = Get-Item $envPath -ErrorAction SilentlyContinue
            $originalEnvironment[$entry.Key] = [pscustomobject]@{
                Exists = $null -ne $existingValue
                Value  = if ($null -ne $existingValue) { $existingValue.Value } else { $null }
            }
            Set-Item -Path $envPath -Value ([string]$entry.Value)
        }

        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        foreach ($entry in $originalEnvironment.GetEnumerator()) {
            $envPath = "Env:{0}" -f $entry.Key
            if ($entry.Value.Exists) {
                Set-Item -Path $envPath -Value $entry.Value.Value
            }
            else {
                Remove-Item $envPath -ErrorAction SilentlyContinue
            }
        }
        Pop-Location
    }
}

function Invoke-Compose {
    param([string[]]$Arguments)

    Invoke-LoggedCommand -FilePath "docker" -Arguments (@(
            "compose",
            "--project-name", $script:composeProjectName,
            "--env-file", $activeComposeEnvFile,
            "-f", $composeFile
        ) + $Arguments)
}

function Invoke-GradleTask {
    param(
        [string]$ServiceDirectory,
        [string[]]$Arguments,
        [hashtable]$Environment = @{}
    )

    $launcher = if ($script:isWindowsPlatform) {
        Join-Path $ServiceDirectory "gradlew.bat"
    }
    else {
        "./gradlew"
    }

    Invoke-LoggedCommand -FilePath $launcher -Arguments $Arguments -WorkingDirectory $ServiceDirectory -Environment $Environment
}

function Ensure-FrontendDependencies {
    param([switch]$InstallPlaywrightBrowsers)

    if (-not $script:frontendDependenciesReady -and -not $SkipNpmCi) {
        Write-Phase "Install frontend dependencies"
        Invoke-LoggedCommand -FilePath "npm" -Arguments @("ci") -WorkingDirectory $frontendDir
        $script:frontendDependenciesReady = $true
    }

    if ($InstallPlaywrightBrowsers -and -not $script:playwrightBrowsersReady) {
        Write-Phase "Install Playwright browsers"
        Invoke-LoggedCommand -FilePath "npx" -Arguments @("playwright", "install", "chromium", "webkit") -WorkingDirectory $frontendDir
        $script:playwrightBrowsersReady = $true
    }
}

function Wait-ForUrl {
    param(
        [string]$Url,
        [int]$Attempts = 20,
        [int]$SleepSeconds = 2
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                return
            }
        }
        catch {
        }

        Start-Sleep -Seconds $SleepSeconds
    }

    throw "Timed out waiting for $Url"
}

function Get-HealthResponseBody {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        $content = $response.Content
        if ($content -is [byte[]]) {
            return [System.Text.Encoding]::UTF8.GetString($content)
        }

        return [string]$content
    }
    catch {
        if ($null -ne $_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream(), [System.Text.Encoding]::UTF8)
                return [string]$reader.ReadToEnd()
            }
            catch {
            }
        }

        return $null
    }
}

function Test-EndpointReady {
    param(
        [string]$Name,
        [string]$Url
    )

    $responseBody = Get-HealthResponseBody -Url $Url
    if ([string]::IsNullOrWhiteSpace($responseBody)) {
        Write-Host ("[{0}] not ready yet: no successful response from {1}" -f $Name, $Url)
        return $false
    }

    if ($responseBody -notmatch '"UP"') {
        Write-Host ("[{0}] responded without UP status: {1}" -f $Name, $responseBody)
        return $false
    }

    Write-Host ("[{0}] ready: {1}" -f $Name, $responseBody)
    return $true
}

function Wait-ForGatewayStackReadiness {
    param(
        [int]$Attempts = 36,
        [int]$SleepSeconds = 5
    )

    $endpoints = @(
        @{ Name = "gateway"; Url = "http://127.0.0.1:8080/actuator/health"; FailureMessage = "Gateway did not become ready before timeout: http://127.0.0.1:8080/actuator/health" },
        @{ Name = "auth"; Url = "http://127.0.0.1:8080/auth/actuator/health"; FailureMessage = "Auth service did not become ready before timeout: http://127.0.0.1:8080/auth/actuator/health" },
        @{ Name = "workout"; Url = "http://127.0.0.1:8080/workout/actuator/health"; FailureMessage = "Workout service did not become ready before timeout: http://127.0.0.1:8080/workout/actuator/health" }
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        Write-Host ("Readiness check {0}/{1}" -f $attempt, $Attempts)

        $allReady = $true
        foreach ($endpoint in $endpoints) {
            if (-not (Test-EndpointReady -Name $endpoint.Name -Url $endpoint.Url)) {
                $allReady = $false
                if ($attempt -lt $Attempts) {
                    Start-Sleep -Seconds $SleepSeconds
                    break
                }

                throw $endpoint.FailureMessage
            }
        }

        if ($allReady) {
            Write-Host "Gateway, auth, and workout services are ready."
            return
        }
    }

    throw "Gateway stack readiness check exhausted without success."
}

function Remove-FrontendSecurityContainer {
    try {
        & docker rm -f $frontendSecurityContainerName 2>$null | Out-Null
    }
    catch {
    }
    finally {
        $global:LASTEXITCODE = 0
    }
}

function Test-DockerAvailable {
    try {
        & docker version --format "{{.Server.Version}}" 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Initialize-ComposeEnvFile {
    if ([string]::IsNullOrWhiteSpace($ComposeEnvFile)) {
        if (-not (Test-Path $composeEnvTemplate)) {
            throw "Could not find CI compose env template at $composeEnvTemplate"
        }

        $script:generatedComposeEnvFile = Join-Path ([System.IO.Path]::GetTempPath()) ("ops-local-ci-{0}.env" -f ([System.Guid]::NewGuid().ToString("N")))
        Copy-Item -LiteralPath $composeEnvTemplate -Destination $script:generatedComposeEnvFile
        $script:activeComposeEnvFile = $script:generatedComposeEnvFile
    }
    else {
        $script:activeComposeEnvFile = Resolve-RepoPath $ComposeEnvFile
    }

    Write-Host ("Using compose env file: {0}" -f $script:activeComposeEnvFile)
}

function Initialize-ComposeProjectName {
    if (-not [string]::IsNullOrWhiteSpace($ComposeProjectName)) {
        $script:composeProjectName = $ComposeProjectName
    }
    else {
        $script:composeProjectName = "localci-{0}" -f ([System.Guid]::NewGuid().ToString("N"))
    }

    Write-Host ("Using compose project name: {0}" -f $script:composeProjectName)
}

function Test-Prerequisites {
    Write-Phase "Check prerequisites"

    foreach ($tool in @("docker", "node", "npm", "npx", "java")) {
        [void](Get-RequiredCommand $tool)
    }
    [void](Get-PythonCommand)

    foreach ($path in @($composeFile, $composeEnvTemplate, (Join-Path $repoRoot "ops\scripts\test_user_deletion_propagation.py"))) {
        if (-not (Test-Path $path)) {
            throw "Required file was not found: $path"
        }
    }

    if (-not (Test-Path $runtimeHelperScript)) {
        throw "Required runtime helper script was not found: $runtimeHelperScript"
    }
}

function Invoke-BackendTests {
    Write-Phase "Run backend tests"
    Invoke-GradleTask -ServiceDirectory $authServiceDir -Arguments @("test")
    Invoke-GradleTask -ServiceDirectory $gatewayDir -Arguments @("test")
    Invoke-GradleTask -ServiceDirectory $workoutServiceDir -Arguments @("test")
}

function Invoke-SecurityChecks {
    Ensure-FrontendDependencies

    Write-Phase "Run frontend vulnerability audit (high/critical gate)"
    Invoke-LoggedCommand -FilePath "npm" -Arguments @("audit", "--audit-level=high") -WorkingDirectory $frontendDir

    $dependencyCheckEnvironment = @{}
    if ([string]::IsNullOrWhiteSpace($env:NVD_API_KEY)) {
        Write-Warning "NVD_API_KEY is not set. Running OWASP dependency-check with cached data only (ODC_AUTO_UPDATE=false) to avoid API rate-limit failures."
        $dependencyCheckEnvironment["ODC_AUTO_UPDATE"] = "false"
    }

    Write-Phase "Run backend dependency checks (high/critical gate)"
    Invoke-GradleTask -ServiceDirectory $authServiceDir -Arguments @("dependencyCheckAnalyze") -Environment $dependencyCheckEnvironment
    Invoke-GradleTask -ServiceDirectory $gatewayDir -Arguments @("dependencyCheckAnalyze") -Environment $dependencyCheckEnvironment
    Invoke-GradleTask -ServiceDirectory $workoutServiceDir -Arguments @("dependencyCheckAnalyze") -Environment $dependencyCheckEnvironment
}

function Invoke-FrontendTests {
    Ensure-FrontendDependencies -InstallPlaywrightBrowsers

    Write-Phase "Run frontend coverage"
    Invoke-LoggedCommand -FilePath "npm" -Arguments @("run", "test:coverage") -WorkingDirectory $frontendDir

    Write-Phase "Run mocked browser tests"
    Invoke-LoggedCommand -FilePath "npm" -Arguments @("run", "test:e2e") -WorkingDirectory $frontendDir
}

function Invoke-SmokeTests {
    Ensure-FrontendDependencies -InstallPlaywrightBrowsers

    Write-Phase "Validate compose config"
    Invoke-Compose -Arguments @("config")

    if (-not (Test-DockerAvailable)) {
        Write-Warning "Docker preflight could not confirm the Linux engine from Windows PowerShell. Proceeding to 'docker compose up' as the authoritative check. If startup fails immediately, start Docker Desktop and retry."
    }

    Write-Phase "Start local smoke stack"
    $script:composeWasStarted = $true
    Invoke-Compose -Arguments @("up", "-d", "--build")

    Write-Phase "Wait for gateway stack readiness"
    Write-Host "Using the PowerShell readiness check for local Windows runs."
    Wait-ForGatewayStackReadiness

    Write-Phase "Run real-stack frontend smoke tests"
    Invoke-LoggedCommand -FilePath "npm" -Arguments @("run", "test:e2e:smoke") -WorkingDirectory $frontendDir

    Write-Phase "Run user deletion propagation smoke"
    Invoke-PythonScript -ScriptPath "ops/scripts/test_user_deletion_propagation.py" -WorkingDirectory $repoRoot -Environment @{
        COMPOSE_FILE     = $composeFile
        COMPOSE_ENV_FILE = $script:activeComposeEnvFile
        COMPOSE_PROJECT_NAME = $script:composeProjectName
    }
}

function Invoke-ImageVerification {
    Ensure-FrontendDependencies -InstallPlaywrightBrowsers

    Write-Phase "Validate WebKit launch"
    Invoke-LoggedCommand -FilePath "node" -Arguments @(
        "--input-type=module",
        "-e",
        "import { webkit } from '@playwright/test'; const browser = await webkit.launch(); await browser.close();"
    ) -WorkingDirectory $frontendDir

    Write-Phase "Build frontend production assets"
    Invoke-LoggedCommand -FilePath "npm" -Arguments @("run", "build", "--", "--mode", "production") -WorkingDirectory $frontendDir

    Write-Phase "Build Docker images"
    Invoke-LoggedCommand -FilePath "docker" -Arguments @("build", "-f", "frontend/docker/Dockerfile", "-t", $frontendSecurityImageName, "./frontend") -WorkingDirectory $repoRoot
    Invoke-LoggedCommand -FilePath "docker" -Arguments @("build", "-f", "auth-service/Dockerfile", "-t", $authImageName, ".") -WorkingDirectory $repoRoot
    Invoke-LoggedCommand -FilePath "docker" -Arguments @("build", "-f", "gateway/Dockerfile", "-t", $gatewayImageName, ".") -WorkingDirectory $repoRoot
    Invoke-LoggedCommand -FilePath "docker" -Arguments @("build", "-f", "workout_service/Dockerfile", "-t", $workoutImageName, ".") -WorkingDirectory $repoRoot

    Write-Phase "Verify frontend security headers through Nginx"
    Remove-FrontendSecurityContainer
    Invoke-LoggedCommand -FilePath "docker" -Arguments @("run", "-d", "--rm", "--name", $frontendSecurityContainerName, "-p", "4180:80", $frontendSecurityImageName) -WorkingDirectory $repoRoot
    Wait-ForUrl -Url "http://127.0.0.1:4180/"
    Invoke-LoggedCommand -FilePath "node" -Arguments @("frontend/tests/scripts/verify-nginx-security-headers.mjs", "http://127.0.0.1:4180/") -WorkingDirectory $repoRoot
    Invoke-LoggedCommand -FilePath "node" -Arguments @("frontend/tests/scripts/verify-spa-fallback.mjs", "http://127.0.0.1:4180/") -WorkingDirectory $repoRoot
}

Test-Prerequisites
Initialize-ComposeEnvFile
Initialize-ComposeProjectName

try {
    switch ($Mode) {
        "all" {
            Invoke-BackendTests
            Invoke-SecurityChecks
            Invoke-FrontendTests
            Invoke-SmokeTests
            Invoke-ImageVerification
        }
        "tests" {
            Invoke-BackendTests
            Invoke-SecurityChecks
            Invoke-FrontendTests
        }
        "smoke" {
            Invoke-SmokeTests
        }
        "images" {
            Invoke-ImageVerification
        }
    }

    Write-Host ""
    Write-Host "Local CI runner completed successfully." -ForegroundColor Green
}
catch {
    $script:runFailure = $_
}
finally {
    Write-Phase "Cleanup"

    if (Test-DockerAvailable) {
        Remove-FrontendSecurityContainer
    }
    else {
        Write-Warning "Docker engine is unavailable during cleanup. Skipping frontend security container removal."
    }

    if ($script:composeWasStarted -and -not $KeepStackRunning) {
        if (Test-DockerAvailable) {
            try {
                Invoke-Compose -Arguments @("down", "-v")
            }
            catch {
                Write-Warning ("Failed to stop compose stack during cleanup: {0}" -f $_.Exception.Message)
            }
        }
        else {
            Write-Warning "Docker engine is unavailable during cleanup. Skipping compose shutdown."
        }
    }

    if ($KeepStackRunning -and $script:composeWasStarted) {
        Write-Host "Leaving compose stack running for debugging because -KeepStackRunning was set."
    }

    if ($null -ne $script:generatedComposeEnvFile -and (Test-Path $script:generatedComposeEnvFile)) {
        Remove-Item -LiteralPath $script:generatedComposeEnvFile -Force
    }
}

if ($null -ne $script:runFailure) {
    $PSCmdlet.ThrowTerminatingError($script:runFailure)
}
