using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class CaseDbContext(DbContextOptions<CaseDbContext> options) : DbContext(options)
{
    public DbSet<CaseFile> Cases => Set<CaseFile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<CaseFile>();
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Id).HasMaxLength(32);
        entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
        entity.Property(x => x.Location).HasMaxLength(200).IsRequired();
        entity.Property(x => x.MissingPerson).HasMaxLength(200).IsRequired();
    }
}
