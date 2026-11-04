using System.Text.Json;
using ColdCase.Application.Investigations;

namespace ColdCase.Api.Investigations;

public static class ReconstructionEndpoints
{
    private static IResult Locked() => Results.Problem(statusCode: 404, title: "Rekonstruksjonen er ikke tilgjengelig ennå.");
    public static void MapReconstructionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/cases/{id}/investigation/reconstruction");
        group.AddEndpointFilter(async (context, next) => context.HttpContext.Request.Method != "GET" && context.HttpContext.Request.Headers["X-ColdCase-Request"] != "1"
            ? Results.Problem(statusCode: 403, title: "Forespørselen kunne ikke godtas.") : await next(context));
        group.MapGet("", async (string id, GameplayView view, IReconstructionRepository solutions, CancellationToken cancellationToken) =>
        {
            var row = await view.SessionAsync(id, cancellationToken);
            if (row is null) return Locked();
            var flags = CaseRules.ReadFlags(row.ProgressJson).ToHashSet();
            if (!flags.Contains("stage:reconstruction")) return Locked();
            var solution = await solutions.FindAsync(id, cancellationToken);
            if (solution is null) return Locked();
            if (flags.Contains("stage:closed")) return Results.Ok(new { isClosed = true, solution.Epilogue });
            var definition = JsonSerializer.Deserialize<ReconstructionDefinition>(solution.DefinitionJson, CaseRules.Json)!;
            var materials = await view.MaterialsAsync(id, cancellationToken);
            return Results.Ok(new
            {
                isClosed = false, definition.Questions, minEvidence = definition.EvidenceGroups.Length,
                maxEvidence = definition.MaxEvidence, definition.StopAllowanceMinutes,
                sources = materials.Evidence.Select(x => new { x.Id, x.Title, reviewed = flags.Contains("review:" + x.Id) }),
                locations = materials.Map.Locations.Select(x => new { x.Id, x.Name })
            });
        });
        group.MapPost("", async (string id, ReconstructionSubmission submission, GameplayView view,
            IReconstructionRepository solutions, IInvestigationRepository investigations, CancellationToken cancellationToken) =>
        {
            var row = await view.SessionAsync(id, cancellationToken);
            if (row is null) return Locked();
            var flags = CaseRules.ReadFlags(row.ProgressJson).ToHashSet();
            if (!flags.Contains("stage:reconstruction")) return Locked();
            if (flags.Contains("stage:closed")) return Results.Ok(new TheoryEvaluation(true, "Rekonstruksjonen er allerede levert."));
            var solution = await solutions.FindAsync(id, cancellationToken);
            if (solution is null) return Locked();
            var definition = JsonSerializer.Deserialize<ReconstructionDefinition>(solution.DefinitionJson, CaseRules.Json)!;
            var result = Reconstruction.Evaluate(definition, flags, await view.MaterialsAsync(id, cancellationToken), submission);
            if (!result.Accepted) return Results.Ok(result);
            var progressJson = JsonSerializer.Serialize(CaseRules.ReadFlags(row.ProgressJson).Append("stage:closed").Distinct(), CaseRules.Json);
            if (!await investigations.SaveReconstructionAsync(row.Id, id, row.AccessHash, row.Version, progressJson,
                JsonSerializer.Serialize(submission, CaseRules.Json), cancellationToken))
                return Results.Problem(statusCode: 409, title: "Etterforskningen er endret. Oppdater opplysningene og prøv igjen.");
            return Results.Ok(result);
        });
    }
}
