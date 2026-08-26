# Dune Quotes API

A small RESTful API in C# (.NET 10 minimal APIs) for listing and managing Dune quotes.
A quote is just two fields: `by` (the author) and `content` (the line itself).

## Running

```bash
dotnet run --project Dune --launch-profile http
```

The API listens on `http://localhost:5067`. On first run it creates `Dune/quotes.db`
(SQLite) and seeds it with a handful of quotes. OpenAPI is served in Development at
`/openapi/v1.json`.

## Endpoints

| Method   | Route                    | Purpose                                       | Success |
| -------- | ------------------------ | --------------------------------------------- | ------- |
| `GET`    | `/api/quotes`            | List all quotes; `?by=` filters by author      | 200     |
| `GET`    | `/api/quotes/{id}`       | Fetch one quote                                | 200     |
| `GET`    | `/api/quotes/random`     | Fetch a random quote                           | 200     |
| `POST`   | `/api/quotes`            | Create a quote                                 | 201     |
| `PUT`    | `/api/quotes/{id}`       | Replace a quote                                | 200     |
| `DELETE` | `/api/quotes/{id}`       | Delete a quote                                 | 204     |

Missing ids return `404`. Invalid bodies return `400` with an RFC 9457 problem
document listing the offending fields.

### Example

```bash
curl -X POST http://localhost:5067/api/quotes \
  -H 'Content-Type: application/json' \
  -d '{"by":"Stilgar","content":"Usul no longer needs the weirding module."}'
```

`Dune/Dune.http` has a ready-made request for every endpoint.

## Layout

```
Dune/
  Models/Quote.cs             entity
  Dtos/QuoteDtos.cs           request/response shapes + validation
  Data/QuoteDbContext.cs      EF Core context
  Data/QuoteSeeder.cs         database creation + starter quotes
  Endpoints/QuoteEndpoints.cs the CRUD route group
  Program.cs                  wiring
```
