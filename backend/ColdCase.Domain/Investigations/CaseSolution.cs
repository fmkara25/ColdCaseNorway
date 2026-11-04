namespace ColdCase.Domain.Investigations;

public sealed class CaseSolution
{
    public string CaseId { get; set; } = string.Empty;
    public string DefinitionJson { get; set; } = string.Empty;
    public string Epilogue { get; set; } = string.Empty;
}
