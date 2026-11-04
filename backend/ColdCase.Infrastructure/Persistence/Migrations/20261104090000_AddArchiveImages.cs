using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ColdCase.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CaseDbContext))]
[Migration("20261104090000_AddArchiveImages")]
public sealed class AddArchiveImages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("CoverImagePath", "Cases", type: "character varying(512)", maxLength: 512, nullable: true);
        migrationBuilder.AddColumn<string>("MissingPersonPortraitPath", "Cases", type: "character varying(512)", maxLength: 512, nullable: true);
        migrationBuilder.AddColumn<string>("PortraitImagePath", "People", type: "character varying(512)", maxLength: 512, nullable: true);
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("PortraitImagePath", "People");
        migrationBuilder.DropColumn("MissingPersonPortraitPath", "Cases");
        migrationBuilder.DropColumn("CoverImagePath", "Cases");
    }
    protected override void BuildTargetModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "10.0.0")
            .HasAnnotation("Relational:MaxIdentifierLength", 63)
            .HasAnnotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
        modelBuilder.Entity("ColdCase.Domain.Cases.CaseFile", entity =>
        {
            entity.Property<string>("CoverImagePath").HasMaxLength(512).HasColumnType("character varying(512)");
            entity.Property<string>("MissingPersonPortraitPath").HasMaxLength(512).HasColumnType("character varying(512)");
            entity.Property<string>("Id").HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<int>("Age").HasColumnType("integer");
            entity.Property<DateOnly>("DisappearanceDate").HasColumnType("date");
            entity.Property<string>("InitialReport").IsRequired().HasColumnType("text");
            entity.Property<string>("Location").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("MissingPerson").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Summary").IsRequired().HasColumnType("text");
            entity.Property<string>("Title").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.HasKey("Id");
            entity.ToTable("Cases");
        });
        modelBuilder.Entity("ColdCase.Domain.Cases.Person", entity =>
        {
            entity.Property<string>("PortraitImagePath").HasMaxLength(512).HasColumnType("character varying(512)");
            entity.Property<string>("CaseId").HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("Id").HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<int>("Age").HasColumnType("integer");
            entity.Property<string>("Name").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Role").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Introduction").IsRequired().HasColumnType("text");
            entity.Property<bool>("IsInitiallyVisible").HasColumnType("boolean");
            entity.HasKey("CaseId", "Id");
            entity.ToTable("People");
            entity.HasOne("ColdCase.Domain.Cases.CaseFile", null).WithMany()
                .HasForeignKey("CaseId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
        modelBuilder.Entity("ColdCase.Domain.Cases.Evidence", entity =>
        {
            entity.Property<string>("CaseId").HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("Id").HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<string>("Title").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Kind").IsRequired().HasMaxLength(100).HasColumnType("character varying(100)");
            entity.Property<string>("Source").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Body").IsRequired().HasColumnType("text");
            entity.Property<int>("DisplayOrder").HasColumnType("integer");
            entity.Property<bool>("IsInitiallyVisible").HasColumnType("boolean");
            entity.HasKey("CaseId", "Id");
            entity.ToTable("Evidence");
            entity.HasOne("ColdCase.Domain.Cases.CaseFile", null).WithMany()
                .HasForeignKey("CaseId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
        modelBuilder.Entity("ColdCase.Domain.Cases.TimelineEvent", entity =>
        {
            entity.Property<string>("CaseId").HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("Id").HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<string>("Title").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Description").IsRequired().HasColumnType("text");
            entity.Property<string>("SourceEvidenceId").HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<int?>("MinuteOfDay").HasColumnType("integer");
            entity.Property<int>("DisplayOrder").HasColumnType("integer");
            entity.Property<bool>("IsEstimate").HasColumnType("boolean");
            entity.Property<bool>("IsPlanned").HasColumnType("boolean");
            entity.Property<bool>("IsInitiallyVisible").HasColumnType("boolean");
            entity.HasKey("CaseId", "Id");
            entity.ToTable("TimelineEvents");
            entity.HasOne("ColdCase.Domain.Cases.CaseFile", null).WithMany()
                .HasForeignKey("CaseId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
        modelBuilder.Entity("ColdCase.Domain.Maps.MapLocation", entity =>
        {
            entity.Property<string>("CaseId").IsRequired().HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("Id").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<string>("Name").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Description").IsRequired().HasColumnType("text");
            entity.Property<int>("X").HasColumnType("integer");
            entity.Property<int>("Y").HasColumnType("integer");
            entity.Property<bool>("IsInitiallyVisible").HasColumnType("boolean");
            entity.HasKey("CaseId", "Id");
            entity.ToTable("MapLocations");
            entity.HasOne("ColdCase.Domain.Cases.CaseFile", null).WithMany().HasForeignKey("CaseId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
        modelBuilder.Entity("ColdCase.Domain.Maps.MapRoad", entity =>
        {
            entity.Property<string>("CaseId").IsRequired().HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("Id").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<string>("FromLocationId").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<string>("ToLocationId").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<int>("Meters").HasColumnType("integer");
            entity.Property<int>("WalkMinutesMin").HasColumnType("integer");
            entity.Property<int>("WalkMinutesMax").HasColumnType("integer");
            entity.Property<int>("DriveMinutesMin").HasColumnType("integer");
            entity.Property<int>("DriveMinutesMax").HasColumnType("integer");
            entity.Property<bool>("IsInitiallyVisible").HasColumnType("boolean");
            entity.HasKey("CaseId", "Id");
            entity.HasIndex("CaseId", "FromLocationId");
            entity.HasIndex("CaseId", "ToLocationId");
            entity.ToTable("MapRoads");
            entity.HasOne("ColdCase.Domain.Maps.MapLocation", null).WithMany().HasForeignKey("CaseId", "FromLocationId").OnDelete(DeleteBehavior.Restrict).IsRequired();
            entity.HasOne("ColdCase.Domain.Maps.MapLocation", null).WithMany().HasForeignKey("CaseId", "ToLocationId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
        modelBuilder.Entity("ColdCase.Domain.Investigations.Investigation", entity =>
        {
            entity.Property<Guid>("Id").ValueGeneratedNever().HasColumnType("uuid");
            entity.Property<string>("CaseId").IsRequired().HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("AccessHash").IsRequired().HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<int>("Version").HasColumnType("integer");
            entity.Property<string>("ReconstructionJson").HasColumnType("jsonb");
            entity.Property<string>("ProgressJson").IsRequired().HasColumnType("jsonb").HasDefaultValue("[]");
            entity.Property<string>("BoardJson").IsRequired().HasColumnType("jsonb");
            entity.Property<DateTimeOffset>("CreatedAt").HasColumnType("timestamp with time zone");
            entity.HasKey("Id");
            entity.HasIndex("AccessHash").IsUnique();
            entity.HasIndex("CaseId");
            entity.ToTable("Investigations");
            entity.HasOne("ColdCase.Domain.Cases.CaseFile", null).WithMany().HasForeignKey("CaseId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
        modelBuilder.Entity("ColdCase.Domain.Investigations.CaseAction", entity =>
        {
            entity.Property<string>("CaseId").HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("Id").HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<string>("Kind").IsRequired().HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("PersonId").HasMaxLength(64).HasColumnType("character varying(64)");
            entity.Property<string>("Label").IsRequired().HasMaxLength(200).HasColumnType("character varying(200)");
            entity.Property<string>("Response").IsRequired().HasColumnType("text");
            entity.Property<string>("RuleJson").IsRequired().HasColumnType("jsonb");
            entity.Property<int>("DisplayOrder").HasColumnType("integer");
            entity.HasKey("CaseId", "Id");
            entity.ToTable("CaseActions");
            entity.HasOne("ColdCase.Domain.Cases.CaseFile", null).WithMany().HasForeignKey("CaseId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
        modelBuilder.Entity("ColdCase.Domain.Investigations.CaseSolution", entity =>
        {
            entity.Property<string>("CaseId").HasMaxLength(32).HasColumnType("character varying(32)");
            entity.Property<string>("DefinitionJson").IsRequired().HasColumnType("jsonb");
            entity.Property<string>("Epilogue").IsRequired().HasColumnType("text");
            entity.HasKey("CaseId");
            entity.ToTable("CaseSolutions");
            entity.HasOne("ColdCase.Domain.Cases.CaseFile", null).WithOne().HasForeignKey("ColdCase.Domain.Investigations.CaseSolution", "CaseId").OnDelete(DeleteBehavior.Restrict).IsRequired();
        });
    }
}
