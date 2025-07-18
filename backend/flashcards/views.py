import os
import json
import re
import openai
from django.utils import timezone
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from flashcards.pagination import CardCursorPagination
from .models import Deck, Card, UserCard, CardType
from .serializers import (
    DeckSerializer,
    CardSerializer,
    RegisterSerializer,
    UserCardSerializer,
    CardTypeSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsDeckOwnerOrReadOnly

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class RegisterView(generics.CreateAPIView):
    """
    POST username/email/password/password2 to register a new user.
    """

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class DeckViewSet(viewsets.ModelViewSet):
    queryset = Deck.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    serializer_class = DeckSerializer
    from rest_framework.pagination import CursorPagination

    class DeckCursorPagination(CursorPagination):
        page_size = 12
        ordering = "id"
        cursor_query_param = "cursor"

    pagination_class = DeckCursorPagination

    def get_queryset(self):
        user = self.request.user
        qs = Deck.objects.all()
        if user.is_authenticated:
            qs = qs.filter(owner=user)
            # If superuser, also include the Starter Deck (even if not owner)
            if user.is_superuser:
                starter = Deck.objects.filter(name="Starter Deck")
                qs = qs | starter
        else:
            qs = Deck.objects.none()
        # Tag filtering (comma-separated, match any)
        tags_param = self.request.query_params.get("tags")
        if tags_param:
            tags = [t.strip().lower() for t in tags_param.split(",") if t.strip()]
            if tags:
                tag_q = Q()
                for tag in tags:
                    tag_q |= Q(tags__icontains=tag)
                qs = qs.filter(tag_q)
        # Search by name (case-insensitive substring)
        search_param = self.request.query_params.get("search")
        if search_param:
            qs = qs.filter(name__icontains=search_param)
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Allow any superuser to access the Starter Deck
        if instance.name == "Starter Deck" and request.user.is_superuser:
            return super().retrieve(request, *args, **kwargs)
        if instance.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        return super().destroy(request, *args, **kwargs)


class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly, IsDeckOwnerOrReadOnly]
    serializer_class = CardSerializer
    pagination_class = CardCursorPagination  # Enable cursor pagination for cards

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            # User's own cards
            qs = Card.objects.filter(deck__owner=user)
            # Also include cards in the Starter Deck for any authenticated user
            starter_deck = Deck.objects.filter(name="Starter Deck", owner=None).first()
            if starter_deck:
                qs = qs | Card.objects.filter(deck=starter_deck)
            # If superuser, this is redundant but harmless
            deck_id = self.request.query_params.get("deck")
            if deck_id:
                qs = qs.filter(deck_id=deck_id)
            # --- Filtering by tags (comma-separated, match any) ---
            tags_param = self.request.query_params.get("tags")
            if tags_param:
                tags = [t.strip().lower() for t in tags_param.split(",") if t.strip()]
                if tags:
                    tag_q = Q()
                    for tag in tags:
                        tag_q |= Q(tags__icontains=tag)
                    qs = qs.filter(tag_q)
            # --- Filtering by difficulties (comma-separated, match any) ---
            diffs_param = self.request.query_params.get("difficulties")
            if diffs_param:
                diffs = [d.strip() for d in diffs_param.split(",") if d.strip()]
                if diffs:
                    diff_q = Q()
                    for diff in diffs:
                        diff_q |= Q(difficulty__iexact=diff)
                    qs = qs.filter(diff_q)
            return qs.distinct()
        return Card.objects.none()

    def perform_create(self, serializer):
        deck = serializer.validated_data["deck"]
        # --- REMOVE RESTRICTION: allow any authenticated user to add cards to any deck ---
        # if deck.owner != self.request.user:
        #     raise PermissionDenied("You can only add cards to your own decks.")
        card = serializer.save()
        # create the initial UserCard for the creator
        UserCard.objects.create(user=self.request.user, card=card)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Allow any superuser to access any card
        if request.user.is_superuser:
            return super().retrieve(request, *args, **kwargs)
        # Allow any authenticated user to access cards in the Starter Deck
        if (
            instance.deck.owner is None
            and instance.deck.name == "Starter Deck"
            and request.user.is_authenticated
        ):
            return super().retrieve(request, *args, **kwargs)
        if instance.deck.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_superuser:
            return super().update(request, *args, **kwargs)
        if (
            instance.deck.owner is None
            and instance.deck.name == "Starter Deck"
            and request.user.is_authenticated
        ):
            return super().update(request, *args, **kwargs)
        if instance.deck.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_superuser:
            return super().destroy(request, *args, **kwargs)
        if (
            instance.deck.owner is None
            and instance.deck.name == "Starter Deck"
            and request.user.is_authenticated
        ):
            return super().destroy(request, *args, **kwargs)
        if instance.deck.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        return super().destroy(request, *args, **kwargs)


class UserCardViewSet(viewsets.ModelViewSet):
    serializer_class = UserCardSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # always return full list

    def get_queryset(self):
        qs = UserCard.objects.filter(user=self.request.user)
        deck = self.request.query_params.get("deck", None)
        status = self.request.query_params.get("status", None)
        if deck is not None:
            qs = qs.filter(card__deck_id=deck)
        if status is not None:
            qs = qs.filter(status=status)
        return qs

    @action(detail=False, methods=["get"])
    def queue(self, request):
        """
        /api/usercards/queue/?deck=<id>:
        1) filter by current user and optional deck
        2) take all with due_date <= now, ordered by due_date
        3) if none are due, fall back to *all* sorted by due_date
        4) paginate if needed, otherwise return as { "results": [...] }
        """
        now = timezone.now()
        deck = request.query_params.get("deck", None)
        qs = UserCard.objects.filter(user=request.user)
        if deck is not None:
            qs = qs.filter(card__deck_id=deck)

        due = qs.filter(due_date__lte=now).order_by("due_date")
        if not due.exists():
            due = qs.order_by("due_date")

        page = self.paginate_queryset(due)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(due, many=True)
        return Response({"results": serializer.data})

    @action(detail=False, methods=["post"])
    def reset(self, request):
        deck_id = request.query_params.get("deck")
        deck_id_int = None
        if deck_id is not None:
            try:
                deck_id_int = int(deck_id)
            except (TypeError, ValueError):
                return Response({"error": "Invalid deck id."}, status=400)
        qs = self.get_queryset()
        if deck_id_int is not None:
            qs = qs.filter(card__deck_id=deck_id_int)
            # --- PATCH: ensure all UserCards exist for this user/deck ---
            from .models import Card, UserCard
            from django.utils import timezone

            cards = Card.objects.filter(deck_id=deck_id_int)
            now = timezone.now()
            for card in cards:
                UserCard.objects.get_or_create(
                    user=request.user, card=card, defaults={"due_date": now}
                )
            # refresh qs after possible creation
            qs = self.get_queryset().filter(card__deck_id=deck_id_int)
        # reset scheduling + rating + status for this user's cards in this deck only
        qs.update(
            last_rating="",  # must be empty string, not None
            interval=0,
            ease_factor=2.5,
            repetitions=0,
            due_date=timezone.now(),
            status="new",  # ensure cards are learnable again
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"])
    def set_status(self, request, pk=None):
        usercard = self.get_object()
        status_val = request.data.get("status")
        if status_val not in dict(UserCard.STATUS_CHOICES):
            return Response({"error": "Invalid status"}, status=400)
        usercard.status = status_val
        usercard.save()
        return Response({"status": usercard.status})


class CardGenerationAPIView(generics.GenericAPIView):
    """
    POST { input_text } → use LLM to parse into JSON fields matching Card model
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt_text = request.data.get("input_text", "").strip()
        if not prompt_text:
            return Response(
                {"detail": "No input_text provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        system = """
You are an assistant that, given a programming problem description or title,
produces **only** a JSON object with these keys: problem, difficulty, category,
hint, pseudo, solution, complexity. 'problem' is the title of the problem, 'pseudo' s
hould be a description of the solution and 'solution' should be the solution itself, in python. 
Do **not** wrap it in markdown or include any commentary—just the raw JSON.
"""
        user_msg = f"Here is my input: '''{prompt_text}'''\n\nReturn the JSON."

        try:
            resp = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            text = resp.choices[0].message.content
            # DEBUG:
            print("[DEBUG] LLM returned:", repr(text))

            # --- strip off any Markdown fences or extra text ---
            # find the first "{" and last "}" and extract between
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                text = text[start : end + 1]
            else:
                # fallback: remove ```json``` fences if present
                text = re.sub(r"^```(?:json)?\s*", "", text)
                text = re.sub(r"\s*```$", "", text)

            # now parse
            try:
                data = json.loads(text)
            except json.JSONDecodeError as e:
                return Response(
                    {
                        "detail": "LLM output was not valid JSON",
                        "raw_output": text,
                        "json_error": str(e),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        except Exception as e:
            return Response(
                {"detail": "LLM error", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        required = [
            "problem",
            "difficulty",
            "category",
            "hint",
            "pseudo",
            "solution",
            "complexity",
        ]
        if not all(k in data for k in required):
            return Response(
                {
                    "detail": "LLM did not return all required fields",
                    "returned": list(data.keys()),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(data, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "username": user.username,
                "email": user.email,
            }
        )


class CardTypeViewSet(viewsets.ModelViewSet):
    serializer_class = CardTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        # Only allow users to see their own CardTypes
        return CardType.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # DEBUG: Log the user for troubleshooting
        import logging

        logger = logging.getLogger("flashcards.cardtype")
        logger.warning(
            f"[DEBUG] perform_create: user={self.request.user} is_authenticated={self.request.user.is_authenticated}"
        )
        # Ensure the owner is set to the current user
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        response = super().update(request, *args, **kwargs)
        # --- MIGRATION: update all cards of this type to match new fields ---
        updated_instance = self.get_object()  # get updated CardType
        new_fields = list(updated_instance.fields)
        # For all decks using this CardType
        for deck in updated_instance.decks.all():
            for card in deck.cards.all():
                data = card.data or {}
                # Only keep fields in new_fields, add missing as empty, preserve order
                new_data = {f: data.get(f, "") for f in new_fields}
                if data != new_data:
                    card.data = new_data
                    card.save(update_fields=["data"])
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.owner != request.user:
            return Response({"detail": "Not found."}, status=404)
        # Custom: delete all decks using this card type (cascade to cards)
        decks = instance.decks.all()
        for deck in decks:
            deck.delete()
        return super().destroy(request, *args, **kwargs)
