using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ColdCase.Infrastructure.Persistence;

public sealed class CaseDbContextFactory : IDesignTimeDbContextFactory<CaseDbContext>
{
    public CaseDbContext CreateDbContext(string[] args)
    {
        // Script generation needs no live connection. Updates require the environment variable.
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__ColdCase")
            ?? "Host=localhost;Database=coldcase;Username=coldcase";
        return new CaseDbContext(new DbContextOptionsBuilder<CaseDbContext>().UseNpgsql(connection).Options);
    }
}
