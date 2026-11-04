using System.Net;
using ColdCase.Application.Investigations;
using ColdCase.Domain.Investigations;
using System.Net.Http.Json;
using ColdCase.Application.Maps;
using ColdCase.Infrastructure.Persistence;
using System.Text.Json;
using ColdCase.Application.Cases;
using ColdCase.Domain.Cases;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ColdCase.Tests;

public sealed class CaseApiTests
{
    [Fact]
    public async Task OverviewAndArchiveExposeOnlyApprovedFields()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/cases/1999-1218");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var expected = new[] { "id", "title", "location", "disappearanceDate", "missingPerson", "age", "summary", "initialReport" };
        Assert.Equal(expected.Order(), json.RootElement.EnumerateObject().Select(x => x.Name).Order());
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        using var listResponse = await client.GetAsync("/api/cases");
        listResponse.EnsureSuccessStatusCode();
        using var list = JsonDocument.Parse(await listResponse.Content.ReadAsStringAsync());
        Assert.Equal(expected.Where(x => x != "initialReport").Order(),
            list.RootElement[0].EnumerateObject().Select(x => x.Name).Order());
    }

    [Fact]
    public async Task MissingCaseReturnsBokmalProblem()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/cases/missing");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Saken finnes ikke.", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ServerFailureDoesNotExposeInternalException()
    {
        using var factory = new ApiFactory(true);
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/cases");
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("INTERNAL_SECRET", body);
        Assert.DoesNotContain("stackTrace", body);
        using var json = JsonDocument.Parse(body);
        Assert.Equal("Kunne ikke hente saksopplysningene.", json.RootElement.GetProperty("title").GetString());
    }

    [Fact]
    public async Task PeopleAreScopedAndDoNotExposeHiddenRecordsOrVisibilityRules()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/cases/1999-1218/people");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("INTERNAL_SECRET", body);
        using var json = JsonDocument.Parse(body);
        Assert.Equal(1, json.RootElement.GetArrayLength());
        Assert.Equal(new[] { "id", "name", "age", "role", "introduction" }.Order(),
            json.RootElement[0].EnumerateObject().Select(x => x.Name).Order());
        using var missing = await client.GetAsync("/api/cases/unknown/people");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task OpeningEvidenceExcludesHiddenBodiesAndVisibilityRules()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/cases/1999-1218/evidence");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("INTERNAL_SECRET", body);
        using var json = JsonDocument.Parse(body);
        Assert.Equal(1, json.RootElement.GetArrayLength());
        Assert.Equal(new[] { "id", "title", "kind", "source", "body" }.Order(),
            json.RootElement[0].EnumerateObject().Select(x => x.Name).Order());
        using var missing = await client.GetAsync("/api/cases/unknown/evidence");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task TimelineDistinguishesPlansAndExcludesHiddenEvents()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/cases/1999-1218/timeline");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("INTERNAL_SECRET", body);
        using var json = JsonDocument.Parse(body);
        Assert.Equal(1, json.RootElement.GetArrayLength());
        Assert.True(json.RootElement[0].GetProperty("isPlanned").GetBoolean());
        Assert.DoesNotContain("isInitiallyVisible", body);
        using var missing = await client.GetAsync("/api/cases/unknown/timeline");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task MapResponseAndRouteEstimatesCannotRevealHiddenLocations()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/cases/1999-1218/map");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("mill-road", body);
        Assert.DoesNotContain("station", body);
        Assert.DoesNotContain("IsInitiallyVisible", body, StringComparison.OrdinalIgnoreCase);
        using var json = JsonDocument.Parse(body);
        Assert.Equal(3, json.RootElement.GetProperty("locations").GetArrayLength());
        using var route = await client.PostAsJsonAsync("/api/cases/1999-1218/map/estimate", new { locationIds = new[] { "hotel", "market", "bus-stop" } });
        route.EnsureSuccessStatusCode();
        using var estimate = JsonDocument.Parse(await route.Content.ReadAsStringAsync());
        Assert.Equal(1500, estimate.RootElement.GetProperty("meters").GetInt32());
        using var hidden = await client.PostAsJsonAsync("/api/cases/1999-1218/map/estimate", new { locationIds = new[] { "market", "mill-road" } });
        Assert.Equal(HttpStatusCode.BadRequest, hidden.StatusCode);
        Assert.DoesNotContain("mill-road", await hidden.Content.ReadAsStringAsync());
        using var unknown = await client.GetAsync("/api/cases/unknown/map");
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
    }

    [Fact]
    public async Task InvestigationRequiresWriteHeaderOwnCookieAndCurrentVersion()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        const string endpoint = "/api/cases/1999-1218/investigation";
        using var blocked = await client.PostAsync(endpoint, null);
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);
        client.DefaultRequestHeaders.Add("X-ColdCase-Request", "1");
        using var opened = await client.PostAsync(endpoint, null);
        opened.EnsureSuccessStatusCode();
        Assert.Contains(opened.Headers.GetValues("Set-Cookie"), value => value.Contains("httponly", StringComparison.OrdinalIgnoreCase) && value.Contains("secure", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain("accessHash", await opened.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        var board = new BoardState(1, [new("n", "Min hypotese")], [new("note:n", 40, 50)], []);
        using var saved = await client.PutAsJsonAsync(endpoint + "/board", new BoardSave(0, board));
        saved.EnsureSuccessStatusCode();
        using var stale = await client.PutAsJsonAsync(endpoint + "/board", new BoardSave(0, board));
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        using var read = await client.GetAsync(endpoint);
        Assert.Contains("Min hypotese", await read.Content.ReadAsStringAsync());
        using var other = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var inaccessible = await other.GetAsync(endpoint);
        Assert.Equal(HttpStatusCode.Unauthorized, inaccessible.StatusCode);
        using var hidden = await client.PutAsJsonAsync(endpoint + "/board", new BoardSave(1, new(1, [], [new("person:hidden", 0, 0)], [])));
        Assert.Equal(HttpStatusCode.BadRequest, hidden.StatusCode);
    }

    [Fact]
    public async Task LockedActionsAndEvidenceCannotBeGuessedAndProgressDoesNotLeakRules()
    {
        using var factory = new ApiFactory(false);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Add("X-ColdCase-Request", "1");
        const string endpoint = "/api/cases/1999-1218/investigation";
        using var opened = await client.PostAsync(endpoint, null);
        opened.EnsureSuccessStatusCode();
        using var progress = await client.GetAsync(endpoint + "/progress");
        var body = await progress.Content.ReadAsStringAsync();
        Assert.DoesNotContain("lars", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("requiredFlags", body); Assert.DoesNotContain("grants", body);
        using var final = await client.GetAsync(endpoint + "/reconstruction");
        Assert.Equal(HttpStatusCode.NotFound, final.StatusCode);
        Assert.DoesNotContain("epilogue", await final.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        using var locked = await client.PostAsJsonAsync(endpoint + "/actions/lars-events", new { locationIds = (string[]?)null });
        Assert.Equal(HttpStatusCode.NotFound, locked.StatusCode);
        using var hidden = await client.PostAsync(endpoint + "/evidence/lars-account/review", null);
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        using var reviewed = await client.PostAsync(endpoint + "/evidence/bus-ticket/review", null);
        reviewed.EnsureSuccessStatusCode();
        Assert.Contains("bus-ticket", await reviewed.Content.ReadAsStringAsync());
        using var repeated = await client.PostAsync(endpoint + "/evidence/bus-ticket/review", null);
        using var firstJson = JsonDocument.Parse(await reviewed.Content.ReadAsStringAsync());
        using var secondJson = JsonDocument.Parse(await repeated.Content.ReadAsStringAsync());
        Assert.Equal(firstJson.RootElement.GetProperty("version").GetInt32(), secondJson.RootElement.GetProperty("version").GetInt32());
        using var other = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var privateProgress = await other.GetAsync(endpoint + "/progress");
        Assert.Equal(HttpStatusCode.Unauthorized, privateProgress.StatusCode);
    }

    private sealed class StubInvestigationRepository : IInvestigationRepository
    {
        private readonly Dictionary<Guid, Investigation> rows = [];
        public Task<Investigation?> ReadAsync(string caseId, string accessHash, CancellationToken cancellationToken) =>
            Task.FromResult(rows.Values.SingleOrDefault(x => x.CaseId == caseId && x.AccessHash == accessHash));
        public Task CreateAsync(Investigation investigation, CancellationToken cancellationToken)
        { rows.Add(investigation.Id, investigation); return Task.CompletedTask; }
        public Task<bool> SaveReconstructionAsync(Guid id, string caseId, string accessHash, int expectedVersion, string progressJson, string reconstructionJson, CancellationToken cancellationToken)
        {
            if (!rows.TryGetValue(id, out var row) || row.CaseId != caseId || row.AccessHash != accessHash || row.Version != expectedVersion) return Task.FromResult(false);
            row.ProgressJson = progressJson; row.ReconstructionJson = reconstructionJson; row.Version++;
            return Task.FromResult(true);
        }
        public Task<bool> SaveProgressAsync(Guid id, string caseId, string accessHash, int expectedVersion, string progressJson, CancellationToken cancellationToken)
        {
            if (!rows.TryGetValue(id, out var row) || row.CaseId != caseId || row.AccessHash != accessHash || row.Version != expectedVersion) return Task.FromResult(false);
            row.ProgressJson = progressJson; row.Version++;
            return Task.FromResult(true);
        }
        public Task<bool> SaveBoardAsync(Guid id, string caseId, string accessHash, int expectedVersion, string boardJson, CancellationToken cancellationToken)
        {
            if (!rows.TryGetValue(id, out var row) || row.CaseId != caseId || row.AccessHash != accessHash || row.Version != expectedVersion) return Task.FromResult(false);
            row.BoardJson = boardJson; row.Version++;
            return Task.FromResult(true);
        }
    }

    private sealed class StubGameplayRepository : IGameplayRepository
    {
        public Task<IReadOnlyList<CaseAction>> ActionsAsync(string caseId, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<CaseAction>>(Case01GameplaySeed.CreateActions());
        public async Task<GameMaterials> MaterialsAsync(string caseId, IReadOnlySet<string> flags, CancellationToken cancellationToken)
        {
            var repository = new StubRepository(false);
            var people = await repository.ListPeopleAsync(caseId, cancellationToken);
            var evidence = await repository.ListEvidenceAsync(caseId, cancellationToken);
            var timeline = await repository.ListTimelineAsync(caseId, cancellationToken);
            return new(people.Where(x => x.IsInitiallyVisible || flags.Contains("person:" + x.Id)).ToArray(),
                evidence.Concat(Case01GameplaySeed.CreateEvidence()).Where(x => x.IsInitiallyVisible || flags.Contains("evidence:" + x.Id)).ToArray(),
                timeline.Where(x => x.IsInitiallyVisible || flags.Contains("timeline:" + x.Id)).ToArray(),
                Case01MapSeed.CreateGraph().OpeningOnly(caseId));
        }
    }

    private sealed class StubMapRepository : IMapRepository
    {
        public Task<MapGraph> ReadAsync(string caseId, CancellationToken cancellationToken) =>
            Task.FromResult(Case01MapSeed.CreateGraph());
    }

    private sealed class ApiFactory(bool fail) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("ConnectionStrings:ColdCase", "Host=localhost;Database=unused;Username=unused");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IGameplayRepository>();
                services.AddSingleton<IGameplayRepository>(new StubGameplayRepository());
                services.RemoveAll<IInvestigationRepository>();
                services.AddSingleton<IInvestigationRepository>(new StubInvestigationRepository());
                services.RemoveAll<IMapRepository>();
                services.AddSingleton<IMapRepository>(new StubMapRepository());
                services.RemoveAll<ICaseRepository>();
                services.AddSingleton<ICaseRepository>(new StubRepository(fail));
            });
        }
    }

    private sealed class StubRepository(bool fail) : ICaseRepository
    {
        private static readonly CaseFile File = new()
        {
            Id = "1999-1218", Title = "Forsvinningen i Skardal", Location = "Skardal, Trøndelag",
            DisappearanceDate = new DateOnly(1999, 12, 18), MissingPerson = "Ingrid Solberg", Age = 23,
            Summary = "Saken er uoppklart.", InitialReport = "Ingrid er meldt savnet."
        };
        public Task<IReadOnlyList<CaseFile>> ListAsync(CancellationToken cancellationToken)
        {
            if (fail) throw new InvalidOperationException("INTERNAL_SECRET database password and solution");
            return Task.FromResult<IReadOnlyList<CaseFile>>([File]);
        }
        public Task<IReadOnlyList<Person>> ListPeopleAsync(string caseId, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Person>>([
                new() { CaseId = File.Id, Id = "ingrid", Name = "Ingrid Solberg", Age = 23, Role = "Savnet", Introduction = "Savnet etter kveldsvakten.", IsInitiallyVisible = true },
                new() { CaseId = File.Id, Id = "hidden", Name = "INTERNAL_SECRET", IsInitiallyVisible = false }
            ]);
        public Task<IReadOnlyList<Evidence>> ListEvidenceAsync(string caseId, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Evidence>>([
                new() { Id = "bus-ticket", Title = "Bussbillett", Kind = "Billett", Source = "Arkiv", Body = "Billetten ble ikke brukt.", IsInitiallyVisible = true },
                new() { Id = "hidden", Body = "INTERNAL_SECRET", IsInitiallyVisible = false }
            ]);
        public Task<IReadOnlyList<TimelineEvent>> ListTimelineAsync(string caseId, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<TimelineEvent>>([
                new() { Id = "bus", Title = "Planlagt bussavgang", Description = "Ikke en bekreftet reise.", MinuteOfDay = 1365, IsPlanned = true, IsInitiallyVisible = true },
                new() { Id = "hidden", Description = "INTERNAL_SECRET", IsInitiallyVisible = false }
            ]);
        public Task<CaseFile?> FindAsync(string id, CancellationToken cancellationToken) =>
            Task.FromResult(id == File.Id ? File : null);
    }
}
