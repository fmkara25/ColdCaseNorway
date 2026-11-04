namespace ColdCase.Domain.Cases;

public sealed class Evidence
{
    public string CaseId { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsInitiallyVisible { get; set; }
}
