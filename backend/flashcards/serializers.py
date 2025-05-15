from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Deck, Card

User = get_user_model()
class RegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']
        extra_kwargs = {
            'password': {'write_only': True, 'min_length': 8},
            'email':    {'required': True},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password2": "Passwords must match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
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



