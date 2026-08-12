#!/usr/bin/env bash
# Optional Maestro preamble via adb (debug APK only).
set -euo pipefail
adb shell am start -a android.intent.action.VIEW -d "nexttrain://test/seed?fixture=normal&station=Edgewater%20Stn&direction=Perth&reset=1&test=1"
