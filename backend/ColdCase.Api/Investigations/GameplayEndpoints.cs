using System.Text.Json;
using ColdCase.Application.Investigations;
using ColdCase.Domain.Investigations;

namespace ColdCase.Api.Investigations;

public static class GameplayEndpoints
{
    private static IResult Closed() => Results.Problem(statusCode: 404, title: "Opplysningen er ikke tilgjengelig i denne etterforskningen.");
    private static IResult Unauthorized() => Results.Problem(statusCode: 401, title: "Åpne etterforskningen for å fortsette.");
    private static async Task<IResult> View(Investigation row, IGameplayRepository game, CancellationToken cancellationToken)
    {
        var flags = CaseRules.ReadFlags(row.ProgressJson);
        var set = flags.ToHashSet();
        var board = JsonSerializer.Deserialize<BoardState>(row.BoardJson, CaseRules.Json) ?? BoardState.Empty;
        var actions = await game.ActionsAsync(row.CaseId, cancellationToken);
        var lookup = actions.ToDictionary(x => "action:" + x.Id);
        return Results.Ok(new
        {
            row.Version,
            reviewedEvidenceIds = flags.Where(x => x.StartsWith("review:")).Select(x => x[7..]),
            actions = actions.Where(x => CaseRules.Available(x, set, board)).Select(x => new
                { x.Id, x.Kind, x.PersonId, x.Label, requiresRoute = CaseRules.Rule(x).Route is not null }),
            history = flags.Where(lookup.ContainsKey).Select(key => lookup[key]).Select(x => new { x.Id, x.PersonId, x.Label, x.Response })
        });
    }
    public static void MapGameplayEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/cases/{id}/investigation");
        group.AddEndpointFilter(async (context, next) => context.HttpContext.Request.Method != "GET" &&
            context.HttpContext.Request.Headers["X-ColdCase-Request"] != "1"
                ? Results.Problem(statusCode: 403, title: "Forespørselen kunne ikke godtas.") : await next(context));
        group.MapGet("/progress", async (string id, GameplayView view, IGameplayRepository game, CancellationToken cancellationToken) =>
        {
            var row = await view.SessionAsync(id, cancellationToken);
            return row is null ? Unauthorized() : await View(row, game, cancellationToken);
        });
        group.MapPost("/evidence/{evidenceId}/review", async (string id, string evidenceId, GameplayView view, IGameplayRepository game,
            IInvestigationRepository investigations, CancellationToken cancellationToken) =>
        {
            var row = await view.SessionAsync(id, cancellationToken);
            if (row is null) return Unauthorized();
            var flags = CaseRules.ReadFlags(row.ProgressJson);
            var materials = await game.MaterialsAsync(id, flags.ToHashSet(), cancellationToken);
            if (!materials.Evidence.Any(x => x.Id == evidenceId)) return Closed();
            var next = flags.Append("review:" + evidenceId).Distinct().ToArray();
            if (next.Length != flags.Length)
            {
                var json = JsonSerializer.Serialize(next, CaseRules.Json);
                if (!await investigations.SaveProgressAsync(row.Id, id, row.AccessHash, row.Version, json, cancellationToken))
                    return Results.Problem(statusCode: 409, title: "Etterforskningen er endret. Last inn opplysningene og prøv igjen.");
                row.ProgressJson = json; row.Version++;
            }
            return await View(row, game, cancellationToken);
        });
        group.MapPost("/actions/{actionId}", async (string id, string actionId, ActionRequest request, GameplayView view,
            IGameplayRepository game, IInvestigationRepository investigations, CancellationToken cancellationToken) =>
        {
            var row = await view.SessionAsync(id, cancellationToken);
            if (row is null) return Unauthorized();
            var flags = CaseRules.ReadFlags(row.ProgressJson);
            var actions = await game.ActionsAsync(id, cancellationToken);
            var action = actions.SingleOrDefault(x => x.Id == actionId);
            if (action is null) return Closed();
            if (flags.Contains("action:" + actionId)) return await View(row, game, cancellationToken);
            var board = JsonSerializer.Deserialize<BoardState>(row.BoardJson, CaseRules.Json) ?? BoardState.Empty;
            if (!CaseRules.Available(action, flags.ToHashSet(), board)) return Closed();
            var materials = await game.MaterialsAsync(id, flags.ToHashSet(), cancellationToken);
            var next = CaseRules.Complete(action, flags, board, materials.Map, request.LocationIds);
            if (next is null) return Results.Problem(statusCode: 400, title: "Den valgte ruten støtter ikke denne vurderingen.");
            var json = JsonSerializer.Serialize(next, CaseRules.Json);
            if (!await investigations.SaveProgressAsync(row.Id, id, row.AccessHash, row.Version, json, cancellationToken))
                return Results.Problem(statusCode: 409, title: "Etterforskningen er endret. Last inn opplysningene og prøv igjen.");
            row.ProgressJson = json; row.Version++;
            return await View(row, game, cancellationToken);
        });
    }
}
public sealed record ActionRequest(string[]? LocationIds);
