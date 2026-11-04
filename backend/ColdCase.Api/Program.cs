using ColdCase.Application.Cases;
using ColdCase.Application.Investigations;
using ColdCase.Api.Investigations;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using ColdCase.Application.Maps;
using ColdCase.Api.Maps;
using ColdCase.Api.Contracts;
using ColdCase.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 128 * 1024);
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("investigation-start", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.OnRejected = async (context, cancellationToken) =>
    {
        await Results.Problem(statusCode: 429, title: "For mange forespørsler. Vent litt og prøv igjen.").ExecuteAsync(context.HttpContext);
    };
});
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<CaseDbContext>(options => options.UseNpgsql(
    builder.Configuration.GetConnectionString("ColdCase")
    ?? throw new InvalidOperationException("ConnectionStrings:ColdCase is required.")));
builder.Services.AddScoped<ICaseRepository, CaseRepository>();
builder.Services.AddScoped<IMapRepository, MapRepository>();
builder.Services.AddScoped<IInvestigationRepository, InvestigationRepository>();
builder.Services.AddScoped<IGameplayRepository, GameplayRepository>();
builder.Services.AddScoped<IReconstructionRepository, ReconstructionRepository>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<GameplayView>();

var app = builder.Build();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    await Results.Problem(statusCode: 500, title: "Kunne ikke hente saksopplysningene.",
        detail: "Prøv igjen senere.").ExecuteAsync(context);
}));
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Cache-Control"] = "no-store";
    await next(context);
});
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    using var scope = app.Services.CreateScope();
    var database = scope.ServiceProvider.GetRequiredService<CaseDbContext>();
    await database.Database.MigrateAsync();
    await CaseSeed.InitializeDevelopmentAsync(database);
}
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", service = "ColdCase.Api" }));
app.MapGet("/api/cases", async (ICaseRepository cases, CancellationToken cancellationToken) =>
    Results.Ok((await cases.ListAsync(cancellationToken)).Select(x => new
    { x.Id, x.Title, x.Location, x.DisappearanceDate, x.MissingPerson, x.Age, x.Summary })));
app.MapGet("/api/cases/{id}", async (string id, ICaseRepository cases, CancellationToken cancellationToken) =>
{
    var file = await cases.FindAsync(id, cancellationToken);
    return file is null
        ? (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.")
        : Results.Ok(CaseOverviewResponse.From(file));
});
app.MapGet("/api/cases/{id}/people", async (string id, ICaseRepository cases, GameplayView game, CancellationToken cancellationToken) =>
{
    if (await cases.FindAsync(id, cancellationToken) is null)
        return (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.");
    var people = (await game.MaterialsAsync(id, cancellationToken)).People;
    return Results.Ok(people.Select(x => new
        { x.Id, x.Name, x.Age, x.Role, x.Introduction }));
});
app.MapGet("/api/cases/{id}/evidence", async (string id, ICaseRepository cases, GameplayView game, CancellationToken cancellationToken) =>
{
    if (await cases.FindAsync(id, cancellationToken) is null)
        return (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.");
    var evidence = (await game.MaterialsAsync(id, cancellationToken)).Evidence;
    return Results.Ok(evidence.Select(x => new
        { x.Id, x.Title, x.Kind, x.Source, x.Body }));
});
app.MapGet("/api/cases/{id}/timeline", async (string id, ICaseRepository cases, GameplayView game, CancellationToken cancellationToken) =>
{
    if (await cases.FindAsync(id, cancellationToken) is null)
        return (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.");
    var events = (await game.MaterialsAsync(id, cancellationToken)).Timeline;
    return Results.Ok(events.Select(x => new
        { x.Id, x.Title, x.Description, x.SourceEvidenceId, x.MinuteOfDay, x.IsEstimate, x.IsPlanned }));
});
app.UseRateLimiter();
app.MapCaseMapEndpoints();
app.MapInvestigationEndpoints();
app.MapGameplayEndpoints();
app.MapReconstructionEndpoints();
app.Run();

public partial class Program { }
