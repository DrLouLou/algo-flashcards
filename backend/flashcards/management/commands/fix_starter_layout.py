from django.core.management.base import BaseCommand
from flashcards.models import CardType


class Command(BaseCommand):
    help = "Fix layout for all existing Starter Deck (Default) CardTypes."

    def handle(self, *args, **options):
        updated = 0
        for ct in CardType.objects.filter(name="Default"):
            ct.layout = {
                "front": ["problem", "difficulty", "category", "hint"],
                "back": ["pseudo", "solution", "complexity"],
                "hidden": ["hint"],
            }
            ct.save()
            updated += 1
        self.stdout.write(
            self.style.SUCCESS(f"Updated layout for {updated} Default CardType(s).")
        )
