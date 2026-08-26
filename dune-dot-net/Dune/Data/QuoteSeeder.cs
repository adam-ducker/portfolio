using Dune.Models;
using Microsoft.EntityFrameworkCore;

namespace Dune.Data;

public static class QuoteSeeder
{
    private static readonly Quote[] Seed =
    [
        new() { By = "Bene Gesserit Litany", Content = "I must not fear. Fear is the mind-killer." },
        new() { By = "Paul Atreides", Content = "A beginning is a very delicate time." },
        new() { By = "Duke Leto Atreides", Content = "Without change, something sleeps inside us, and seldom awakens." },
        new() { By = "Reverend Mother Gaius Helen Mohiam", Content = "A world is supported by four things: the learning of the wise, the justice of the great, the prayers of the righteous and the valor of the brave." },
        new() { By = "Chani", Content = "Tell me of your homeworld, Usul." },
        new() { By = "Baron Vladimir Harkonnen", Content = "He who controls the spice controls the universe." }
    ];

    /// <summary>Creates the database if needed and adds the starter quotes on an empty table.</summary>
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<QuoteDbContext>();

        await db.Database.EnsureCreatedAsync(cancellationToken);

        if (await db.Quotes.AnyAsync(cancellationToken))
        {
            return;
        }

        db.Quotes.AddRange(Seed);
        await db.SaveChangesAsync(cancellationToken);
    }
}
