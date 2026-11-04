using ColdCase.Domain.Cases;

namespace ColdCase.Api.Contracts;

// Explicit allowlist: future internal solution/unlock fields must never serialize here.
public sealed record CaseOverviewResponse(string Id, string Title, string Location,
    DateOnly DisappearanceDate, string MissingPerson, int Age, string Summary, string InitialReport, string? CoverImagePath, string? MissingPersonPortraitPath)
{
    public static CaseOverviewResponse From(CaseFile file) => new(file.Id, file.Title,
        file.Location, file.DisappearanceDate, file.MissingPerson, file.Age,
        file.Summary, file.InitialReport, file.CoverImagePath, file.MissingPersonPortraitPath);
}
