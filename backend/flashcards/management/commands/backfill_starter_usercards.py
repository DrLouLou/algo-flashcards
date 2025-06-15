from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from flashcards.models import Deck, Card, UserCard
from django.utils import timezone


class Command(BaseCommand):
    help = "Backfill missing UserCards for the Starter Deck for all users."

    def handle(self, *args, **options):
        User = get_user_model()
        starter_deck = Deck.objects.filter(name="Starter Deck").first()
        if not starter_deck:
            self.stdout.write(self.style.ERROR("No Starter Deck found."))
            return
        cards = Card.objects.filter(deck=starter_deck)
        users = User.objects.all()
        now = timezone.now()
        created_count = 0
        for user in users:
            for card in cards:
                obj, created = UserCard.objects.get_or_create(
                    user=user, card=card, defaults={"due_date": now}
                )
                if created:
                    created_count += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Backfilled {created_count} missing UserCards for the Starter Deck."
            )
        )
