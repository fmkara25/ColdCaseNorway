using System.Text.Json;
using ColdCase.Application.Maps;
using ColdCase.Domain.Cases;
using ColdCase.Domain.Investigations;

namespace ColdCase.Application.Investigations;

public sealed record RequiredLink(string FromId, string ToId);
public sealed record ActionRule(string[] RequiredFlags, string[] Grants, RequiredLink[] Links,
    string[]? Route = null, int? RouteWindowMinutes = null);
public sealed record GameMaterials(IReadOnlyList<Person> People, IReadOnlyList<Evidence> Evidence,
    IReadOnlyList<TimelineEvent> Timeline, MapGraph Map);
public interface IGameplayRepository
{
    Task<IReadOnlyList<CaseAction>> ActionsAsync(string caseId, CancellationToken cancellationToken);
    Task<GameMaterials> MaterialsAsync(string caseId, IReadOnlySet<string> flags, CancellationToken cancellationToken);
}
public static class CaseRules
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static string[] ReadFlags(string value) => JsonSerializer.Deserialize<string[]>(value, Json) ?? [];
    public static ActionRule Rule(CaseAction action) => JsonSerializer.Deserialize<ActionRule>(action.RuleJson, Json)
        ?? throw new InvalidOperationException("Invalid case action rule.");
    public static bool Available(CaseAction action, IReadOnlySet<string> flags, BoardState board)
    {
        var rule = Rule(action);
        return !flags.Contains("action:" + action.Id) && rule.RequiredFlags.All(flags.Contains) && rule.Links.All(link =>
            board.Connections.Any(c => (c.FromId == link.FromId && c.ToId == link.ToId) || (c.FromId == link.ToId && c.ToId == link.FromId)));
    }
    public static string[]? Complete(CaseAction action, string[] currentFlags, BoardState board, MapGraph visibleMap, string[]? route)
    {
        if (!Available(action, currentFlags.ToHashSet(), board)) return null;
        var rule = Rule(action);
        if (rule.Route is not null)
        {
            if (route is null || !route.SequenceEqual(rule.Route)) return null;
            var estimate = RouteEstimator.Estimate(visibleMap, route);
            if (estimate is null || rule.RouteWindowMinutes is null || estimate.DriveMinutesMin <= rule.RouteWindowMinutes) return null;
        }
        return currentFlags.Concat(rule.Grants).Append("action:" + action.Id).Distinct().ToArray();
    }
}
