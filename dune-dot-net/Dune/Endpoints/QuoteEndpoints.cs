using System.ComponentModel.DataAnnotations;
using Dune.Data;
using Dune.Dtos;
using Dune.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace Dune.Endpoints;

public static class QuoteEndpoints
{
    public static RouteGroupBuilder MapQuoteEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/quotes").WithTags("Quotes");

        group.MapGet("/", GetAll)
            .WithName("GetQuotes")
            .WithSummary("List every quote, optionally filtered by author.");

        group.MapGet("/{id:int}", GetById)
            .WithName("GetQuoteById")
            .WithSummary("Fetch a single quote.");

        group.MapGet("/random", GetRandom)
            .WithName("GetRandomQuote")
            .WithSummary("Fetch one quote at random.");

        group.MapPost("/", Create)
            .WithName("CreateQuote")
            .WithSummary("Add a new quote.");

        group.MapPut("/{id:int}", Update)
            .WithName("UpdateQuote")
            .WithSummary("Replace an existing quote.");

        group.MapDelete("/{id:int}", Delete)
            .WithName("DeleteQuote")
            .WithSummary("Remove a quote.");

        return group;
    }

    private static async Task<Ok<List<QuoteResponse>>> GetAll(
        QuoteDbContext db,
        string? by,
        CancellationToken cancellationToken)
    {
        var query = db.Quotes.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(by))
        {
            var term = by.Trim();
            query = query.Where(q => EF.Functions.Like(q.By, $"%{term}%"));
        }

        var quotes = await query
            .OrderBy(q => q.Id)
            .Select(q => new QuoteResponse(q.Id, q.By, q.Content))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(quotes);
    }

    private static async Task<Results<Ok<QuoteResponse>, NotFound>> GetById(
        QuoteDbContext db,
        int id,
        CancellationToken cancellationToken)
    {
        var quote = await db.Quotes.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        return quote is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(ToResponse(quote));
    }

    private static async Task<Results<Ok<QuoteResponse>, NotFound>> GetRandom(
        QuoteDbContext db,
        CancellationToken cancellationToken)
    {
        var count = await db.Quotes.CountAsync(cancellationToken);
        if (count == 0)
        {
            return TypedResults.NotFound();
        }

        var quote = await db.Quotes.AsNoTracking()
            .OrderBy(q => q.Id)
            .Skip(Random.Shared.Next(count))
            .FirstAsync(cancellationToken);

        return TypedResults.Ok(ToResponse(quote));
    }

    private static async Task<Results<Created<QuoteResponse>, ValidationProblem>> Create(
        QuoteDbContext db,
        QuoteRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryValidate(request, out var errors))
        {
            return TypedResults.ValidationProblem(errors);
        }

        var quote = new Quote
        {
            By = request.By.Trim(),
            Content = request.Content.Trim()
        };

        db.Quotes.Add(quote);
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.Created($"/api/quotes/{quote.Id}", ToResponse(quote));
    }

    private static async Task<Results<Ok<QuoteResponse>, NotFound, ValidationProblem>> Update(
        QuoteDbContext db,
        int id,
        QuoteRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryValidate(request, out var errors))
        {
            return TypedResults.ValidationProblem(errors);
        }

        var quote = await db.Quotes.FirstOrDefaultAsync(q => q.Id == id, cancellationToken);
        if (quote is null)
        {
            return TypedResults.NotFound();
        }

        quote.By = request.By.Trim();
        quote.Content = request.Content.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToResponse(quote));
    }

    private static async Task<Results<NoContent, NotFound>> Delete(
        QuoteDbContext db,
        int id,
        CancellationToken cancellationToken)
    {
        var quote = await db.Quotes.FirstOrDefaultAsync(q => q.Id == id, cancellationToken);
        if (quote is null)
        {
            return TypedResults.NotFound();
        }

        db.Quotes.Remove(quote);
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.NoContent();
    }

    private static QuoteResponse ToResponse(Quote quote) =>
        new(quote.Id, quote.By, quote.Content);

    private static bool TryValidate(QuoteRequest request, out Dictionary<string, string[]> errors)
    {
        var results = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true);

        errors = results
            .SelectMany(result => result.MemberNames.DefaultIfEmpty(string.Empty),
                (result, member) => (Member: member, result.ErrorMessage))
            .GroupBy(entry => entry.Member, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.Select(entry => entry.ErrorMessage ?? "Invalid value.").ToArray());

        return isValid;
    }
}
