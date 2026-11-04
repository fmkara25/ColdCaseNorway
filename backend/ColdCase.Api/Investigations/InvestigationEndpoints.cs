using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ColdCase.Application.Cases;
using ColdCase.Application.Investigations;
using ColdCase.Domain.Investigations;

namespace ColdCase.Api.Investigations;

public static class InvestigationEndpoints
{
    private const string Cookie = "ccn-investigation";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private static string? Access(HttpContext context) => context.Request.Cookies.TryGetValue(Cookie, out var token) &&
        token.Length == 64 && token.All(Uri.IsHexDigit) ? Hash(token) : null;
    private static IResult Unauthorized() => Results.Problem(statusCode: 401, title: "Åpne etterforskningen på nytt for å fortsette.");
    private static IResult Response(Investigation row) => Results.Ok(new
    {
        row.Version, board = JsonSerializer.Deserialize<BoardState>(row.BoardJson, Json)
    });

    public static void MapInvestigationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/cases/{id}/investigation");
        group.AddEndpointFilter(async (context, next) =>
        {
            // A custom header plus same-origin CORS policy blocks browser cross-site writes.
            // No cross-origin policy is enabled by this API.
            if (context.HttpContext.Request.Method != "GET" && context.HttpContext.Request.Headers["X-ColdCase-Request"] != "1")
                return Results.Problem(statusCode: 403, title: "Forespørselen kunne ikke godtas.");
            return await next(context);
        });
        group.MapPost("", async (string id, HttpContext context, ICaseRepository cases, IInvestigationRepository investigations, CancellationToken cancellationToken) =>
        {
            if (await cases.FindAsync(id, cancellationToken) is null)
                return (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.");
            var hash = Access(context);
            var existing = hash is null ? null : await investigations.ReadAsync(id, hash, cancellationToken);
            if (existing is not null) return Response(existing);
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            var row = new Investigation { Id = Guid.NewGuid(), CaseId = id, AccessHash = Hash(token),
                CreatedAt = DateTimeOffset.UtcNow, BoardJson = JsonSerializer.Serialize(BoardState.Empty, Json) };
            await investigations.CreateAsync(row, cancellationToken);
            context.Response.Cookies.Append(Cookie, token, new CookieOptions
            {
                HttpOnly = true, Secure = !app.Environment.IsDevelopment(), SameSite = SameSiteMode.Strict,
                Path = "/api/cases/" + Uri.EscapeDataString(id), MaxAge = TimeSpan.FromDays(90), IsEssential = true
            });
            return Response(row);
        }).RequireRateLimiting("investigation-start");
        group.MapGet("", async (string id, HttpContext context, IInvestigationRepository investigations, CancellationToken cancellationToken) =>
        {
            var hash = Access(context);
            var row = hash is null ? null : await investigations.ReadAsync(id, hash, cancellationToken);
            return row is null ? Unauthorized() : Response(row);
        });
        group.MapPut("/board", async (string id, BoardSave save, HttpContext context, ICaseRepository cases, IInvestigationRepository investigations, CancellationToken cancellationToken) =>
        {
            var hash = Access(context);
            var row = hash is null ? null : await investigations.ReadAsync(id, hash, cancellationToken);
            if (row is null || hash is null) return Unauthorized();
            var people = await cases.ListPeopleAsync(id, cancellationToken);
            var evidence = await cases.ListEvidenceAsync(id, cancellationToken);
            var accessible = people.Where(x => x.IsInitiallyVisible).Select(x => "person:" + x.Id)
                .Concat(evidence.Where(x => x.IsInitiallyVisible).Select(x => "evidence:" + x.Id)).ToHashSet();
            if (save.Version < 0 || !BoardValidation.IsValid(save.Board, accessible))
                return Results.Problem(statusCode: 400, title: "Tavlen inneholder ugyldige eller utilgjengelige opplysninger.");
            var json = JsonSerializer.Serialize(save.Board, Json);
            var updated = await investigations.SaveBoardAsync(row.Id, id, hash, save.Version, json, cancellationToken);
            return updated ? Results.Ok(new { version = save.Version + 1, board = save.Board })
                : (IResult)Results.Problem(statusCode: 409, title: "Tavlen er endret i en annen fane. Last inn den lagrede versjonen før du prøver igjen.");
        });
    }
}
