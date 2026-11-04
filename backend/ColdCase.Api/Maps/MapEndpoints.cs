using ColdCase.Application.Cases;
using ColdCase.Api.Investigations;
using ColdCase.Application.Maps;

namespace ColdCase.Api.Maps;

public static class MapEndpoints
{
    public static void MapCaseMapEndpoints(this WebApplication app)
    {
        app.MapGet("/api/cases/{id}/map", async (string id, ICaseRepository cases, GameplayView game, CancellationToken cancellationToken) =>
        {
            if (await cases.FindAsync(id, cancellationToken) is null)
                return (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.");
            var graph = (await game.MaterialsAsync(id, cancellationToken)).Map;
            return Results.Ok(new
            {
                locations = graph.Locations.Select(x => new { x.Id, x.Name, x.Description, x.X, x.Y }),
                roads = graph.Roads.Select(x => new { x.Id, x.FromLocationId, x.ToLocationId, x.Meters,
                    x.WalkMinutesMin, x.WalkMinutesMax, x.DriveMinutesMin, x.DriveMinutesMax })
            });
        });
        app.MapPost("/api/cases/{id}/map/estimate", async (string id, RouteRequest request, ICaseRepository cases, GameplayView game, CancellationToken cancellationToken) =>
        {
            if (await cases.FindAsync(id, cancellationToken) is null)
                return (IResult)Results.Problem(statusCode: 404, title: "Saken finnes ikke.");
            var graph = (await game.MaterialsAsync(id, cancellationToken)).Map;
            var estimate = RouteEstimator.Estimate(graph, request.LocationIds);
            return estimate is null
                ? (IResult)Results.Problem(statusCode: 400, title: "Ruten må følge tilgjengelige veier.")
                : Results.Ok(estimate);
        });
    }
}

public sealed record RouteRequest(string[]? LocationIds);
