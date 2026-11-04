namespace ColdCase.Domain.Maps;

public sealed class MapRoad
{
    public string CaseId { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string FromLocationId { get; set; } = string.Empty;
    public string ToLocationId { get; set; } = string.Empty;
    public int Meters { get; set; }
    public int WalkMinutesMin { get; set; }
    public int WalkMinutesMax { get; set; }
    public int DriveMinutesMin { get; set; }
    public int DriveMinutesMax { get; set; }
    public bool IsInitiallyVisible { get; set; }
}
