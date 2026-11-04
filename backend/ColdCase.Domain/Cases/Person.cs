namespace ColdCase.Domain.Cases;

public sealed class Person
{
    public string CaseId { get; set; } = string.Empty;
    public string? PortraitImagePath { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Introduction { get; set; } = string.Empty;
    public bool IsInitiallyVisible { get; set; }
}
