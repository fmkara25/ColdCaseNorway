using ColdCase.Application.Maps;
using ColdCase.Domain.Maps;
using ColdCase.Infrastructure.Persistence;

namespace ColdCase.Tests;

public sealed class RouteConsistencyTests
{
    [Fact]
    public void PickupToTransactionAllowsConservativeDrivingAndMeaningfulStops()
    {
        var graph = Case01MapSeed.CreateGraph();
        var route = RouteEstimator.Estimate(graph,
            ["market", "mill-road", "hospital-turn", "mill-road", "service-area", "station"]);
        Assert.NotNull(route);
        Assert.Equal(10600, route.Meters);
        // Three minutes initial assessment, one decision, three at the service area,
        // one at the station. These are authoring allowances, not timestamped evidence.
        const int stopAllowanceMinutes = 8;
        const int pickupMinute = 22 * 60 + 16;
        const int transactionMinute = 22 * 60 + 52;
        Assert.Equal(25, route.DriveMinutesMax);
        Assert.True(route.DriveMinutesMax + stopAllowanceMinutes <= transactionMinute - pickupMinute);
        Assert.Equal(3, transactionMinute - pickupMinute - route.DriveMinutesMax - stopAllowanceMinutes);
    }

    [Fact]
    public void FullRouteApproximatelyMatchesOdometerWithoutAMiraculousExactMatch()
    {
        var graph = Case01MapSeed.CreateGraph();
        var official = RouteEstimator.Estimate(graph, ["depot", "work-site", "depot"]);
        var actual = RouteEstimator.Estimate(graph,
            ["depot", "work-site", "market", "mill-road", "hospital-turn", "mill-road", "service-area", "station", "depot"]);
        Assert.NotNull(official); Assert.NotNull(actual);
        const int loggedMeters = (81486 - 81442) * 1000;
        Assert.Equal(12000, official.Meters);
        Assert.Equal(43200, actual.Meters);
        Assert.InRange(loggedMeters - actual.Meters, 1, 1000);
        Assert.Equal(32000, loggedMeters - official.Meters);
        Assert.InRange(actual.Meters - official.Meters, 30000, 33000);
    }

    [Fact]
    public void ErikLocationRequiresMoreThanTheEightMinuteWindowEvenAtLowerEstimate()
    {
        var route = RouteEstimator.Estimate(Case01MapSeed.CreateGraph(), ["market", "payphone"]);
        Assert.NotNull(route);
        Assert.True(route.DriveMinutesMin > (22 * 60 + 24) - (22 * 60 + 16));
    }

    [Fact]
    public void OpeningMapCannotRevealOrEstimateHiddenOrOtherCaseLocations()
    {
        var graph = Case01MapSeed.CreateGraph();
        var publicGraph = graph.OpeningOnly(Case01MapSeed.CaseId);
        Assert.Equal(3, publicGraph.Locations.Count);
        Assert.Equal(2, publicGraph.Roads.Count);
        Assert.Null(RouteEstimator.Estimate(publicGraph, ["market", "mill-road"]));
        Assert.Empty(graph.OpeningOnly("another-case").Locations);
        Assert.Empty(graph.OpeningOnly("another-case").Roads);
    }

    [Fact]
    public void RouteRejectsDisconnectedNullOversizedAndRepeatedAdjacentStops()
    {
        var graph = Case01MapSeed.CreateGraph().OpeningOnly(Case01MapSeed.CaseId);
        Assert.Null(RouteEstimator.Estimate(graph, null));
        Assert.Null(RouteEstimator.Estimate(graph, ["hotel"]));
        Assert.Null(RouteEstimator.Estimate(graph, ["hotel", "bus-stop"]));
        Assert.Null(RouteEstimator.Estimate(graph, ["hotel", "hotel"]));
        Assert.Null(RouteEstimator.Estimate(graph, Enumerable.Repeat("hotel", 25).ToArray()));
        var reversed = RouteEstimator.Estimate(graph, ["bus-stop", "market", "hotel"]);
        Assert.NotNull(reversed); Assert.Equal(1500, reversed.Meters);
    }

    [Fact]
    public void SourceTimesAndWalkingWindowAreCompatibleWithOpeningChronology()
    {
        var graph = Case01MapSeed.CreateGraph().OpeningOnly(Case01MapSeed.CaseId);
        var walk = RouteEstimator.Estimate(graph, ["hotel", "market"]);
        Assert.NotNull(walk);
        var availableMinutes = (22 * 60 + 11) - (21 * 60 + 58);
        Assert.InRange(availableMinutes, walk.WalkMinutesMin, walk.WalkMinutesMax);
        Assert.True(21 * 60 + 47 + 4 < 21 * 60 + 58);
    }

    [Fact]
    public void EveryRoadHasValidDistinctEndpointsAndOrderedPositiveTravelEstimates()
    {
        var graph = Case01MapSeed.CreateGraph();
        var ids = graph.Locations.Select(x => x.Id).ToHashSet();
        Assert.Equal(graph.Locations.Count, ids.Count);
        Assert.All(graph.Roads, road =>
        {
            Assert.Contains(road.FromLocationId, ids); Assert.Contains(road.ToLocationId, ids);
            Assert.NotEqual(road.FromLocationId, road.ToLocationId);
            Assert.True(road.Meters > 0);
            Assert.InRange(road.WalkMinutesMin, 1, road.WalkMinutesMax);
            Assert.InRange(road.DriveMinutesMin, 1, road.DriveMinutesMax);
        });
    }
}
