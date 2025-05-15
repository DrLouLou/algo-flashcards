from rest_framework import serializers
from .models import Deck, Card

class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id','deck','problem','difficulty','category','hint','pseudo','solution','complexity']
class DeckSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)
    owner = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model  = Deck
        fields = ['id','name','description','created_at','owner','cards']



