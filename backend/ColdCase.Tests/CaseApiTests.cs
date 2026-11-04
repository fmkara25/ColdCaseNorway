using System.Net;
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
