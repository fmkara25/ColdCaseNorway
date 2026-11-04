using ColdCase.Application.Investigations;
using ColdCase.Infrastructure.Persistence;

namespace ColdCase.Tests;

public sealed class CaseRulesTests
{
    [Fact]
    public void OpeningStateHasNoAnswersOrLateTopics()
    {
        Assert.All(Case01GameplaySeed.CreateActions(), action => Assert.False(CaseRules.Available(action, new HashSet<string>(), BoardState.Empty)));
    }
    [Fact]
    public void CorrectlyReviewedFactsStillNeedTheActualSavedBoardLink()
    {
        var action = Case01GameplaySeed.CreateActions().Single(x => x.Id == "maria-plan");
        string[] flags = ["review:ingrid-note", "review:maria-statement"];
        Assert.False(CaseRules.Available(action, flags.ToHashSet(), BoardState.Empty));
        var board = new BoardState(1, [], [new("person:maria", 0, 0), new("evidence:ingrid-note", 200, 0)],
            [new("c", "evidence:ingrid-note", "person:maria", "Any player label")]);
        Assert.True(CaseRules.Available(action, flags.ToHashSet(), board));
        var next = CaseRules.Complete(action, flags, board, Case01MapSeed.CreateGraph(), null);
        Assert.NotNull(next); Assert.Contains("evidence:travel-bag", next);
        Assert.False(CaseRules.Available(action, next.ToHashSet(), board));
    }
    [Fact]
    public void RouteClaimRequiresTheChosenConnectedRouteNotAnArbitraryPath()
    {
        var action = Case01GameplaySeed.CreateActions().Single(x => x.Id == "erik-route");
        var flags = CaseRules.Rule(action).RequiredFlags;
        Assert.Null(CaseRules.Complete(action, flags, BoardState.Empty, Case01MapSeed.CreateGraph(), ["hotel", "market"]));
        Assert.NotNull(CaseRules.Complete(action, flags, BoardState.Empty, Case01MapSeed.CreateGraph(), ["market", "payphone"]));
    }
    [Fact]
    public void EveryRuleCanBeReachedAndEveryGrantReferencesExistingContent()
    {
        var actions = Case01GameplaySeed.CreateActions();
        var evidence = Case01GameplaySeed.CreateEvidence().Select(x => x.Id).Concat([
            "initial-report", "bus-ticket", "phone-log", "market-witness", "jonas-statement", "maria-statement", "hotel-log"]).ToHashSet();
        var flags = evidence.Where(id => !Case01GameplaySeed.CreateEvidence().Any(x => x.Id == id)).Select(id => "review:" + id).ToHashSet();
        var graph = Case01MapSeed.CreateGraph();
        var pending = actions.ToList();
        for (var pass = 0; pass < actions.Length && pending.Count > 0; pass++)
        {
            foreach (var action in pending.ToArray())
            {
                var rule = CaseRules.Rule(action);
                if (!rule.RequiredFlags.All(flags.Contains)) continue;
                foreach (var grant in rule.Grants)
                {
                    if (grant.StartsWith("evidence:")) Assert.Contains(grant[9..], evidence);
                    if (grant.StartsWith("location:")) Assert.Contains(graph.Locations, x => x.Id == grant[9..]);
                    if (grant.StartsWith("road:")) Assert.Contains(graph.Roads, x => x.Id == grant[5..]);
                    flags.Add(grant);
                    if (grant.StartsWith("evidence:")) flags.Add("review:" + grant[9..]);
                }
                foreach (var link in rule.Links)
                {
                    static bool Accessible(string id, HashSet<string> f) => f.Contains(id) || id is "person:maria" or "person:jonas" or "person:ingrid" or "person:erik" ||
                        id.StartsWith("evidence:") && f.Contains("review:" + id[9..]);
                    Assert.True(Accessible(link.FromId, flags)); Assert.True(Accessible(link.ToId, flags));
                }
                flags.Add("action:" + action.Id); pending.Remove(action);
            }
        }
        Assert.Empty(pending); Assert.Contains("stage:reconstruction", flags);
    }
}
