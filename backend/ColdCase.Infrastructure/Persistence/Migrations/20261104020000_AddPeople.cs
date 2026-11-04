using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ColdCase.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CaseDbContext))]
[Migration("20261104020000_AddPeople")]
public sealed class AddPeople : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(name: "People", columns: table => new
        {
            CaseId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
            Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
            Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
            Age = table.Column<int>(type: "integer", nullable: false),
            Role = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
            Introduction = table.Column<string>(type: "text", nullable: false),
            IsInitiallyVisible = table.Column<bool>(type: "boolean", nullable: false)
        }, constraints: table =>
        {
            table.PrimaryKey("PK_People", x => new { x.CaseId, x.Id });
            table.ForeignKey("FK_People_Cases_CaseId", x => x.CaseId, "Cases", "Id", onDelete: ReferentialAction.Restrict);
        });
    }
    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("People");
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
        modelBuilder.Entity("ColdCase.Domain.Cases.Person", entity =>
        {
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
    }
}
