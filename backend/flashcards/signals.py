from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Deck, Card, UserCard

User = settings.AUTH_USER_MODEL

@receiver(post_save, sender=User)
def bootstrap_user(sender, instance, created, **kwargs):
    if not created:
        return

    # 1) Create an empty personal deck for the new user
    Deck.objects.create(
        name=f"{instance.username}'s Deck",
        owner=instance
    )

    # 2) Find (or create) the global Starter Deck
    starter_deck, _ = Deck.objects.get_or_create(
        name="Starter Deck",
        defaults={'description': 'All pre-loaded Anki cards', 'owner': None}
    )

    # 3) Seed the new user's review queue:
    #    one UserCard per card in the Starter Deck
    now = timezone.now()
    usercards = [
        UserCard(user=instance, card=card, due_date=now)
        for card in Card.objects.filter(deck=starter_deck)
    ]
    UserCard.objects.bulk_create(usercards)

# @receiver(post_save, sender=settings.AUTH_USER_MODEL)
# def create_default_deck(sender, instance, created, **kwargs):
#     if created:
#         # create personal default deck
#         default_deck = Deck.objects.create(
#             name=f"{instance.username}'s Deck",
#             owner=instance
#         )
#         # clone global starter cards into this deck
#         for card in Card.objects.filter(deck__owner__isnull=True):
#             Card.objects.create(
#                 deck=default_deck,
#                 problem=card.problem,
#                 difficulty=card.difficulty,
#                 category=card.category,
#                 hint=card.hint,
#                 pseudo=card.pseudo,
#                 solution=card.solution,
#                 complexity=card.complexity,
#             )

# @receiver(post_save, sender=User)
# def seed_starter_usercards(sender, instance, created, **kwargs):
#     if not created:
#         return

#     # 1) find—or create—the Starter Deck
#     starter_deck, _ = Deck.objects.get_or_create(
#         name="Starter Deck",
#         defaults={"description": "All pre-loaded Anki cards"}
#     )

#     # 2) pull all the cards in that deck
#     starter_cards = Card.objects.filter(deck=starter_deck)

#     # 3) bulk-create a UserCard for each, due immediately
#     now = timezone.now()
#     usercards = [
#         UserCard(user=instance, card=card, due_date=now)
#         for card in starter_cards
#     ]
#     UserCard.objects.bulk_create(usercards)
