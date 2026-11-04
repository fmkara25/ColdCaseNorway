using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class CaseDbContext(DbContextOptions<CaseDbContext> options) : DbContext(options)
{
    public DbSet<CaseFile> Cases => Set<CaseFile>();

    public DbSet<Person> People => Set<Person>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var person = modelBuilder.Entity<Person>();
        person.HasKey(x => new { x.CaseId, x.Id });
        person.Property(x => x.CaseId).HasMaxLength(32);
        person.Property(x => x.Id).HasMaxLength(64);
        person.Property(x => x.Name).HasMaxLength(200).IsRequired();
        person.Property(x => x.Role).HasMaxLength(200).IsRequired();
        person.HasOne<CaseFile>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
        var entity = modelBuilder.Entity<CaseFile>();
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Id).HasMaxLength(32);
        entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
        entity.Property(x => x.Location).HasMaxLength(200).IsRequired();
        entity.Property(x => x.MissingPerson).HasMaxLength(200).IsRequired();
    }
}
