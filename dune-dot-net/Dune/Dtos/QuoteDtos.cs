using System.ComponentModel.DataAnnotations;

namespace Dune.Dtos;

/// <summary>A quote as returned by the API.</summary>
public record QuoteResponse(int Id, string By, string Content);

/// <summary>The body used to create or replace a quote.</summary>
public record QuoteRequest
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "'by' is required.")]
    [MaxLength(120)]
    public string By { get; init; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "'content' is required.")]
    [MaxLength(2000)]
    public string Content { get; init; } = string.Empty;
}
