#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export DOTNET_ROOT="${DOTNET_ROOT:-/workspace/.dotnet}"
export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-/workspace/.dotnet-home}"
export NUGET_PACKAGES="${NUGET_PACKAGES:-/workspace/.nuget/packages}"
export DOTNET_CLI_TELEMETRY_OPTOUT=1
if [[ ! -x "$DOTNET_ROOT/dotnet" ]]; then
  installer="$(mktemp)"
  trap 'rm -f "$installer"' EXIT
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o "$installer"
  bash "$installer" --version 10.0.402 --install-dir "$DOTNET_ROOT" --no-path
fi
export PATH="$DOTNET_ROOT:$PATH"
dotnet restore Codex.Atlas.sln --locked-mode
dotnet build Codex.Atlas.sln -c Release --no-restore
dotnet test Codex.Atlas.sln -c Release --no-build
