using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public static class OpeningTimelineSeed
{
    public static async Task InitializeAsync(CaseDbContext database)
    {
        var events = new TimelineEvent[]
        {
            new() { Id = "shift-start", DisplayOrder = 1, MinuteOfDay = 840, Title = "Vakten begynner", Description = "Ingrid begynner på jobb i resepsjonen på Skardal Hotel.", SourceEvidenceId = "hotel-log" },
            new() { Id = "phone-call", DisplayOrder = 2, MinuteOfDay = 1307, Title = "Telefonsamtale", Description = "En samtale på omtrent fire minutter er registrert. Innholdet fremgår ikke av loggen.", SourceEvidenceId = "phone-log" },
            new() { Id = "hotel-departure", DisplayOrder = 3, MinuteOfDay = 1318, Title = "Ingrid forlater hotellet", Description = "Saksoversikten oppgir at hun forlot hotellet kl. 21.58.", SourceEvidenceId = "hotel-log" },
            new() { Id = "market-sighting", DisplayOrder = 4, MinuteOfDay = 1331, IsEstimate = true, Title = "Sett ved butikken", Description = "Et vitne oppgir å ha sett Ingrid i nærheten av butikken. Tidspunktet er omtrentlig.", SourceEvidenceId = "market-witness" },
            new() { Id = "unexplained-gap", DisplayOrder = 5, Title = "Et uavklart tidsrom", Description = "Hva skjedde mellom observasjonen ved butikken og den planlagte bussavgangen?" },
            new() { Id = "scheduled-bus", DisplayOrder = 6, MinuteOfDay = 1365, IsPlanned = true, Title = "Planlagt bussavgang", Description = "Bussen til Trondheim hadde avgang kl. 22.45. Billetten ble ikke brukt; dette er ikke en bekreftet reise.", SourceEvidenceId = "bus-ticket" }
        };
        foreach (var item in events)
        {
            if (await database.TimelineEvents.AnyAsync(x => x.CaseId == "1999-1218" && x.Id == item.Id)) continue;
            item.CaseId = "1999-1218";
            item.IsInitiallyVisible = true;
            database.TimelineEvents.Add(item);
        }
        await database.SaveChangesAsync();
    }
}
