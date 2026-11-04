using ColdCase.Application.Investigations;
using ColdCase.Domain.Investigations;

namespace ColdCase.Api.Investigations;

public sealed class GameplayView(IHttpContextAccessor context, IInvestigationRepository investigations, IGameplayRepository game)
{
    public Task<Investigation?> SessionAsync(string caseId, CancellationToken cancellationToken)
    {
        var hash = context.HttpContext is null ? null : InvestigationEndpoints.Access(context.HttpContext);
        return hash is null ? Task.FromResult<Investigation?>(null) : investigations.ReadAsync(caseId, hash, cancellationToken);
    }
    public async Task<GameMaterials> MaterialsAsync(string caseId, CancellationToken cancellationToken)
    {
        var row = await SessionAsync(caseId, cancellationToken);
        string[] flags = row is null ? [] : CaseRules.ReadFlags(row.ProgressJson);
        return await game.MaterialsAsync(caseId, flags.ToHashSet(), cancellationToken);
    }
}
