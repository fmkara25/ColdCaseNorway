using System.Text.Json;
using ColdCase.Application.Investigations;

namespace ColdCase.Api.Investigations;

public static class VerdictEndpoints
{
    public static void MapVerdictEndpoints(this WebApplication app)
    {
        app.MapPost("/api/cases/1999-1218/verdict", async (VerdictRequest request, HttpContext context,
            IReconstructionRepository solutions, CancellationToken cancellationToken) =>
        {
            if (context.Request.Headers["X-ColdCase-Request"] != "1") return Results.StatusCode(403);
            if (request.SuspectId is not ("erik" or "jonas" or "lars")) return Results.BadRequest();
            if (request.EventId is not (null or "accident" or "planned" or "departure")) return Results.BadRequest();
            var solution = await solutions.FindAsync("1999-1218", cancellationToken);
            if (solution is null) return Results.NotFound();
            var definition = JsonSerializer.Deserialize<ReconstructionDefinition>(solution.DefinitionJson, CaseRules.Json);
            if (definition is null || !definition.ExpectedAnswers.TryGetValue("driver", out var driver))
                return Results.NotFound();

            return Results.Ok(new
            {
                correct = request.SuspectId == driver,
                eventCorrect = request.EventId is null ? (bool?)null : definition.ExpectedAnswers.GetValueOrDefault("event") == request.EventId,
                explanation = "Ingrid ble frivillig med Lars Viken fra butikken. På den glatte Gamle Møllevei mistet han kontrollen over bilen, og Ingrid ble alvorlig skadet. Det var en ulykke. Lars valgte å la være å tilkalle hjelp. Han forlot Ingrid ved det gamle serviceområdet og forsøkte å skjule det som hadde skjedd. Ingrid ble aldri funnet. Det nøyaktige dødstidspunktet og hva som senere skjedde med henne, er fortsatt uavklart."
            });
        });
    }

    public sealed record VerdictRequest(string SuspectId, string? EventId = null);
}
