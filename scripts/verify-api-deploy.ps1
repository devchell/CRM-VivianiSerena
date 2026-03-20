param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [string]$ExpectedVersion = '',
  [int]$MaxAttempts = 40,
  [int]$DelaySeconds = 10,
  [string]$AdminEmail = '',
  [string]$AdminPassword = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

function Get-Json {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [hashtable]$Headers = @{}
  )

  $response = Invoke-WebRequest -Uri $Url -Headers $Headers -Method Get -UseBasicParsing
  return $response.Content | ConvertFrom-Json
}

function Invoke-OptionalJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [hashtable]$Headers = @{}
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Headers $Headers -Method Get -UseBasicParsing
    return @{
      StatusCode = [int]$response.StatusCode
      Body = $response.Content
    }
  } catch {
    $statusCode = [int]$_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    $reader.Close()
    return @{
      StatusCode = $statusCode
      Body = $body
    }
  }
}

$live = $null
$ready = $null
$deps = $null
$healthReady = $false

for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
  try {
    $live = Get-Json -Url "$ApiBaseUrl/health/live"
    $ready = Get-Json -Url "$ApiBaseUrl/health/ready"
    $deps = Get-Json -Url "$ApiBaseUrl/health/deps"

    $versionOk = [string]::IsNullOrWhiteSpace($ExpectedVersion) -or $live.version -eq $ExpectedVersion
    if ($live.status -eq 'ok' -and $ready.status -eq 'ready' -and $deps.status -eq 'ready' -and $versionOk) {
      $healthReady = $true
      break
    }
  } catch {
    if ($attempt -eq $MaxAttempts) {
      throw
    }
  }

  if ($attempt -lt $MaxAttempts) {
    Start-Sleep -Seconds $DelaySeconds
  }
}

if (-not $healthReady) {
  throw "API did not reach ready state at $ApiBaseUrl within ${MaxAttempts} attempts."
}

$result = [ordered]@{
  apiBaseUrl = $ApiBaseUrl
  version = $live.version
  expectedVersion = if ([string]::IsNullOrWhiteSpace($ExpectedVersion)) { $null } else { $ExpectedVersion }
  readyChecks = $ready.checks
  dependencyChecks = $deps.checks
}

if (-not [string]::IsNullOrWhiteSpace($AdminEmail) -and -not [string]::IsNullOrWhiteSpace($AdminPassword)) {
  $loginBody = @{
    email = $AdminEmail
    password = $AdminPassword
  } | ConvertTo-Json

  $login = Invoke-RestMethod -Uri "$ApiBaseUrl/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
  $headers = @{ Authorization = "Bearer $($login.data.accessToken)" }

  $googleStatus = Get-Json -Url "$ApiBaseUrl/api/v1/auth/google/status" -Headers $headers
  $availability = Get-Json -Url "$ApiBaseUrl/api/v1/appointments/availability" -Headers $headers
  $googleBusinessGuard = Invoke-OptionalJson -Url "$ApiBaseUrl/api/v1/admin/google-business/locations" -Headers $headers

  $availabilityCount = @($availability.data).Count
  if (-not $googleStatus.data.configured) {
    if ($availabilityCount -ne 0) {
      throw 'Google Calendar availability should be empty when OAuth is not configured.'
    }
    if ($googleBusinessGuard.StatusCode -ne 400) {
      throw 'Google Business guard should return 400 when OAuth is not configured.'
    }
  } elseif (-not $googleStatus.data.connected) {
    if ($availabilityCount -ne 0) {
      throw 'Google Calendar availability should be empty when OAuth is not connected.'
    }
    if ($googleBusinessGuard.StatusCode -ne 409) {
      throw 'Google Business guard should return 409 when OAuth is configured but not connected.'
    }
  }

  $result.google = [ordered]@{
    configured = $googleStatus.data.configured
    connected = $googleStatus.data.connected
    calendarId = $googleStatus.data.calendarId
    hasRefreshToken = $googleStatus.data.hasRefreshToken
    missingConfiguration = $googleStatus.data.missingConfiguration
    scopes = $googleStatus.data.scopes
    redirectUri = $googleStatus.data.redirectUri
    availabilityCount = $availabilityCount
    googleBusinessGuardStatus = $googleBusinessGuard.StatusCode
    googleBusinessGuardBody = $googleBusinessGuard.Body
  }
}

$result | ConvertTo-Json -Depth 8
