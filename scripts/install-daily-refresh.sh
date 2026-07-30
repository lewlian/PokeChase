#!/bin/zsh
# Install (or reinstall) the daily price-refresh LaunchAgent.
# Uninstall with: launchctl unload ~/Library/LaunchAgents/com.pokechase.daily.plist \
#   && rm ~/Library/LaunchAgents/com.pokechase.daily.plist
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/com.pokechase.daily.plist"
DST="$HOME/Library/LaunchAgents/com.pokechase.daily.plist"
mkdir -p "$HOME/Library/LaunchAgents"
launchctl unload "$DST" 2>/dev/null || true
cp "$SRC" "$DST"
launchctl load "$DST"
echo "Installed. Daily ingest runs at 14:05 local time."
launchctl list | grep pokechase || true
