from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Deck, Card

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