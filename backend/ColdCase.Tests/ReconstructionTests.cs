using ColdCase.Application.Investigations;
using ColdCase.Domain.Cases;
using ColdCase.Infrastructure.Persistence;

namespace ColdCase.Tests;

public sealed class ReconstructionTests
{
    private static ReconstructionDefinition Definition => Case01ReconstructionSeed.Definition();
    private static GameMaterials Materials => new([], Case01GameplaySeed.CreateEvidence().Append(new Evidence { Id = "bus-ticket" }).ToArray(), [], Case01MapSeed.CreateGraph());
    private static HashSet<string> Flags => Definition.RequiredFlags.Concat(Definition.EvidenceGroups.SelectMany(x => x).Select(x => "review:" + x)).ToHashSet();
    private static ReconstructionSubmission Correct => new(Definition.ExpectedAnswers.ToDictionary(x => x.Key, x => x.Value), Definition.EvidenceGroups.Select(x => x[0]).ToArray(), Definition.RequiredWaypoints);

    [Fact]
    public void CoherentTheoryUsesIndependentEvidenceAndAFeasibleCompleteRoute()
    {
        Assert.True(Reconstruction.Evaluate(Definition, Flags, Materials, Correct).Accepted);
    }
    [Fact]
    public void ConfessionAloneAndUnreviewedSourcesAreNotEnough()
    {
        Assert.False(Reconstruction.Evaluate(Definition, Flags, Materials, Correct with { EvidenceIds = ["lars-account"] }).Accepted);
        var flags = Flags; flags.Remove("review:bumper-report");
        Assert.False(Reconstruction.Evaluate(Definition, flags, Materials, Correct).Accepted);
    }
    [Fact]
    public void WrongTheoryDoesNotMutateProgressAndCanBeRetried()
    {
        var flags = Flags;
        var wrongAnswers = Correct.Answers!.ToDictionary(x => x.Key, x => x.Value);
        wrongAnswers["driver"] = "erik";
        var before = flags.ToArray();
        Assert.False(Reconstruction.Evaluate(Definition, flags, Materials, Correct with { Answers = wrongAnswers }).Accepted);
        Assert.Equal(before, flags.ToArray());
        Assert.True(Reconstruction.Evaluate(Definition, flags, Materials, Correct).Accepted);
    }
    [Fact]
    public void MissingBranchesAndDisconnectedOrInvertedRoutesAreRejected()
    {
        var flags = Flags; flags.Remove("action:jonas-call");
        Assert.False(Reconstruction.Evaluate(Definition, flags, Materials, Correct).Accepted);
        Assert.False(Reconstruction.Evaluate(Definition, Flags, Materials, Correct with { RouteIds = ["market", "station"] }).Accepted);
        Assert.False(Reconstruction.Evaluate(Definition, Flags, Materials, Correct with { RouteIds = Definition.RequiredWaypoints.Reverse().ToArray() }).Accepted);
        Assert.False(Reconstruction.Evaluate(Definition, Flags, Materials, new(null, null, null)).Accepted);
    }
    [Fact]
    public void AlternativeIndependentSourcesAreAcceptedWithoutGuessingOneExactCombination()
    {
        foreach (var group in Definition.EvidenceGroups)
            foreach (var alternative in group)
            {
                var selected = Correct.EvidenceIds!.Select(id => id == group[0] ? alternative : id).ToArray();
                Assert.True(Reconstruction.Evaluate(Definition, Flags, Materials, Correct with { EvidenceIds = selected }).Accepted);
            }
    }
    [Fact]
    public void EveryExpectedAnswerIsAnAvailableChoiceAndEvidenceSelectionIsBounded()
    {
        Assert.All(Definition.Questions, question => Assert.Contains(question.Options, option => option.Id == Definition.ExpectedAnswers[question.Id]));
        Assert.InRange(Definition.EvidenceGroups.Length, 2, Definition.MaxEvidence);
        var tooMany = Enumerable.Repeat("vehicle-log", Definition.MaxEvidence + 1).ToArray();
        Assert.False(Reconstruction.Evaluate(Definition, Flags, Materials, Correct with { EvidenceIds = tooMany }).Accepted);
    }
}
