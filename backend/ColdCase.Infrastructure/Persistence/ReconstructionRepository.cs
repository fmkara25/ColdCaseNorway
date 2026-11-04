using ColdCase.Application.Investigations;
using ColdCase.Domain.Investigations;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class ReconstructionRepository(CaseDbContext database) : IReconstructionRepository
{
    public Task<CaseSolution?> FindAsync(string caseId, CancellationToken cancellationToken) =>
        database.CaseSolutions.AsNoTracking().SingleOrDefaultAsync(x => x.CaseId == caseId, cancellationToken);
}
