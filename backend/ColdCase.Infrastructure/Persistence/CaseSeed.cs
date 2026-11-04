using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public static class CaseSeed
{
    public static async Task InitializeDevelopmentAsync(CaseDbContext database)
    {
        // Call only after schema migrations have been applied.
        if (!await database.Cases.AnyAsync(x => x.Id == "1999-1218"))
        {
        database.Cases.Add(new CaseFile
        {
            Id = "1999-1218",
            Title = "Forsvinningen i Skardal",
            Location = "Skardal, Trøndelag",
            DisappearanceDate = new DateOnly(1999, 12, 18),
            MissingPerson = "Ingrid Solberg",
            Age = 23,
            Summary = "Ingrid Solberg forsvant etter en kveldsvakt på Skardal Hotel. Saken er fortsatt uoppklart.",
            InitialReport = "Ingrid Solberg, 23 år, ble meldt savnet etter at hun forsvant fra Skardal 18. desember 1999. Hun arbeidet i resepsjonen på Skardal Hotel. Hun hadde kjøpt billett til bussen til Trondheim med avgang kl. 22.45. I den opprinnelige etterforskningen ble det vurdert om hun hadde reist frivillig. Det er ikke avklart hva som skjedde denne kvelden."
        });
        await database.SaveChangesAsync();
        }
        var people = new Person[]
        {
            new() { Id = "ingrid", Name = "Ingrid Solberg", Age = 23, Role = "Savnet person · resepsjonist", Introduction = "Ingrid vokste opp i Skardal og arbeidet i resepsjonen på Skardal Hotel. Hun forsvant etter kveldsvakten 18. desember 1999." },
            new() { Id = "erik", Name = "Erik Halvorsen", Age = 26, Role = "Kjæreste · mekaniker", Introduction = "Erik var Ingrids kjæreste. Forholdet hadde vært vanskelig over tid. Hans opplysninger må vurderes sammen med de øvrige kildene i saken." },
            new() { Id = "maria", Name = "Maria Nygård", Age = 23, Role = "Nær venninne", Introduction = "Maria var Ingrids nærmeste venninne. Hun kjente Ingrid fra livet i Skardal og er en sentral person i den opprinnelige etterforskningen." },
            new() { Id = "jonas", Name = "Jonas Mikkelsen", Age = 31, Role = "Nattansvarlig ved Skardal Hotel", Introduction = "Jonas arbeidet som nattansvarlig ved hotellet der Ingrid var resepsjonist. Hans forklaring inngår i saksarkivet fra 1999." }
        };
        foreach (var person in people)
        {
            if (await database.People.AnyAsync(x => x.CaseId == "1999-1218" && x.Id == person.Id)) continue;
            person.CaseId = "1999-1218";
            person.IsInitiallyVisible = true;
            database.People.Add(person);
        }
        await database.SaveChangesAsync();
        await OpeningEvidenceSeed.InitializeAsync(database);
        await OpeningTimelineSeed.InitializeAsync(database);
        await Case01MapSeed.InitializeAsync(database);
    }
}
