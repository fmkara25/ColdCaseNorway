namespace ColdCase.Domain.Cases;

public sealed class CaseFile
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateOnly DisappearanceDate { get; set; }
    public string MissingPerson { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string InitialReport { get; set; } = string.Empty;
}
