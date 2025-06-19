from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Deck, Card, UserCard, CardType

User = settings.AUTH_USER_MODEL


@receiver(post_save, sender=User)
def bootstrap_user(sender, instance, created, **kwargs):
    if not created:
        return

    # 1) Create or get a default CardType for the user
    card_type, _ = CardType.objects.get_or_create(
        owner=instance,
        name="Default",
        defaults={"description": "Default card type", "fields": []},
    )
    # 2) Create an empty personal deck for the new user with a valid card_type
    Deck.objects.create(
        name=f"{instance.username}'s Deck", owner=instance, card_type=card_type, tags=""
    )

    # 3) Find (or create) the global Starter Deck
    starter_deck, _ = Deck.objects.get_or_create(
        name="Starter Deck",
        defaults={
            "description": "All pre-loaded Anki cards",
            "owner": None,
            "card_type": card_type,
            "tags": "",
        },
    )

    # 4) Seed the new user's review queue:
    #    one UserCard per card in the Starter Deck (idempotent)
    now = timezone.now()
    for card in Card.objects.filter(deck=starter_deck):
        UserCard.objects.get_or_create(
            user=instance, card=card, defaults={"due_date": now}
        )


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
