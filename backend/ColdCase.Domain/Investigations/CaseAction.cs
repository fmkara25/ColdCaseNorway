namespace ColdCase.Domain.Investigations;

public sealed class CaseAction
{
    public string CaseId { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string? PersonId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string RuleJson { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}
