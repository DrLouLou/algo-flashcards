from django.db import models
from django.conf import settings

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
    category = models.CharField(max_length=50, blank=True, default='')
    hint = models.CharField(max_length=50, blank=True, default='')
    pseudo = models.TextField(blank=True, default='')
    solution = models.TextField(blank=True, default='')
    complexity = models.TextField(blank=True, default='')

    def __str__(self):
        return self.problem


