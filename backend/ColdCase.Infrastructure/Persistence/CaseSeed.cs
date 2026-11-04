using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public static class CaseSeed
{
    public static async Task InitializeDevelopmentAsync(CaseDbContext database)
    {
        // Development bootstrap only. Production must use reviewed EF migrations.
        await database.Database.EnsureCreatedAsync();
        if (await database.Cases.AnyAsync(x => x.Id == "1999-1218")) return;
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
}
