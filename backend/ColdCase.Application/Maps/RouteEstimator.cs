namespace ColdCase.Application.Maps;

public sealed record RouteEstimate(int Meters, int WalkMinutesMin, int WalkMinutesMax,
    int DriveMinutesMin, int DriveMinutesMax);

public static class RouteEstimator
{
    // Estimate only the path selected by the player. Repeated roads allow a turnaround.
    public static RouteEstimate? Estimate(MapGraph graph, IReadOnlyList<string>? locationIds)
    {
        if (locationIds is null || locationIds.Count is < 2 or > 24) return null;
        var ids = graph.Locations.Select(x => x.Id).ToHashSet();
        if (locationIds.Any(id => string.IsNullOrWhiteSpace(id) || !ids.Contains(id))) return null;
        var meters = 0; var walkMin = 0; var walkMax = 0; var driveMin = 0; var driveMax = 0;
        for (var i = 1; i < locationIds.Count; i++)
        {
            var from = locationIds[i - 1]; var to = locationIds[i];
            if (from == to) return null;
            var road = graph.Roads.Where(x =>
                (x.FromLocationId == from && x.ToLocationId == to) ||
                (x.FromLocationId == to && x.ToLocationId == from))
                .OrderBy(x => x.Meters).ThenBy(x => x.Id).FirstOrDefault();
            if (road is null || road.Meters <= 0 || road.WalkMinutesMin <= 0 ||
                road.WalkMinutesMax < road.WalkMinutesMin || road.DriveMinutesMin <= 0 ||
                road.DriveMinutesMax < road.DriveMinutesMin) return null;
            meters = checked(meters + road.Meters);
            walkMin = checked(walkMin + road.WalkMinutesMin);
            walkMax = checked(walkMax + road.WalkMinutesMax);
            driveMin = checked(driveMin + road.DriveMinutesMin);
            driveMax = checked(driveMax + road.DriveMinutesMax);
        }
        return new(meters, walkMin, walkMax, driveMin, driveMax);
    }
}
