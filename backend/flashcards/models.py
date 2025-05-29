from django.db import models
from django.conf import settings
from django.utils import timezone

class Deck(models.Model):
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    created_at  = models.DateTimeField(auto_now_add=True)
    owner       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='decks',
        null=True,
        blank=True
    )

    def __str__(self):
        return self.name
    
class Card(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='cards')
    problem = models.CharField(max_length=100, blank=False)
    difficulty = models.CharField(max_length=50, blank=False)
    category = models.CharField(max_length=100, blank=True, default='')
    hint = models.CharField(blank=True, default='')
    pseudo = models.TextField(blank=True, default='')
    solution = models.TextField(blank=True, default='')
    complexity = models.TextField(blank=True, default='')

    def __str__(self):
        return self.problem

class UserCard(models.Model):
    RATING_CHOICES = [
        ('again', 'Again'),
        ('hard',  'Hard'),
        ('good',  'Good'),
        ('easy',  'Easy'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    # SM-2 fields:
    ease_factor = models.FloatField(default=2.5)
    interval    = models.IntegerField(default=0)        # days until next review
    repetitions = models.IntegerField(default=0)
    due_date    = models.DateTimeField(default=timezone.now)
    last_rating = models.CharField(
        max_length=10,
        choices=RATING_CHOICES,
        blank=True,
        null=True,
        default=None,
    )
    class Meta:
        unique_together = ('user', 'card')
