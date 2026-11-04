using ColdCase.Application.Maps;
using ColdCase.Domain.Maps;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public static class Case01MapSeed
{
    public const string CaseId = "1999-1218";

    // Authoring data stays on the server. It is NOT an API response or a prescribed player route.
    public static MapGraph CreateGraph()
    {
        MapLocation Point(string id, string name, string description, int x, int y, bool visible = false) =>
            new() { CaseId = CaseId, Id = id, Name = name, Description = description, X = x, Y = y, IsInitiallyVisible = visible };
        MapRoad Road(string id, string from, string to, int meters, int walkMin, int walkMax, int driveMin, int driveMax, bool visible = false) =>
            new() { CaseId = CaseId, Id = id, FromLocationId = from, ToLocationId = to, Meters = meters,
                WalkMinutesMin = walkMin, WalkMinutesMax = walkMax, DriveMinutesMin = driveMin,
                DriveMinutesMax = driveMax, IsInitiallyVisible = visible };
        return new([
            Point("hotel", "Skardal Hotel", "Ingrids arbeidsplass. Hun forlot hotellet kl. 21.58.", 180, 270, true),
            Point("market", "Butikken", "Ingrid ble sett i nærheten omtrent kl. 22.11.", 480, 330, true),
            Point("bus-stop", "Bussholdeplassen", "Planlagt avgang til Trondheim kl. 22.45. Billetten ble ikke brukt.", 740, 190, true),
            Point("depot", "Selskapets base", "Utgangspunkt for selskapets biler.", 100, 620),
            Point("work-site", "Arbeidsstedet", "Stedet som er oppgitt i arbeidsordren.", 270, 510),
            Point("mill-road", "Gamle Møllevei", "En vei utenfor sentrum.", 580, 480),
            Point("hospital-turn", "Veikrysset mot sykehuset", "Et veikryss i retning sykehuset, ikke selve sykehuset.", 760, 540),
            Point("service-area", "Det gamle serviceområdet", "Et eldre serviceområde utenfor sentrum.", 830, 410),
            Point("station", "Skardal Nord bensinstasjon", "Bensinstasjonen nord for Skardal.", 900, 120),
            Point("payphone", "Telefonstedet", "Stedet som er knyttet til Eriks tidsopplysninger.", 100, 80)
        ], [
            Road("hotel-market", "hotel", "market", 800, 10, 14, 2, 4, true),
            Road("market-bus", "market", "bus-stop", 700, 9, 13, 2, 3, true),
            Road("depot-work", "depot", "work-site", 6000, 80, 105, 10, 14),
            Road("work-market", "work-site", "market", 6000, 80, 105, 10, 14),
            Road("market-mill", "market", "mill-road", 3000, 40, 55, 5, 7),
            Road("mill-hospital-turn", "mill-road", "hospital-turn", 1000, 14, 19, 2, 3),
            Road("mill-service", "mill-road", "service-area", 2800, 38, 52, 5, 6),
            Road("service-station", "service-area", "station", 2800, 38, 52, 5, 6),
            Road("station-depot", "station", "depot", 20600, 275, 360, 30, 42),
            Road("market-payphone", "market", "payphone", 14000, 185, 245, 22, 30)
        ]);
    }

    public static async Task InitializeAsync(CaseDbContext database)
    {
        var graph = CreateGraph();
        foreach (var point in graph.Locations)
            if (!await database.MapLocations.AnyAsync(x => x.CaseId == CaseId && x.Id == point.Id)) database.MapLocations.Add(point);
        await database.SaveChangesAsync();
        foreach (var road in graph.Roads)
            if (!await database.MapRoads.AnyAsync(x => x.CaseId == CaseId && x.Id == road.Id)) database.MapRoads.Add(road);
        await database.SaveChangesAsync();
    }
}
