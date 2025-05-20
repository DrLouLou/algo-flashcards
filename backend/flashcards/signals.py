from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Deck, Card, UserCard

User = settings.AUTH_USER_MODEL

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_deck(sender, instance, created, **kwargs):
    if created:
        # create personal default deck
        default_deck = Deck.objects.create(
            name=f"{instance.username}'s Deck",
            owner=instance
        )
        # clone global starter cards into this deck
        for card in Card.objects.filter(deck__owner__isnull=True):
            Card.objects.create(
                deck=default_deck,
                problem=card.problem,
                difficulty=card.difficulty,
                category=card.category,
                hint=card.hint,
                pseudo=card.pseudo,
                solution=card.solution,
                complexity=card.complexity,
            )

@receiver(post_save, sender=User)
def seed_starter_usercards(sender, instance, created, **kwargs):
    if not created:
        return

    # 1) find—or create—the Starter Deck
    starter_deck, _ = Deck.objects.get_or_create(
        name="Starter Deck",
        defaults={"description": "All pre-loaded Anki cards"}
    )

    # 2) pull all the cards in that deck
    starter_cards = Card.objects.filter(deck=starter_deck)

    # 3) bulk-create a UserCard for each, due immediately
    now = timezone.now()
    usercards = [
        UserCard(user=instance, card=card, due_date=now)
        for card in starter_cards
    ]
    UserCard.objects.bulk_create(usercards)
