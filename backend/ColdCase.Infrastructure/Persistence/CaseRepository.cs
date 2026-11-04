using ColdCase.Application.Cases;
using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class CaseRepository(CaseDbContext database) : ICaseRepository
{
    public async Task<IReadOnlyList<CaseFile>> ListAsync(CancellationToken cancellationToken) =>
        await database.Cases.AsNoTracking().OrderBy(x => x.Id).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Person>> ListPeopleAsync(string caseId, CancellationToken cancellationToken) =>
        await database.People.AsNoTracking().Where(x => x.CaseId == caseId && x.IsInitiallyVisible)
            .OrderBy(x => x.Id).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Evidence>> ListEvidenceAsync(string caseId, CancellationToken cancellationToken) =>
        await database.Evidence.AsNoTracking().Where(x => x.CaseId == caseId && x.IsInitiallyVisible)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id).ToListAsync(cancellationToken);

    public Task<CaseFile?> FindAsync(string id, CancellationToken cancellationToken) =>
        database.Cases.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
}
