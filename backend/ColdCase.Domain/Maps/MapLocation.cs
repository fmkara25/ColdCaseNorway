namespace ColdCase.Domain.Maps;

public sealed class MapLocation
{
    public string CaseId { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int X { get; set; }
    public int Y { get; set; }
    public bool IsInitiallyVisible { get; set; }
}
