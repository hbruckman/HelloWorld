using Codex.Atlas;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<MissionControl>();
var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/api/health", () => Results.Ok(new { status = "operational", runtime = ".NET 10" }));
app.MapGet("/api/scenarios", () => MissionControl.Scenarios);
app.MapPost("/api/missions", (LaunchRequest request, MissionControl control) =>
{
    if (!MissionControl.Scenarios.Any(s => s.Id == request.Scenario))
        return Results.BadRequest(new { error = "Choose a valid scenario." });
    if (request.Probes is < 3 or > 12)
        return Results.BadRequest(new { error = "Probe count must be between 3 and 12." });
    var mission = control.Launch(request.Scenario, request.Probes);
    return Results.Created($"/api/missions/{mission.Id}", mission);
});
app.MapGet("/api/missions/{id:guid}", (Guid id, MissionControl control) =>
    control.Find(id) is { } mission ? Results.Ok(mission) : Results.NotFound());
app.Run();

public partial class Program;
