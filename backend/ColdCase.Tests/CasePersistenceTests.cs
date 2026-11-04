using ColdCase.Infrastructure.Persistence;
using ColdCase.Domain.Investigations;
using ColdCase.Application.Investigations;
using System.Text.Json;
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
        Assert.Contains("20261104090000_AddArchiveImages", await database.Database.GetAppliedMigrationsAsync());
        Assert.False(database.Database.HasPendingModelChanges());
        var repository = new CaseRepository(database);
        var cases = await repository.ListAsync(CancellationToken.None);
        Assert.Single(cases, x => x.Id == "1999-1218");
        var file = await repository.FindAsync("1999-1218", CancellationToken.None);
        Assert.NotNull(file);
        Assert.Equal("Ingrid Solberg", file.MissingPerson);
        Assert.Equal("/images/skardal-winter.webp", file.CoverImagePath);
        Assert.Equal("/images/ingrid-1999.webp", file.MissingPersonPortraitPath);
        Assert.Equal(new DateOnly(1999, 12, 18), file.DisappearanceDate);
        var people = await repository.ListPeopleAsync("1999-1218", CancellationToken.None);
        Assert.Equal(new[] { "erik", "ingrid", "jonas", "maria" }, people.Select(x => x.Id));
        Assert.Equal(file.MissingPersonPortraitPath, people.Single(x => x.Id == "ingrid").PortraitImagePath);
        Assert.Empty(await repository.ListPeopleAsync("other-case", CancellationToken.None));
        var evidence = await repository.ListEvidenceAsync("1999-1218", CancellationToken.None);
        Assert.Equal(7, evidence.Count);
        Assert.Contains("ikke brukt", evidence.Single(x => x.Id == "bus-ticket").Body);
        Assert.Empty(await repository.ListEvidenceAsync("other-case", CancellationToken.None));
        var events = await repository.ListTimelineAsync("1999-1218", CancellationToken.None);
        Assert.Equal(6, events.Count);
        Assert.True(events.Single(x => x.Id == "scheduled-bus").IsPlanned);
        Assert.Null(events.Single(x => x.Id == "unexplained-gap").MinuteOfDay);
        Assert.All(events.Where(x => x.SourceEvidenceId is not null), item =>
            Assert.Contains(evidence, source => source.Id == item.SourceEvidenceId));
        Assert.Empty(await repository.ListTimelineAsync("other-case", CancellationToken.None));
        var map = (await new MapRepository(database).ReadAsync("1999-1218", CancellationToken.None)).OpeningOnly("1999-1218");
        Assert.Equal(3, map.Locations.Count); Assert.Equal(2, map.Roads.Count);
        var emptyMap = await new MapRepository(database).ReadAsync("another-case", CancellationToken.None);
        Assert.Empty(emptyMap.Locations); Assert.Empty(emptyMap.Roads);
        var investigations = new InvestigationRepository(database);
        var access = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        var saved = new Investigation { Id = Guid.NewGuid(), CaseId = "1999-1218", AccessHash = access,
            CreatedAt = DateTimeOffset.UtcNow, BoardJson = JsonSerializer.Serialize(BoardState.Empty) };
        await investigations.CreateAsync(saved, CancellationToken.None);
        Assert.Null(await investigations.ReadAsync("other-case", access, CancellationToken.None));
        Assert.Null(await investigations.ReadAsync("1999-1218", "wrong-token", CancellationToken.None));
        var boardJson = JsonSerializer.Serialize(new BoardState(1, [new("n", "Persisted note")], [new("note:n", 20, 30)], []));
        Assert.True(await investigations.SaveBoardAsync(saved.Id, saved.CaseId, access, 0, boardJson, CancellationToken.None));
        Assert.False(await investigations.SaveBoardAsync(saved.Id, saved.CaseId, access, 0, boardJson, CancellationToken.None));
        var restored = await investigations.ReadAsync(saved.CaseId, access, CancellationToken.None);
        Assert.NotNull(restored); Assert.Equal(1, restored.Version); Assert.Contains("Persisted note", restored.BoardJson);
        var game = new GameplayRepository(database);
        var opening = await game.MaterialsAsync("1999-1218", new HashSet<string>(), CancellationToken.None);
        Assert.DoesNotContain(opening.People, x => x.Id == "lars");
        Assert.DoesNotContain(opening.Evidence, x => x.Id == "lars-account");
        var granted = await game.MaterialsAsync("1999-1218", new HashSet<string> { "person:lars", "evidence:lars-account", "location:mill-road", "road:market-mill" }, CancellationToken.None);
        Assert.Contains(granted.People, x => x.Id == "lars");
        Assert.Contains(granted.Evidence, x => x.Id == "lars-account");
        Assert.Contains(granted.Map.Roads, x => x.Id == "market-mill");
        var empty = await game.MaterialsAsync("other-case", new HashSet<string> { "person:lars", "evidence:lars-account" }, CancellationToken.None);
        Assert.Empty(empty.People); Assert.Empty(empty.Evidence);
        Assert.True(await investigations.SaveProgressAsync(saved.Id, saved.CaseId, access, 1, "[\"review:bus-ticket\"]", CancellationToken.None));
        Assert.False(await investigations.SaveProgressAsync(saved.Id, saved.CaseId, access, 1, "[]", CancellationToken.None));
        var afterProgress = await investigations.ReadAsync(saved.CaseId, access, CancellationToken.None);
        Assert.NotNull(afterProgress); Assert.Equal(2, afterProgress.Version);
        Assert.Contains("Persisted note", afterProgress.BoardJson);
        Assert.Contains("review:bus-ticket", afterProgress.ProgressJson);
        var solutions = new ReconstructionRepository(database);
        Assert.NotNull(await solutions.FindAsync("1999-1218", CancellationToken.None));
        Assert.Null(await solutions.FindAsync("other-case", CancellationToken.None));
        var theoryJson = JsonSerializer.Serialize(new ReconstructionSubmission(new() { ["driver"] = "lars" }, ["vehicle-log"], ["market"]));
        Assert.True(await investigations.SaveReconstructionAsync(saved.Id, saved.CaseId, access, 2, "[\"stage:closed\"]", theoryJson, CancellationToken.None));
        Assert.False(await investigations.SaveReconstructionAsync(saved.Id, saved.CaseId, access, 2, "[]", theoryJson, CancellationToken.None));
        var closed = await investigations.ReadAsync(saved.CaseId, access, CancellationToken.None);
        Assert.NotNull(closed); Assert.Equal(3, closed.Version); Assert.NotNull(closed.ReconstructionJson);
        Assert.Contains("Persisted note", closed.BoardJson);
        Assert.Null(await repository.FindAsync("missing-case", CancellationToken.None));
    }
}
