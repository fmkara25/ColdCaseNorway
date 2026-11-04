using ColdCase.Application.Cases;
using ColdCase.Api.Contracts;
using ColdCase.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<CaseDbContext>(options => options.UseNpgsql(
    builder.Configuration.GetConnectionString("ColdCase")
    ?? throw new InvalidOperationException("ConnectionStrings:ColdCase is required.")));
builder.Services.AddScoped<ICaseRepository, CaseRepository>();

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
app.MapGet("/api/cases/{id}/people", async (string id, ICaseRepository cases, CancellationToken cancellationToken) =>
{
    if (await cases.FindAsync(id, cancellationToken) is null)
        return (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.");
    var people = await cases.ListPeopleAsync(id, cancellationToken);
    return Results.Ok(people.Where(x => x.IsInitiallyVisible).Select(x => new
        { x.Id, x.Name, x.Age, x.Role, x.Introduction }));
});
app.Run();

public partial class Program { }
