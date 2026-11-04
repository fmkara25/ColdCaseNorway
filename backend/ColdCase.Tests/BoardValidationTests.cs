using ColdCase.Application.Investigations;

namespace ColdCase.Tests;

public sealed class BoardValidationTests
{
    private static readonly HashSet<string> Allowed = ["person:ingrid", "evidence:bus-ticket"];
    [Fact]
    public void ValidNotesAndAccessibleReferencesCanBeConnected()
    {
        var state = new BoardState(1, [new("n", "En hypotese, ikke et faktum.")],
            [new("note:n", 0, 50), new("evidence:bus-ticket", 250, 50)], [new("c", "note:n", "evidence:bus-ticket", "Undersøk")]);
        Assert.True(BoardValidation.IsValid(state, Allowed));
    }
    [Fact]
    public void RejectsHiddenReferencesNonFiniteCoordinatesAndOversizedNotes()
    {
        Assert.False(BoardValidation.IsValid(new(1, [], [new("person:hidden", 0, 0)], []), Allowed));
        Assert.False(BoardValidation.IsValid(new(1, [], [new("person:ingrid", double.NaN, 0)], []), Allowed));
        Assert.False(BoardValidation.IsValid(new(1, [new("n", new string('x', 3001))], [], []), Allowed));
        Assert.False(BoardValidation.IsValid(new(2, [], [], []), Allowed));
    }
    [Fact]
    public void RejectsDanglingSelfAndDuplicateConnections()
    {
        BoardPosition[] positions = [new("person:ingrid", 0, 0), new("evidence:bus-ticket", 200, 0)];
        Assert.False(BoardValidation.IsValid(new(1, [], positions, [new("c", "person:ingrid", "note:missing", "")]), Allowed));
        Assert.False(BoardValidation.IsValid(new(1, [], positions, [new("c", "person:ingrid", "person:ingrid", "")]), Allowed));
        Assert.False(BoardValidation.IsValid(new(1, [], positions,
            [new("c1", "person:ingrid", "evidence:bus-ticket", ""), new("c2", "evidence:bus-ticket", "person:ingrid", "")]), Allowed));
    }
}
