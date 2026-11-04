using ColdCase.Application.Maps;
using ColdCase.Domain.Investigations;

namespace ColdCase.Application.Investigations;

public sealed record TheoryOption(string Id, string Label);
public sealed record TheoryQuestion(string Id, string Label, TheoryOption[] Options);
public sealed record ReconstructionDefinition(TheoryQuestion[] Questions, Dictionary<string, string> ExpectedAnswers,
    string[] RequiredFlags, string[] RequiredEvidenceIds, int MaxEvidence, string[] RequiredWaypoints,
    int LoggedMeters, int ToleranceMeters, string CriticalStartId, string CriticalEndId, int CriticalWindowMinutes, int StopAllowanceMinutes);
public sealed record ReconstructionSubmission(Dictionary<string, string>? Answers, string[]? EvidenceIds, string[]? RouteIds);
public sealed record TheoryEvaluation(bool Accepted, string Message);
public interface IReconstructionRepository
{
    Task<CaseSolution?> FindAsync(string caseId, CancellationToken cancellationToken);
}
public static class Reconstruction
{
    public static TheoryEvaluation Evaluate(ReconstructionDefinition definition, IReadOnlySet<string> flags, GameMaterials materials, ReconstructionSubmission submission)
    {
        if (!definition.RequiredFlags.All(flags.Contains)) return new(false, "Noen sentrale forklaringer eller kilder er ikke ferdig vurdert. Fortsett etterforskningen.");
        if (submission.Answers is null || submission.Answers.Count != definition.ExpectedAnswers.Count ||
            !definition.ExpectedAnswers.All(pair => submission.Answers.TryGetValue(pair.Key, out var answer) && answer == pair.Value))
            return new(false, "Teorien forklarer ikke det samlede materialet godt nok. Gå gjennom hendelsesforløpet på nytt.");
        var evidence = submission.EvidenceIds;
        var available = materials.Evidence.Select(x => x.Id).ToHashSet();
        if (evidence is null || evidence.Length < definition.RequiredEvidenceIds.Length || evidence.Length > definition.MaxEvidence ||
            evidence.Distinct().Count() != evidence.Length || evidence.Any(id => !available.Contains(id) || !flags.Contains("review:" + id)) ||
            !definition.RequiredEvidenceIds.All(id => evidence.Contains(id)))
            return new(false, "Velg et bredere og mer presist kildegrunnlag. En enkelt forklaring eller et enkelt funn er ikke nok.");
        var path = submission.RouteIds;
        var route = RouteEstimator.Estimate(materials.Map, path);
        if (route is null || path is null || path[0] != definition.RequiredWaypoints[0] || path[^1] != definition.RequiredWaypoints[^1])
            return new(false, "Ruten må følge tilgjengelige veier og omfatte hele kjøreturen fra basen og tilbake.");
        var cursor = 0;
        foreach (var id in path) if (cursor < definition.RequiredWaypoints.Length && definition.RequiredWaypoints[cursor] == id) cursor++;
        if (cursor != definition.RequiredWaypoints.Length || Math.Abs(route.Meters - definition.LoggedMeters) > definition.ToleranceMeters)
            return new(false, "Ruten forklarer ikke stoppestedene og kilometerstanden godt nok. Sammenlign den med kartet og kildene.");
        var first = Array.IndexOf(path, definition.CriticalStartId);
        var last = Array.IndexOf(path, definition.CriticalEndId, Math.Max(0, first));
        if (first < 0 || last <= first) return new(false, "Kontroller rekkefølgen på stedene i ruten.");
        var critical = RouteEstimator.Estimate(materials.Map, path[first..(last + 1)]);
        if (critical is null || critical.DriveMinutesMax + definition.StopAllowanceMinutes > definition.CriticalWindowMinutes)
            return new(false, "Den valgte kjøringen og stoppene passer ikke innenfor tidsrommet. Vurder ruten på nytt.");
        return new(true, "Rekonstruksjonen støttes av de valgte kildene og passer med tids- og avstandsopplysningene.");
    }
}
