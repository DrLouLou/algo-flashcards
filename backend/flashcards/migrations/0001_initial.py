# Generated by Django 5.2 on 2025-06-20 23:48

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CardType",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                (
                    "fields",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="List of JSON keys that each Card.data must include",
                    ),
                ),
                (
                    "layout",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Dict with 'front' and 'back' keys listing field names for card layout",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="card_types",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("name", "owner")},
            },
        ),
        migrations.CreateModel(
            name="ChatGPTRequest",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("prompt", models.TextField()),
                ("response", models.TextField()),
                (
                    "endpoint",
                    models.CharField(
                        help_text="e.g. `/v1/chat/completions`", max_length=100
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "card_type",
                    models.ForeignKey(
                        blank=True,
                        help_text="Which CardType this request was targeting",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="chat_requests",
                        to="flashcards.cardtype",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chat_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Deck",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "shared",
                    models.BooleanField(
                        default=False,
                        help_text="If true, this deck is visible to all users.",
                    ),
                ),
                ("tags", models.CharField(blank=True, default="", max_length=200)),
                (
                    "card_type",
                    models.ForeignKey(
                        help_text="What type of cards this deck contains",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="decks",
                        to="flashcards.cardtype",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="decks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("card_type", "name", "owner")},
            },
        ),
        migrations.CreateModel(
            name="Card",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "data",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="A dict whose keys must come from the deck's card_type.fields",
                    ),
                ),
                ("problem", models.CharField(blank=True, max_length=100)),
                ("difficulty", models.CharField(blank=True, max_length=50)),
                ("category", models.CharField(blank=True, default="", max_length=100)),
                ("hint", models.CharField(blank=True, default="")),
                ("pseudo", models.TextField(blank=True, default="")),
                ("solution", models.TextField(blank=True, default="")),
                ("complexity", models.TextField(blank=True, default="")),
                ("tags", models.CharField(blank=True, default="", max_length=200)),
                (
                    "deck",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cards",
                        to="flashcards.deck",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="UserCard",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("ease_factor", models.FloatField(default=2.5)),
                ("interval", models.IntegerField(default=0)),
                ("repetitions", models.IntegerField(default=0)),
                ("due_date", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "last_rating",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("again", "Again"),
                            ("hard", "Hard"),
                            ("good", "Good"),
                            ("easy", "Easy"),
                        ],
                        default="",
                        max_length=10,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("new", "New"),
                            ("known", "Known"),
                            ("review", "Need Review"),
                        ],
                        default="new",
                        max_length=10,
                    ),
                ),
                (
                    "card",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="flashcards.card",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("user", "card")},
            },
        ),
    ]
