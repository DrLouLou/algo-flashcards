import csv
from django.core.management.base import BaseCommand
from flashcards.models import Deck, Card

class Command(BaseCommand):
    help = "Import cards from an Anki-exported TSV file into the Starter Deck"

    def add_arguments(self, parser):
        parser.add_argument('tsv_path', help="Path to the Anki-exported .txt file")

    def handle(self, *args, **options):
        path = options['tsv_path']

        # 1) get or create the Starter Deck
        starter_deck, _ = Deck.objects.get_or_create(
            name="Starter Deck",
            defaults={'description': 'All pre-loaded Anki cards'}
        )

        cards_to_create = []
        with open(path, encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            for lineno, row in enumerate(reader, start=1):
                # skip metadata lines
                if not row or row[0].startswith('#'):
                    continue
                if len(row) < 7:
                    self.stderr.write(
                        f"Line {lineno}: expected 7 cols, got {len(row)} — skipping"
                    )
                    continue

                problem, difficulty, category, hint, pseudo, solution, complexity = row[:7]

                # **MUST** pass deck=starter_deck here
                cards_to_create.append(
                    Card(
                        deck=starter_deck,
                        problem=problem.strip(),
                        difficulty=difficulty.strip(),
                        category=category.strip(),
                        hint=hint.strip(),
                        pseudo=pseudo.strip(),
                        solution=solution.strip(),
                        complexity=complexity.strip(),
                    )
                )

        # 3) clear out old cards if you want a clean import
        Card.objects.filter(deck=starter_deck).delete()

        if cards_to_create:
            Card.objects.bulk_create(cards_to_create)
            self.stdout.write(self.style.SUCCESS(
                f"Imported {len(cards_to_create)} cards into '{starter_deck.name}'"
            ))
        else:
            self.stdout.write("No cards imported.")
