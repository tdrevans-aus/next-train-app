# Set mock GPS on the Android emulator (Pixel / API 35+).
# Plain `adb emu geo fix` often returns OK without updating fused GPS — this script
# uses the authenticated emulator console and wakes the GPS provider.
#
# Usage:
#   .\scripts\emulator-set-location.ps1
#   .\scripts\emulator-set-location.ps1 -Latitude -31.7872 -Longitude 115.7723
#   .\scripts\emulator-set-location.ps1 -Device emulator-5554 -Latitude -31.7608 -Longitude 115.7864

param(
    [string] $Device = "",
    [double] $Latitude = -31.7872,
    [double] $Longitude = 115.7723
)

function Get-AdbPrefix {
    if ($Device) { return @("-s", $Device) }
    return @()
}

function Invoke-EmulatorConsole {
    param([string[]] $Commands)
    $tokenPath = Join-Path $env:USERPROFILE ".emulator_console_auth_token"
    if (-not (Test-Path $tokenPath)) {
        throw "Missing emulator console token at $tokenPath. Start the emulator from Android Studio first."
    }
    $token = (Get-Content $tokenPath -Raw).Trim()
    $port = if ($Device -match "emulator-(\d+)") { [int]$Matches[1] } else { 5554 }

    $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $port)
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $writer = New-Object System.IO.StreamWriter($stream)
    $writer.AutoFlush = $true

    $reader.ReadLine()
    $writer.WriteLine("auth $token")
    Start-Sleep -Milliseconds 400
    while ($stream.DataAvailable) { $reader.ReadLine() }

    foreach ($command in $Commands) {
        $writer.WriteLine($command)
        Start-Sleep -Milliseconds 500
        while ($stream.DataAvailable) { $reader.ReadLine() }
    }

    $client.Close()
}

$adb = Get-AdbPrefix
Write-Host "Setting emulator location: lat $Latitude, lon $Longitude"

& adb @adb shell cmd location set-location-enabled true 2>$null | Out-Null
& adb @adb shell settings put secure location_providers_allowed +gps,+network 2>$null | Out-Null

Invoke-EmulatorConsole @(
    "geo fix $Longitude $Latitude 25"
    "geo gnss fix $Latitude $Longitude"
)

# Wake GPS so the fix is accepted into fused location (required on recent emulators).
& adb @adb shell pm grant com.google.android.apps.maps android.permission.ACCESS_FINE_LOCATION 2>$null | Out-Null
& adb @adb shell am start -a android.intent.action.VIEW -d "geo:$Latitude,$Longitude" 2>$null | Out-Null
Start-Sleep -Seconds 6

$dumpsys = & adb @adb shell dumpsys location 2>$null
$match = $dumpsys | Select-String "last location=Location\[fused (-?\d+\.?\d*),(-?\d+\.?\d*)" | Select-Object -First 1

if ($match) {
    $gotLat = [double]$match.Matches.Groups[1].Value
    $gotLon = [double]$match.Matches.Groups[2].Value
    Write-Host "Fused location: lat $gotLat, lon $gotLon"
    $delta = [Math]::Sqrt(($gotLat - $Latitude) * ($gotLat - $Latitude) + ($gotLon - $Longitude) * ($gotLon - $Longitude))
    if ($delta -lt 0.05) {
        Write-Host "OK - within about 5 km of target. Open Near me or relaunch Next Train."
        exit 0
    }
    Write-Warning "Location set but coords differ from target (delta ~$delta deg). Try Android Studio Extended controls, Location tab, Single point."
    exit 1
}

Write-Warning "Fused location still empty. Use Android Studio Extended controls, Location tab, Single point."
exit 1
