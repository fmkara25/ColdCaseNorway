using ColdCase.Application.Investigations;
using ColdCase.Domain.Investigations;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class InvestigationRepository(CaseDbContext database) : IInvestigationRepository
{
    public Task<Investigation?> ReadAsync(string caseId, string accessHash, CancellationToken cancellationToken) =>
        database.Investigations.AsNoTracking().SingleOrDefaultAsync(x => x.CaseId == caseId && x.AccessHash == accessHash && x.CreatedAt > DateTimeOffset.UtcNow.AddDays(-90), cancellationToken);
    public async Task CreateAsync(Investigation investigation, CancellationToken cancellationToken)
    {
        database.Investigations.Add(investigation);
        await database.SaveChangesAsync(cancellationToken);
    }
    public async Task<bool> SaveReconstructionAsync(Guid id, string caseId, string accessHash, int expectedVersion, string progressJson, string reconstructionJson, CancellationToken cancellationToken) =>
        await database.Investigations.Where(x => x.Id == id && x.CaseId == caseId && x.AccessHash == accessHash && x.Version == expectedVersion)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.ProgressJson, progressJson)
                .SetProperty(x => x.ReconstructionJson, reconstructionJson).SetProperty(x => x.Version, x => x.Version + 1), cancellationToken) == 1;

    public async Task<bool> SaveProgressAsync(Guid id, string caseId, string accessHash, int expectedVersion, string progressJson, CancellationToken cancellationToken) =>
        await database.Investigations.Where(x => x.Id == id && x.CaseId == caseId && x.AccessHash == accessHash && x.Version == expectedVersion)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.ProgressJson, progressJson).SetProperty(x => x.Version, x => x.Version + 1), cancellationToken) == 1;

    public async Task<bool> SaveBoardAsync(Guid id, string caseId, string accessHash, int expectedVersion, string boardJson, CancellationToken cancellationToken) =>
        await database.Investigations.Where(x => x.Id == id && x.CaseId == caseId && x.AccessHash == accessHash && x.Version == expectedVersion)
            .ExecuteUpdateAsync(update => update.SetProperty(x => x.BoardJson, boardJson).SetProperty(x => x.Version, x => x.Version + 1), cancellationToken) == 1;
}
