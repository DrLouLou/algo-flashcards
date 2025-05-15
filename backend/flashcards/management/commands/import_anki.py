import csv
from django.core.management.base import BaseCommand
from flashcards.models import Deck, Card
from bs4 import BeautifulSoup

class Command(BaseCommand):
    help = "Import cards from an Anki-exported TSV file into the Starter Deck"

    def add_arguments(self, parser):
        parser.add_argument(
            'tsv_path', help="Path to the Anki-exported .txt file (TSV)"
        )

    def handle(self, *args, **options):
        path = options['tsv_path']

        # 1) Get or create the Starter Deck
        starter_deck, _ = Deck.objects.get_or_create(
            name="Starter Deck",
            defaults={'description': 'All pre-loaded Anki cards'}
        )

        cards_to_create = []

        # 2) Open file with newline='' to preserve embedded newlines
        with open(path, encoding='utf-8', newline='') as f:
            reader = csv.reader(f, delimiter='\t', quotechar='"')
            for lineno, row in enumerate(reader, start=1):
                # Skip metadata or empty lines
                if not row or row[0].startswith('#'):
                    continue

                # Ensure at least 7 columns
                if len(row) < 7:
                    self.stderr.write(
                        f"Line {lineno}: expected >=7 columns, got {len(row)}. Skipping."
                    )
                    continue

                problem, difficulty, category, hint, pseudo_html, solution_html, complexity = row[:7]

                # 3) Convert HTML fields to plaintext with real newlines
                pseudo_text = BeautifulSoup(pseudo_html, 'html.parser')\
                    .get_text(separator='\n')\
                    .strip()

                solution_text = BeautifulSoup(solution_html, 'html.parser')\
                    .get_text(separator='\n')\
                    .strip()

                cards_to_create.append(
                    Card(
                        deck=starter_deck,
                        problem=problem.strip(),
                        difficulty=difficulty.strip(),
                        category=category.strip(),
                        hint=hint.strip(),
                        pseudo=pseudo_text,
                        solution=solution_text,
                        complexity=complexity.strip(),
                    )
                )

        # 4) Remove existing cards in the Starter Deck for a clean import
        deleted, _ = Card.objects.filter(deck=starter_deck).delete()
        if deleted:
            self.stdout.write(
                self.style.WARNING(f"Deleted {deleted} existing cards from '{starter_deck.name}'")
            )

        # 5) Bulk-create new cards
        if cards_to_create:
            Card.objects.bulk_create(cards_to_create)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Imported {len(cards_to_create)} cards into '{starter_deck.name}'"
                )
            )
        else:
            self.stdout.write("No cards imported.")
