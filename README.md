# ATLAS · Exploration Systems

A Codex showcase built in **C# / ASP.NET Core / .NET 10**. Command an autonomous probe fleet through a simulated deep-space survey, with a custom responsive dashboard and a working server-side mission engine.

## Try it

```bash
./scripts/setup.sh   # install the pinned SDK if needed, restore, build, test
./scripts/run.sh     # serve on port 5080
```

On a local machine, open `http://localhost:5080`. In this cloud environment, use local HTTP requests for validation; the onboarding UI does not provide a web preview.

Select **Kepler Expanse**, **Europa Drift**, or **Orion Veil**, choose 3–12 probes, and launch. A survey takes 30 seconds. Watch probe positions, signal strength, coverage, samples, discoveries, and telemetry evolve. Export a JSON report or revisit a mission from the archive. The archive lasts for the current page session; the server keeps at most 256 missions in memory and resets on restart. All observations are synthetic.

The app has no frontend packages, external fonts, database, API keys, or runtime network dependencies.

## Develop

With .NET SDK 10.0.402 on your PATH:

```bash
dotnet restore Codex.Atlas.sln --locked-mode
dotnet build Codex.Atlas.sln -c Release --no-restore
dotnet test Codex.Atlas.sln -c Release --no-build
dotnet watch --project src/Codex.Atlas
```

The cloud helper scripts keep SDK state and NuGet packages under `/workspace`, where writes are allowed. Override `DOTNET_ROOT`, `DOTNET_CLI_HOME`, or `NUGET_PACKAGES` for other machines. Set `ATLAS_URLS` to change the listen address. Some sandboxed hosts require permission for .NET's system synchronization files.

## What's inside

- **Mission engine:** deterministic snapshots driven by `TimeProvider`, independent of client polling; clock injection makes a 30-second mission testable instantly.
- **HTTP API:** minimal endpoints, launch validation, bounded concurrent mission storage, health endpoint, and static frontend delivery.
- **Interface:** procedural starfield, animated probes, three destination palettes, live telemetry, session archive, report download, responsive layouts, keyboard controls, and reduced-motion support.
- **Tests:** xUnit progression and fleet-boundary tests, plus API integration tests using the real ASP.NET pipeline.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Runtime health |
| `GET /api/scenarios` | Destination metadata |
| `POST /api/missions` | Launch with `{"scenario":"kepler","probes":6}` |
| `GET /api/missions/{id}` | Current mission snapshot; 404 if unknown or evicted |

```bash
curl -s http://127.0.0.1:5080/api/health
curl -s http://127.0.0.1:5080/api/missions \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"kepler","probes":6}'
```

## Browser smoke test

The optional Playwright test exercises desktop and mobile layouts, navigation, launch, real-time completion, archive, report contents, and a second launch. Start the server first, then run:

```bash
cd tests/browser
npm ci
npx playwright install chromium
npm test
```

To use an existing Chromium installation, set `CHROMIUM_PATH=/usr/bin/chromium`. Set `ATLAS_BASE_URL` to test another server. Screenshots are written to the ignored `artifacts/` directory.

## Scope

This is a self-contained development showcase. Mission storage is temporary; there is no authentication or real astronomical data. Publishing it as a shared service would require an explicit persistence, access-control, and resource-limiting design.
