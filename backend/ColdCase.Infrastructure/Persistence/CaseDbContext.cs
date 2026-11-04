using ColdCase.Domain.Cases;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class CaseDbContext(DbContextOptions<CaseDbContext> options) : DbContext(options)
{
    public DbSet<CaseFile> Cases => Set<CaseFile>();

    public DbSet<Person> People => Set<Person>();

    public DbSet<Evidence> Evidence => Set<Evidence>();

    public DbSet<TimelineEvent> TimelineEvents => Set<TimelineEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var timeline = modelBuilder.Entity<TimelineEvent>();
        timeline.HasKey(x => new { x.CaseId, x.Id });
        timeline.Property(x => x.CaseId).HasMaxLength(32);
        timeline.Property(x => x.Id).HasMaxLength(64);
        timeline.Property(x => x.Title).HasMaxLength(200).IsRequired();
        timeline.Property(x => x.SourceEvidenceId).HasMaxLength(64);
        timeline.HasOne<CaseFile>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
        var evidence = modelBuilder.Entity<Evidence>();
        evidence.HasKey(x => new { x.CaseId, x.Id });
        evidence.Property(x => x.CaseId).HasMaxLength(32);
        evidence.Property(x => x.Id).HasMaxLength(64);
        evidence.Property(x => x.Title).HasMaxLength(200).IsRequired();
        evidence.Property(x => x.Kind).HasMaxLength(100).IsRequired();
        evidence.Property(x => x.Source).HasMaxLength(200).IsRequired();
        evidence.HasOne<CaseFile>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
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
