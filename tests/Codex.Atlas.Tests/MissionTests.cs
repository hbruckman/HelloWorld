using System.Net;
using System.Net.Http.Json;
using Codex.Atlas;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public class MissionTests
{
    [Fact]
    public void MissionAdvancesWithClockAndCompletes()
    {
        var clock = new TestClock();
        var control = new MissionControl(clock);
        var mission = control.Launch("kepler", 6);
        Assert.Equal(0, mission.Progress);
        Assert.All(mission.Fleet, p => Assert.Equal("Deploying", p.Status));
        clock.Now += TimeSpan.FromSeconds(14);
        var mid = control.Find(mission.Id)!;
        Assert.Equal(1, mid.Anomalies);
        Assert.Equal(1428, mid.Samples);
        Assert.NotEqual(mission.Fleet[0].X, mid.Fleet[0].X);
        clock.Now += TimeSpan.FromMinutes(2);
        var end = control.Find(mission.Id)!;
        Assert.Equal("Complete", end.Status);
        Assert.Equal(100, end.Progress);
        Assert.Equal(2, end.Anomalies);
        Assert.Equal(98.4, end.Coverage);
        Assert.All(end.Fleet, p => Assert.Equal("Complete", p.Status));
        Assert.Equal(7, end.Events.Count);
    }

    [Theory]
    [InlineData("kepler", 3)] [InlineData("europa", 8)] [InlineData("orion", 12)]
    public void FleetRemainsOnMapWithValidSignals(string scenario, int count)
    {
        for (int tick = 0; tick <= 30; tick++)
        {
            var result = MissionControl.Simulate(Guid.Empty, scenario, count, tick);
            Assert.Equal(count, result.Fleet.Count);
            Assert.All(result.Fleet, p => { Assert.InRange(p.X, 0, 100); Assert.InRange(p.Y, 0, 100); Assert.InRange(p.Signal, 0, 100); });
        }
    }

    [Fact]
    public async Task ApiLaunchesAndRetrievesMissionAndServesApp()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();
        var page = await client.GetStringAsync("/");
        Assert.Contains("ATLAS", page);
        var response = await client.PostAsJsonAsync("/api/missions", new LaunchRequest("europa", 8));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<Mission>())!;
        var fetched = await client.GetFromJsonAsync<Mission>($"/api/missions/{created.Id}");
        Assert.Equal(created.Id, fetched!.Id);
        Assert.Equal(8, fetched.Fleet.Count);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/missions/{Guid.NewGuid()}")).StatusCode);
    }

    [Theory]
    [InlineData("invalid", 6)] [InlineData("kepler", 0)] [InlineData("kepler", 13)]
    public async Task ApiRejectsInvalidLaunches(string scenario, int probes)
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/missions", new LaunchRequest(scenario, probes));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private sealed class TestClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
