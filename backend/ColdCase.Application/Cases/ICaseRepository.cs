using ColdCase.Domain.Cases;

namespace ColdCase.Application.Cases;

public interface ICaseRepository
{
    Task<IReadOnlyList<CaseFile>> ListAsync(CancellationToken cancellationToken);
    Task<CaseFile?> FindAsync(string id, CancellationToken cancellationToken);
}
