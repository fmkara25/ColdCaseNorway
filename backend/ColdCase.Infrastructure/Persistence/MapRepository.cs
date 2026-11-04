using ColdCase.Application.Maps;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class MapRepository(CaseDbContext database) : IMapRepository
{
    public async Task<MapGraph> ReadAsync(string caseId, CancellationToken cancellationToken) => new(
        await database.MapLocations.AsNoTracking().Where(x => x.CaseId == caseId && x.IsInitiallyVisible)
            .OrderBy(x => x.Id).ToListAsync(cancellationToken),
        await database.MapRoads.AsNoTracking().Where(x => x.CaseId == caseId && x.IsInitiallyVisible)
            .OrderBy(x => x.Id).ToListAsync(cancellationToken));
}
