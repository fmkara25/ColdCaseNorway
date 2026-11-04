using ColdCase.Domain.Cases;

namespace ColdCase.Application.Cases;

public interface ICaseRepository
{
    Task<IReadOnlyList<CaseFile>> ListAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<Person>> ListPeopleAsync(string caseId, CancellationToken cancellationToken);
    Task<IReadOnlyList<Evidence>> ListEvidenceAsync(string caseId, CancellationToken cancellationToken);
    Task<CaseFile?> FindAsync(string id, CancellationToken cancellationToken);
}
