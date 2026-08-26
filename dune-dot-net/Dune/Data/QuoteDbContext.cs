using Dune.Models;
using Microsoft.EntityFrameworkCore;

namespace Dune.Data;

public class QuoteDbContext(DbContextOptions<QuoteDbContext> options) : DbContext(options)
{
    public DbSet<Quote> Quotes => Set<Quote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Quote>(quote =>
        {
            quote.Property(q => q.By).HasMaxLength(120).IsRequired();
            quote.Property(q => q.Content).HasMaxLength(2000).IsRequired();
        });
    }
}
