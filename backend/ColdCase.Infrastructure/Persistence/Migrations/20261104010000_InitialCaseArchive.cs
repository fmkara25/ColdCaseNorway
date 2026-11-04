using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ColdCase.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CaseDbContext))]
[Migration("20261104010000_InitialCaseArchive")]
public sealed class InitialCaseArchive : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(name: "Cases", columns: table => new
        {
            Id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
            Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
            Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
            DisappearanceDate = table.Column<DateOnly>(type: "date", nullable: false),
            MissingPerson = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
            Age = table.Column<int>(type: "integer", nullable: false),
            Summary = table.Column<string>(type: "text", nullable: false),
            InitialReport = table.Column<string>(type: "text", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_Cases", x => x.Id));
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("Cases");

    protected override void BuildTargetModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "10.0.0")
            .HasAnnotation("Relational:MaxIdentifierLength", 63)
            .HasAnnotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
        modelBuilder.Entity("ColdCase.Domain.Cases.CaseFile", entity =>
        {
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
    }
}
