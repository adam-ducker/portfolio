namespace Dune.Models;

public class Quote
{
    public int Id { get; set; }

    /// <summary>Who said or wrote the line.</summary>
    public required string By { get; set; }

    /// <summary>The quote itself.</summary>
    public required string Content { get; set; }
}
