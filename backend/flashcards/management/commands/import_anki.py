import csv
from django.core.management.base import BaseCommand, CommandError
from flashcards.models import Deck, Card, CardType
from django.contrib.auth import get_user_model
from bs4 import BeautifulSoup


class Command(BaseCommand):
    help = "Import cards from an Anki-exported TSV file into the Starter Deck"

    def add_arguments(self, parser):
        parser.add_argument(
            "tsv_path", help="Path to the Anki-exported .txt file (TSV)"
        )
        parser.add_argument(
            "--username",
            default="importuser",
            help="Username for the import user (default: importuser)",
        )
        parser.add_argument(
            "--password",
            default="importpass123",
            help="Password for the import user (default: importpass123)",
        )
        parser.add_argument(
            "--email",
            default="importuser@example.com",
            help="Email for the import user (default: importuser@example.com)",
        )

    def handle(self, *args, **options):
        path = options["tsv_path"]
        username = options["username"]
        password = options["password"]
        email = options["email"]
        User = get_user_model()
        user = User.objects.filter(username=username).first()
        if not user:
            user = User.objects.create_user(
                username=username, password=password, email=email
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created user '{username}' with password '{password}' and email '{email}'"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"Using existing user '{username}' (id={user.id})")
            )

        # Get or create the correct CardType for this user
        default_fields = [
            "problem",
            "difficulty",
            "category",
            "hint",
            "pseudo",
            "solution",
            "complexity",
            "tags",
        ]
        cardtype_qs = CardType.objects.filter(name="Default", owner=user)
        if cardtype_qs.exists():
            default_cardtype = cardtype_qs.first()
            # Update fields if needed
            if list(default_cardtype.fields) != default_fields:
                default_cardtype.fields = default_fields
                default_cardtype.save(update_fields=["fields"])
        else:
            default_cardtype = CardType.objects.create(
                name="Default",
                owner=user,
                fields=default_fields,
            )

        # Get or update the Starter Deck for this user (robust to duplicates)
        starter_decks = Deck.objects.filter(
            name="Starter Deck", card_type=default_cardtype, owner=user
        )
        if starter_decks.count() > 1:
            self.stdout.write(
                self.style.WARNING(
                    f"Warning: Multiple Starter Decks found for user {user.username}. Using the first one."
                )
            )
        starter_deck = starter_decks.first()
        if not starter_deck:
            starter_deck = Deck.objects.create(
                name="Starter Deck",
                card_type=default_cardtype,
                owner=user,
                description="All pre-loaded Anki cards",
                tags="",
            )
        else:
            # Update description/tags if needed
            updated = False
            if starter_deck.description != "All pre-loaded Anki cards":
                starter_deck.description = "All pre-loaded Anki cards"
                updated = True
            if starter_deck.tags != "":
                starter_deck.tags = ""
                updated = True
            if updated:
                starter_deck.save(update_fields=["description", "tags"])

        cards_to_create = []
        # 2) Open file with newline='' to preserve embedded newlines
        with open(path, encoding="utf-8", newline="") as f:
            reader = csv.reader(f, delimiter="\t", quotechar='"')
            for lineno, row in enumerate(reader, start=1):
                # Skip metadata or empty lines
                if not row or row[0].startswith("#"):
                    continue
                # Ensure at least 7 columns
                if len(row) < 7:
                    self.stderr.write(
                        f"Line {lineno}: expected >=7 columns, got {len(row)}. Skipping."
                    )
                    continue
                (
                    problem,
                    difficulty,
                    category,
                    hint,
                    pseudo_html,
                    solution_html,
                    complexity,
                ) = row[:7]
                pseudo_text = (
                    BeautifulSoup(pseudo_html, "html.parser")
                    .get_text(separator="\n")
                    .strip()
                )
                solution_text = (
                    BeautifulSoup(solution_html, "html.parser")
                    .get_text(separator="\n")
                    .strip()
                )
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
                        data={
                            "problem": problem.strip(),
                            "difficulty": difficulty.strip(),
                            "category": category.strip(),
                            "hint": hint.strip(),
                            "pseudo": pseudo_text,
                            "solution": solution_text,
                            "complexity": complexity.strip(),
                            "tags": "",
                        },
                    )
                )
        # Remove existing cards in the Starter Deck for a clean import
        deleted, _ = Card.objects.filter(deck=starter_deck).delete()
        if deleted:
            self.stdout.write(
                self.style.WARNING(
                    f"Deleted {deleted} existing cards from '{starter_deck.name}'"
                )
            )
        # Bulk-create new cards
        if cards_to_create:
            Card.objects.bulk_create(cards_to_create)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Imported {len(cards_to_create)} cards into '{starter_deck.name}'"
                )
            )
        else:
            self.stdout.write("No cards imported.")
