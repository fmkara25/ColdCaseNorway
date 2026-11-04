using ColdCase.Domain.Cases;
using ColdCase.Domain.Investigations;
using ColdCase.Domain.Maps;
using Microsoft.EntityFrameworkCore;

namespace ColdCase.Infrastructure.Persistence;

public sealed class CaseDbContext(DbContextOptions<CaseDbContext> options) : DbContext(options)
{
    public DbSet<CaseFile> Cases => Set<CaseFile>();

    public DbSet<Person> People => Set<Person>();

    public DbSet<Evidence> Evidence => Set<Evidence>();

    public DbSet<TimelineEvent> TimelineEvents => Set<TimelineEvent>();

    public DbSet<MapLocation> MapLocations => Set<MapLocation>();
    public DbSet<MapRoad> MapRoads => Set<MapRoad>();

    public DbSet<Investigation> Investigations => Set<Investigation>();

    public DbSet<CaseAction> CaseActions => Set<CaseAction>();

    public DbSet<CaseSolution> CaseSolutions => Set<CaseSolution>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var solution = modelBuilder.Entity<CaseSolution>();
        solution.HasKey(x => x.CaseId);
        solution.Property(x => x.CaseId).HasMaxLength(32);
        solution.Property(x => x.DefinitionJson).HasColumnType("jsonb").IsRequired();
        solution.HasOne<CaseFile>().WithOne().HasForeignKey<CaseSolution>(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
        var action = modelBuilder.Entity<CaseAction>();
        action.HasKey(x => new { x.CaseId, x.Id });
        action.Property(x => x.CaseId).HasMaxLength(32);
        action.Property(x => x.Id).HasMaxLength(64);
        action.Property(x => x.Kind).HasMaxLength(32).IsRequired();
        action.Property(x => x.PersonId).HasMaxLength(64);
        action.Property(x => x.Label).HasMaxLength(200).IsRequired();
        action.Property(x => x.RuleJson).HasColumnType("jsonb").IsRequired();
        action.HasOne<CaseFile>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
        var investigation = modelBuilder.Entity<Investigation>();
        investigation.HasKey(x => x.Id);
        investigation.Property(x => x.Id).ValueGeneratedNever();
        investigation.Property(x => x.CaseId).HasMaxLength(32).IsRequired();
        investigation.Property(x => x.AccessHash).HasMaxLength(64).IsRequired();
        investigation.Property(x => x.ReconstructionJson).HasColumnType("jsonb");
        investigation.Property(x => x.ProgressJson).HasColumnType("jsonb").HasDefaultValue("[]").IsRequired();
        investigation.Property(x => x.BoardJson).HasColumnType("jsonb").IsRequired();
        investigation.HasIndex(x => x.AccessHash).IsUnique();
        investigation.HasOne<CaseFile>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
        var location = modelBuilder.Entity<MapLocation>();
        location.HasKey(x => new { x.CaseId, x.Id });
        location.Property(x => x.CaseId).HasMaxLength(32);
        location.Property(x => x.Id).HasMaxLength(64);
        location.Property(x => x.Name).HasMaxLength(200).IsRequired();
        location.HasOne<CaseFile>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
        var road = modelBuilder.Entity<MapRoad>();
        road.HasKey(x => new { x.CaseId, x.Id });
        road.Property(x => x.CaseId).HasMaxLength(32);
        road.Property(x => x.Id).HasMaxLength(64);
        road.Property(x => x.FromLocationId).HasMaxLength(64).IsRequired();
        road.Property(x => x.ToLocationId).HasMaxLength(64).IsRequired();
        road.HasOne<MapLocation>().WithMany().HasForeignKey(x => new { x.CaseId, x.FromLocationId }).OnDelete(DeleteBehavior.Restrict);
        road.HasOne<MapLocation>().WithMany().HasForeignKey(x => new { x.CaseId, x.ToLocationId }).OnDelete(DeleteBehavior.Restrict);
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
