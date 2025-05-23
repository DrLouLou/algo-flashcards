from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, generics, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.db.models import Q
from .models import Deck, Card, UserCard
from .serializers import DeckSerializer, CardSerializer, RegisterSerializer, UserCardSerializer
from .permissions import IsOwnerOrReadOnly, IsDeckOwnerOrReadOnly

class RegisterView(generics.CreateAPIView):
    """
    POST username/email/password/password2 to register a new user.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class DeckViewSet(viewsets.ModelViewSet):
    queryset = Deck.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    serializer_class   = DeckSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Deck.objects.filter(Q(owner=user) | Q(owner__isnull=True))
        return Deck.objects.filter(owner__isnull=True)

    def perform_create(self, serializer):
            serializer.save(owner=self.request.user)

class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly, IsDeckOwnerOrReadOnly]
    serializer_class   = CardSerializer
    filterset_fields   = ['deck']
    
    def get_queryset(self):
        user = self.request.user
        qs = Card.objects.all()

        # 1) filter out any cards in decks you shouldn't see
        if user.is_authenticated:
            qs = qs.filter(
                Q(deck__owner__isnull=True) |    # global decks
                Q(deck__owner=user)              # your own decks
            )
        else:
            qs = qs.filter(deck__owner__isnull=True)

        # 2) if the frontend passed a ?deck=, apply that
        deck_id = self.request.query_params.get('deck')
        if deck_id is not None:
            qs = qs.filter(deck_id=deck_id)

        return qs
    
    def perform_create(self, serializer):
        deck = serializer.validated_data['deck']
        if deck.owner != self.request.user:
            raise PermissionDenied("You can only add cards to your own decks.")
        card = serializer.save()
        # create the initial UserCard for the creator
        UserCard.objects.create(user=self.request.user, card=card)

class UserCardViewSet(viewsets.ModelViewSet):
    serializer_class = UserCardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = UserCard.objects.filter(user=self.request.user)
        deck = self.request.query_params.get('deck', None)
        if deck is not None:
            qs = qs.filter(card__deck_id=deck)
        return qs

    @action(detail=False, methods=['get'])
    def queue(self, request):
        """
        /api/usercards/queue/?deck=<id>:
        1) filter by current user and optional deck
        2) take all with due_date <= now, ordered by due_date
        3) if none are due, fall back to *all* sorted by due_date
        4) paginate if needed, otherwise return as { "results": [...] }
        """
        now    = timezone.now()
        deck   = request.query_params.get('deck', None)
        qs     = UserCard.objects.filter(user=request.user)
        if deck is not None:
            qs = qs.filter(card__deck_id=deck)

        due = qs.filter(due_date__lte=now).order_by('due_date')
        if not due.exists():
            due = qs.order_by('due_date')

        page = self.paginate_queryset(due)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(due, many=True)
        return Response({ 'results': serializer.data })
    
    @action(detail=False, methods=['post'])
    def reset(self, request):
        deck_id = request.query_params.get('deck')
        qs = self.get_queryset()
        if deck_id:
            qs = qs.filter(card__deck_id=deck_id)
        # reset scheduling + rating
        qs.update(
          last_rating=None,
          interval=0,
          ease_factor=2.5,
          repetitions=0,
          due_date=timezone.now()
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)