# Idempotent: only inserts if no cards exist. Also run as part of migration 20250126000004.
Balderdash.Seeds.run(Balderdash.Repo)
IO.puts("Seeded 10 cards with 5 categories each (or already present)!")
