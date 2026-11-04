using System.Net;
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

    private sealed class ApiFactory(bool fail) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("ConnectionStrings:ColdCase", "Host=localhost;Database=unused;Username=unused");
            builder.ConfigureServices(services =>
            {
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
        public Task<CaseFile?> FindAsync(string id, CancellationToken cancellationToken) =>
            Task.FromResult(id == File.Id ? File : null);
    }
}
