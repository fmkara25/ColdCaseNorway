namespace ColdCase.Application.Investigations;

public sealed record BoardNote(string Id, string Text);
public sealed record BoardPosition(string Id, double X, double Y);
public sealed record BoardConnection(string Id, string FromId, string ToId, string Label);
public sealed record BoardState(int SchemaVersion, BoardNote[] Notes, BoardPosition[] Positions, BoardConnection[] Connections)
{
    public static BoardState Empty => new(1, [], [], []);
}
public sealed record BoardSave(int Version, BoardState? Board);

public static class BoardValidation
{
    public static bool IsValid(BoardState? state, IReadOnlySet<string> accessibleReferences)
    {
        if (state is null || state.SchemaVersion != 1 || state.Notes is null || state.Positions is null || state.Connections is null ||
            state.Notes.Length > 20 || state.Positions.Length > 128 || state.Connections.Length > 128) return false;
        static bool Id(string? value) => value is { Length: > 0 and <= 64 } && value.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_');
        if (state.Notes.Any(x => x is null || !Id(x.Id) || x.Text is null || x.Text.Length > 3000)) return false;
        if (state.Notes.Select(x => x.Id).Distinct().Count() != state.Notes.Length) return false;
        var allowed = accessibleReferences.Concat(state.Notes.Select(x => "note:" + x.Id)).ToHashSet();
        if (state.Positions.Any(x => x is null || !allowed.Contains(x.Id) || !double.IsFinite(x.X) || !double.IsFinite(x.Y) ||
            x.X is < 0 or > 5000 || x.Y is < 0 or > 5000)) return false;
        var pinned = state.Positions.Select(x => x.Id).ToHashSet();
        if (pinned.Count != state.Positions.Length) return false;
        if (state.Connections.Any(x => x is null || !Id(x.Id) || !pinned.Contains(x.FromId) || !pinned.Contains(x.ToId) ||
            x.FromId == x.ToId || x.Label is null || x.Label.Length > 120)) return false;
        if (state.Connections.Select(x => x.Id).Distinct().Count() != state.Connections.Length) return false;
        var pairs = state.Connections.Select(x => string.CompareOrdinal(x.FromId, x.ToId) < 0 ? (x.FromId, x.ToId) : (x.ToId, x.FromId));
        return pairs.Distinct().Count() == state.Connections.Length;
    }
}
