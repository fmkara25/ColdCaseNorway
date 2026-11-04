namespace ColdCase.Domain.Investigations;

public sealed class Investigation
{
    public Guid Id { get; set; }
    public string CaseId { get; set; } = string.Empty;
    public string AccessHash { get; set; } = string.Empty;
    public int Version { get; set; }
    public string? ReconstructionJson { get; set; }
    public string ProgressJson { get; set; } = "[]";
    public string BoardJson { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
