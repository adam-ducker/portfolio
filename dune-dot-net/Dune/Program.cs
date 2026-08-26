using Dune.Data;
using Dune.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services.AddDbContext<QuoteDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Quotes")
        ?? "Data Source=quotes.db"));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

await QuoteSeeder.InitializeAsync(app.Services);

app.MapGet("/", () => Results.Redirect("/api/quotes")).ExcludeFromDescription();
app.MapQuoteEndpoints();

app.Run();
