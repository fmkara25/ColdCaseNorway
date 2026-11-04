namespace ColdCase.Domain.Cases;

public sealed class TimelineEvent
{
    public string CaseId { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? SourceEvidenceId { get; set; }
    public int? MinuteOfDay { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsEstimate { get; set; }
    public bool IsPlanned { get; set; }
    public bool IsInitiallyVisible { get; set; }
}
