using ColdCase.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Tests;

public sealed class CasePersistenceTests
{
    [Fact]
    public async Task SeedIsIdempotentAndRepositoryReadsPersistedCase()
    {
        var connection = Environment.GetEnvironmentVariable("TEST_DATABASE_CONNECTION");
        Assert.False(string.IsNullOrWhiteSpace(connection),
            "Set TEST_DATABASE_CONNECTION to a dedicated PostgreSQL test database. CI supplies this automatically.");
        var options = new DbContextOptionsBuilder<CaseDbContext>().UseNpgsql(connection).Options;
        await using var database = new CaseDbContext(options);
        await database.Database.MigrateAsync();
        await CaseSeed.InitializeDevelopmentAsync(database);
        await CaseSeed.InitializeDevelopmentAsync(database);
        await database.Database.MigrateAsync();
        Assert.Empty(await database.Database.GetPendingMigrationsAsync());
        Assert.Contains("20261104010000_InitialCaseArchive", await database.Database.GetAppliedMigrationsAsync());
        Assert.False(database.Database.HasPendingModelChanges());
        var repository = new CaseRepository(database);
        var cases = await repository.ListAsync(CancellationToken.None);
        Assert.Single(cases, x => x.Id == "1999-1218");
        var file = await repository.FindAsync("1999-1218", CancellationToken.None);
        Assert.NotNull(file);
        Assert.Equal("Ingrid Solberg", file.MissingPerson);
        Assert.Equal(new DateOnly(1999, 12, 18), file.DisappearanceDate);
        var people = await repository.ListPeopleAsync("1999-1218", CancellationToken.None);
        Assert.Equal(new[] { "erik", "ingrid", "jonas", "maria" }, people.Select(x => x.Id));
        Assert.Empty(await repository.ListPeopleAsync("other-case", CancellationToken.None));
        Assert.Null(await repository.FindAsync("missing-case", CancellationToken.None));
    }
}
