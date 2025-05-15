from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.db.models import Q
from .models import Deck, Card
from .serializers import DeckSerializer, CardSerializer
from .permissions import IsOwnerOrReadOnly, IsDeckOwnerOrReadOnly
from rest_framework import generics, permissions
from flashcards.serializers import RegisterSerializer

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
        # only cards in decks the user owns or global starter decks (owner null)
        if user.is_authenticated:
            return Card.objects.filter(
                Q(deck__owner=user) | Q(deck__owner__isnull=True)
            )
        return Card.objects.filter(deck__owner__isnull=True)

