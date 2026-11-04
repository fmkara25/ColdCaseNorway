using ColdCase.Domain.Maps;

namespace ColdCase.Application.Maps;

public sealed record MapGraph(IReadOnlyList<MapLocation> Locations, IReadOnlyList<MapRoad> Roads)
{
    // Defense in depth: never return edges pointing to undiscovered locations.
    public MapGraph OpeningOnly(string caseId)
    {
        var locations = Locations.Where(x => x.CaseId == caseId && x.IsInitiallyVisible).ToArray();
        var ids = locations.Select(x => x.Id).ToHashSet();
        return new(locations, Roads.Where(x => x.CaseId == caseId && x.IsInitiallyVisible &&
            ids.Contains(x.FromLocationId) && ids.Contains(x.ToLocationId)).ToArray());
    }
}

public interface IMapRepository
{
    Task<MapGraph> ReadAsync(string caseId, CancellationToken cancellationToken);
}
