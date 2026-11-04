using ColdCase.Application.Investigations;
using ColdCase.Application.Maps;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class GameplayRepository(CaseDbContext database) : IGameplayRepository
{
    public async Task<IReadOnlyList<ColdCase.Domain.Investigations.CaseAction>> ActionsAsync(string caseId, CancellationToken cancellationToken) =>
        await database.CaseActions.AsNoTracking().Where(x => x.CaseId == caseId).OrderBy(x => x.DisplayOrder).ToListAsync(cancellationToken);
    public async Task<GameMaterials> MaterialsAsync(string caseId, IReadOnlySet<string> flags, CancellationToken cancellationToken)
    {
        var people = flags.Where(x => x.StartsWith("person:")).Select(x => x[7..]).ToArray();
        var evidence = flags.Where(x => x.StartsWith("evidence:")).Select(x => x[9..]).ToArray();
        var timeline = flags.Where(x => x.StartsWith("timeline:")).Select(x => x[9..]).ToArray();
        var locations = flags.Where(x => x.StartsWith("location:")).Select(x => x[9..]).ToArray();
        var roads = flags.Where(x => x.StartsWith("road:")).Select(x => x[5..]).ToArray();
        var points = await database.MapLocations.AsNoTracking().Where(x => x.CaseId == caseId && (x.IsInitiallyVisible || locations.Contains(x.Id))).OrderBy(x => x.Id).ToListAsync(cancellationToken);
        var visibleIds = points.Select(x => x.Id).ToArray();
        var paths = await database.MapRoads.AsNoTracking().Where(x => x.CaseId == caseId && (x.IsInitiallyVisible || roads.Contains(x.Id)) && visibleIds.Contains(x.FromLocationId) && visibleIds.Contains(x.ToLocationId)).OrderBy(x => x.Id).ToListAsync(cancellationToken);
        return new(
            await database.People.AsNoTracking().Where(x => x.CaseId == caseId && (x.IsInitiallyVisible || people.Contains(x.Id))).OrderBy(x => x.Id).ToListAsync(cancellationToken),
            await database.Evidence.AsNoTracking().Where(x => x.CaseId == caseId && (x.IsInitiallyVisible || evidence.Contains(x.Id))).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id).ToListAsync(cancellationToken),
            await database.TimelineEvents.AsNoTracking().Where(x => x.CaseId == caseId && (x.IsInitiallyVisible || timeline.Contains(x.Id))).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id).ToListAsync(cancellationToken),
            new MapGraph(points, paths));
    }
}
