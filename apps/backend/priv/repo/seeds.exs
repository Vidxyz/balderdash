alias Balderdash.Repo
alias Balderdash.Schemas.Card
alias Balderdash.Schemas.Category

# Seed 10 cards with 5 categories each
cards_data = [
  # Card 1
  {1, [
    {"Laughable Laws", "What is the official state sport of Maryland?", "Jousting"},
    {"Incredible Initials", "What does 'NASA' stand for?", "National Aeronautics and Space Administration"},
    {"Movie Mashup", "What 1994 film features a box of chocolates?", "Forrest Gump"},
    {"Potent Potables", "What is the main ingredient in a Mojito?", "Mint"},
    {"Weird Words", "What is a 'flibbertigibbet'?", "A flighty or whimsical person"}
  ]},
  # Card 2
  {2, [
    {"Laughable Laws", "In what state is it illegal to tie a giraffe to a telephone pole?", "Alabama"},
    {"Incredible Initials", "What does 'FBI' stand for?", "Federal Bureau of Investigation"},
    {"Movie Mashup", "What 1999 film features 'The Matrix'?", "The Matrix"},
    {"Potent Potables", "What is the main ingredient in a Margarita?", "Tequila"},
    {"Weird Words", "What is a 'gobbledygook'?", "Nonsense or meaningless language"}
  ]},
  # Card 3
  {3, [
    {"Laughable Laws", "In what city is it illegal to feed pigeons?", "San Francisco"},
    {"Incredible Initials", "What does 'CIA' stand for?", "Central Intelligence Agency"},
    {"Movie Mashup", "What 1985 film features time travel in a DeLorean?", "Back to the Future"},
    {"Potent Potables", "What is the main ingredient in a Martini?", "Gin"},
    {"Weird Words", "What is a 'lollygag'?", "To spend time aimlessly"}
  ]},
  # Card 4
  {4, [
    {"Laughable Laws", "In what state is it illegal to whistle underwater?", "Vermont"},
    {"Incredible Initials", "What does 'IRS' stand for?", "Internal Revenue Service"},
    {"Movie Mashup", "What 1977 film features a galaxy far, far away?", "Star Wars"},
    {"Potent Potables", "What is the main ingredient in a Cosmopolitan?", "Vodka"},
    {"Weird Words", "What is a 'kerfuffle'?", "A commotion or fuss"}
  ]},
  # Card 5
  {5, [
    {"Laughable Laws", "In what state is it illegal to carry an ice cream cone in your back pocket?", "Alabama"},
    {"Incredible Initials", "What does 'DEA' stand for?", "Drug Enforcement Administration"},
    {"Movie Mashup", "What 1993 film features a theme park with dinosaurs?", "Jurassic Park"},
    {"Potent Potables", "What is the main ingredient in a Manhattan?", "Whiskey"},
    {"Weird Words", "What is a 'brouhaha'?", "A noisy and overexcited reaction"}
  ]},
  # Card 6
  {6, [
    {"Laughable Laws", "In what city is it illegal to walk a lion down the street?", "New York"},
    {"Incredible Initials", "What does 'NSA' stand for?", "National Security Agency"},
    {"Movie Mashup", "What 1991 film features a serial killer and a rookie FBI agent?", "The Silence of the Lambs"},
    {"Potent Potables", "What is the main ingredient in a Daiquiri?", "Rum"},
    {"Weird Words", "What is a 'hullabaloo'?", "A commotion or uproar"}
  ]},
  # Card 7
  {7, [
    {"Laughable Laws", "In what state is it illegal to fish while riding a camel?", "Nevada"},
    {"Incredible Initials", "What does 'ATF' stand for?", "Bureau of Alcohol, Tobacco, Firearms and Explosives"},
    {"Movie Mashup", "What 1990 film features a mob boss and an undercover cop?", "Goodfellas"},
    {"Potent Potables", "What is the main ingredient in a Negroni?", "Gin"},
    {"Weird Words", "What is a 'shenanigan'?", "A mischievous act or trick"}
  ]},
  # Card 8
  {8, [
    {"Laughable Laws", "In what state is it illegal to drive a car in reverse?", "Arizona"},
    {"Incredible Initials", "What does 'CDC' stand for?", "Centers for Disease Control and Prevention"},
    {"Movie Mashup", "What 1994 film features a serial killer who quotes the seven deadly sins?", "Se7en"},
    {"Potent Potables", "What is the main ingredient in an Old Fashioned?", "Whiskey"},
    {"Weird Words", "What is a 'malarkey'?", "Nonsense or meaningless talk"}
  ]},
  # Card 9
  {9, [
    {"Laughable Laws", "In what state is it illegal to wear a fake mustache that causes laughter in church?", "Alabama"},
    {"Incredible Initials", "What does 'SEC' stand for?", "Securities and Exchange Commission"},
    {"Movie Mashup", "What 1999 film features a fight club?", "Fight Club"},
    {"Potent Potables", "What is the main ingredient in a Sidecar?", "Cognac"},
    {"Weird Words", "What is a 'skedaddle'?", "To run away hurriedly"}
  ]},
  # Card 10
  {10, [
    {"Laughable Laws", "In what state is it illegal to hunt whales?", "Oklahoma"},
    {"Incredible Initials", "What does 'FDA' stand for?", "Food and Drug Administration"},
    {"Movie Mashup", "What 2000 film features a man who can't form new memories?", "Memento"},
    {"Potent Potables", "What is the main ingredient in a Bellini?", "Prosecco"},
    {"Weird Words", "What is a 'whippersnapper'?", "A young and inexperienced person"}
  ]}
]

# Insert cards and categories
Enum.each(cards_data, fn {card_number, categories} ->
  {:ok, card} = Repo.insert(%Card{card_number: card_number})

  Enum.each(categories, fn {category_name, question, answer} ->
    Repo.insert!(%Category{
      category_name: category_name,
      question: question,
      answer: answer,
      card_id: card.id
    })
  end)
end)

IO.puts("Seeded 10 cards with 5 categories each!")
