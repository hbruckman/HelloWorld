using System.Collections.Concurrent;

namespace Codex.Atlas;

public sealed record Scenario(string Id, string Name, string Sector, string Description, int Distance, string Color);
public sealed record LaunchRequest(string Scenario, int Probes);
public sealed record Probe(int Id, string Name, double X, double Y, int Signal, string Status);
public sealed record TelemetryEvent(int Tick, string Category, string Message);
public sealed record Mission(Guid Id, string Scenario, int Probes, int Tick, int Progress, string Status,
    double Coverage, int Samples, int Anomalies, IReadOnlyList<Probe> Fleet, IReadOnlyList<TelemetryEvent> Events);

// The clock is injected per read rather than using background timers: snapshots are
// deterministic, thread-safe, and independent of client polling frequency.
public sealed class MissionControl(TimeProvider? timeProvider = null)
{
    private readonly TimeProvider clock = timeProvider ?? TimeProvider.System;
    private readonly ConcurrentDictionary<Guid, (string Scenario, int Probes, DateTimeOffset Started)> missions = new();
    private const int Capacity = 256;
    public static readonly Scenario[] Scenarios =
    [
        new("kepler", "Kepler Expanse", "SECTOR 07 · CYGNUS", "Trace a signal through a field of uncharted worlds.", 1240, "#c4f46d"),
        new("europa", "Europa Drift", "SECTOR 02 · JOVIAN", "Map the fractures beneath an ocean moon’s frozen surface.", 628, "#80caff"),
        new("orion", "Orion Veil", "SECTOR 12 · ORION", "Find order in the noise of a stellar nursery.", 1344, "#d4a5ff")
    ];

    public Mission Launch(string scenario, int probes)
    {
        if (!Scenarios.Any(s => s.Id == scenario)) throw new ArgumentException("Unknown scenario.", nameof(scenario));
        if (probes is < 3 or > 12) throw new ArgumentOutOfRangeException(nameof(probes));
        var id = Guid.NewGuid();
        missions[id] = (scenario, probes, clock.GetUtcNow());
        // Bound in-memory retention; no external database or credentials required.
        if (missions.Count > Capacity)
            foreach (var expired in missions.OrderBy(x => x.Value.Started).Take(missions.Count - Capacity))
                missions.TryRemove(expired.Key, out _);
        return Find(id)!;
    }

    public Mission? Find(Guid id)
    {
        if (!missions.TryGetValue(id, out var entry)) return null;
        var tick = Math.Clamp((int)(clock.GetUtcNow() - entry.Started).TotalSeconds, 0, 30);
        return Simulate(id, entry.Scenario, entry.Probes, tick);
    }

    public static Mission Simulate(Guid id, string scenario, int probes, int tick)
    {
        tick = Math.Clamp(tick, 0, 30);
        var sector = Array.FindIndex(Scenarios, s => s.Id == scenario);
        var fleet = Enumerable.Range(0, probes).Select(i =>
        {
            var angle = i * Math.Tau / probes + tick * .021 + sector * .6;
            var radius = 10 + tick * .8 + (i % 3) * 5;
            return new Probe(i + 1, $"AX-{i + 1:00}", Math.Round(50 + Math.Cos(angle) * radius, 2),
                Math.Round(50 + Math.Sin(angle) * radius * .76, 2), 88 + (i * 7 + tick) % 12,
                tick == 30 ? "Complete" : tick < 3 ? "Deploying" : "Scanning");
        }).ToArray();
        var events = new List<TelemetryEvent> { new(0, "SYS", $"Uplink established. {probes} probes standing by.") };
        if (tick >= 3) events.Add(new(3, "NAV", "Formation locked. Autonomous sweep initiated."));
        if (tick >= 8) events.Add(new(8, "SCAN", "First spectral signature acquired."));
        if (tick >= 14) events.Add(new(14, "FIND", "Anomaly detected. Cross-referencing nearby probes."));
        if (tick >= 21) events.Add(new(21, "SCAN", "Deep-field survey synchronized across fleet."));
        if (tick >= 26) events.Add(new(26, "FIND", "Secondary signature confirmed. Coordinates archived."));
        if (tick == 30) events.Add(new(30, "SYS", "Survey complete. Mission report ready for export."));
        return new(id, scenario, probes, tick, tick * 100 / 30, tick == 30 ? "Complete" : "Active",
            Math.Round(tick / 30d * 98.4, 1), tick * probes * 17, (tick >= 14 ? 1 : 0) + (tick >= 26 ? 1 : 0), fleet, events);
    }
}
