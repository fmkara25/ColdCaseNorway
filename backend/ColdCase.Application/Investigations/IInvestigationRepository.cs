using ColdCase.Domain.Investigations;

namespace ColdCase.Application.Investigations;

public interface IInvestigationRepository
{
    Task<Investigation?> ReadAsync(string caseId, string accessHash, CancellationToken cancellationToken);
    Task CreateAsync(Investigation investigation, CancellationToken cancellationToken);
    Task<bool> SaveBoardAsync(Guid id, string caseId, string accessHash, int expectedVersion, string boardJson, CancellationToken cancellationToken);
}
