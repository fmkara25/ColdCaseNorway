using ColdCase.Application.Cases;
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
app.UseExceptionHandler();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    using var scope = app.Services.CreateScope();
    await CaseSeed.InitializeDevelopmentAsync(scope.ServiceProvider.GetRequiredService<CaseDbContext>());
}
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", service = "ColdCase.Api" }));
app.MapGet("/api/cases", async (ICaseRepository cases, CancellationToken cancellationToken) =>
    Results.Ok((await cases.ListAsync(cancellationToken)).Select(x => new
    { x.Id, x.Title, x.Location, x.DisappearanceDate, x.MissingPerson, x.Age, x.Summary })));
app.MapGet("/api/cases/{id}", async (string id, ICaseRepository cases, CancellationToken cancellationToken) =>
{
    var file = await cases.FindAsync(id, cancellationToken);
    return file is null
        ? (IResult)Results.NotFound(new { message = "Saken finnes ikke." })
        : Results.Ok(file);
});
app.Run();
