from django.db import models
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class CardType(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="card_types"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    fields = models.JSONField(
        blank=True,
        default=list,
        help_text="List of JSON keys that each Card.data must include",
    )
    layout = models.JSONField(
        blank=True,
        default=dict,
        help_text="Dict with 'front' and 'back' keys listing field names for card layout",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("name", "owner")
        # Prevent duplicate card types per user (or globally if owner is null)

    def __str__(self):
        return self.name

    @staticmethod
    def get_or_create_default(owner):
        return CardType.objects.get_or_create(
            name="Default",
            owner=owner,
            defaults={
                "fields": [
                    "problem",
                    "difficulty",
                    "category",
                    "hint",
                    "pseudo",
                    "solution",
                    "complexity",
                ],
                "layout": {
                    "front": ["problem", "difficulty", "category", "hint"],
                    "back": ["pseudo", "solution", "complexity"],
                    "hidden": ["hint"],
                },
            },
        )


class Deck(models.Model):
    name = models.CharField(max_length=100)
    card_type = models.ForeignKey(
        CardType,
        on_delete=models.PROTECT,
        related_name="decks",
        help_text="What type of cards this deck contains",
    )
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="decks",
        null=True,
        blank=True,
    )
    shared = models.BooleanField(
        default=False, help_text="If true, this deck is visible to all users."
    )
    tags = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        unique_together = ("card_type", "name", "owner")
        # prevent two decks with the same name under one type and owner

    def save(self, *args, **kwargs):
        if self.tags:
            tags = [t.strip().lower() for t in self.tags.split(",") if t.strip()]
            # Remove duplicates while preserving order
            seen = set()
            tags = [t for t in tags if not (t in seen or seen.add(t))]
            self.tags = ",".join(tags)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Card(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name="cards")
    data = models.JSONField(
        blank=True,
        default=dict,
        help_text="A dict whose keys must come from the deck's card_type.fields",
    )
    problem = models.CharField(
        max_length=100, blank=True
    )  # changed blank=False to blank=True
    difficulty = models.CharField(
        max_length=50, blank=True
    )  # changed blank=False to blank=True
    category = models.CharField(max_length=100, blank=True, default="")
    hint = models.CharField(blank=True, default="")
    pseudo = models.TextField(blank=True, default="")
    solution = models.TextField(blank=True, default="")
    complexity = models.TextField(blank=True, default="")
    tags = models.CharField(max_length=200, blank=True, default="")

    def save(self, *args, **kwargs):
        if self.tags:
            tags = [t.strip().lower() for t in self.tags.split(",") if t.strip()]
            # Remove duplicates while preserving order
            seen = set()
            tags = [t for t in tags if not (t in seen or seen.add(t))]
            self.tags = ",".join(tags)
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        # enforce that data only contains the fields declared in the deck's CardType
        allowed = set(self.deck.card_type.fields or [])
        given = set(self.data.keys())
        bad = given - allowed
        if bad:
            raise ValidationError(
                {"data": f"Invalid keys in data: {bad}. Allowed: {allowed}"}
            )

    def __str__(self):
        return self.problem


class UserCard(models.Model):
    RATING_CHOICES = [
        ("again", "Again"),
        ("hard", "Hard"),
        ("good", "Good"),
        ("easy", "Easy"),
    ]
    STATUS_CHOICES = [
        ("new", "New"),
        ("known", "Known"),
        ("review", "Need Review"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    # SM-2 fields:
    ease_factor = models.FloatField(default=2.5)
    interval = models.IntegerField(default=0)  # days until next review
    repetitions = models.IntegerField(default=0)
    due_date = models.DateTimeField(default=timezone.now)
    last_rating = models.CharField(
        max_length=10,
        choices=RATING_CHOICES,
        blank=True,
        default="",
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="new",
    )

    class Meta:
        unique_together = ("user", "card")


class ChatGPTRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_requests"
    )
    card_type = models.ForeignKey(
        CardType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chat_requests",
        help_text="Which CardType this request was targeting",
    )
    prompt = models.TextField()
    response = models.TextField()
    endpoint = models.CharField(max_length=100, help_text="e.g. `/v1/chat/completions`")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} → {self.card_type.name if self.card_type else 'no-type'} @ {self.created_at:%Y-%m-%d %H:%M}"
