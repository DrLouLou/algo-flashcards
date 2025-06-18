from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Deck, Card, UserCard

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2"]
        extra_kwargs = {
            "password": {"write_only": True, "min_length": 8},
            "email": {"required": True},
        }

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Passwords must match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class CardSerializer(serializers.ModelSerializer):
    data = serializers.JSONField()
    # Still return the old field names for reads:
    problem = serializers.CharField(source="data.problem", read_only=True)
    difficulty = serializers.CharField(source="data.difficulty", read_only=True)
    category = serializers.CharField(source="data.category", read_only=True)
    hint = serializers.CharField(source="data.hint", read_only=True)
    pseudo = serializers.CharField(source="data.pseudo", read_only=True)
    solution = serializers.CharField(source="data.solution", read_only=True)
    complexity = serializers.CharField(source="data.complexity", read_only=True)
    tags = serializers.CharField(source="data.tags", read_only=True)

    class Meta:
        model = Card
        fields = [
            "id",
            "deck",
            "card_type",
            "data",
            "problem",
            "difficulty",
            "category",
            "hint",
            "pseudo",
            "solution",
            "complexity",
            "tags",
        ]

    def validate(self, attrs):
        # Enforce that the JSON you POST matches your CardType.fields
        data = attrs.get("data", {})
        ct = attrs.get("card_type") or getattr(self.instance, "card_type", None)
        if ct:
            allowed = set(ct.fields or [])
            given = set(data.keys())
            extra = given - allowed
            missing = allowed - given
            if extra or missing:
                msg = {}
                if extra:
                    msg["data"] = f"Unexpected keys: {sorted(extra)}"
                if missing:
                    msg["data"] = (
                        msg.get("data", "") + f" Missing keys: {sorted(missing)}"
                    )
                raise serializers.ValidationError(msg)
        return super().validate(attrs)


class DeckSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)
    owner = serializers.ReadOnlyField(source="owner.username")
    shared = serializers.BooleanField(required=False)
    tags = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Deck
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "owner",
            "cards",
            "shared",
            "tags",
        ]


class UserCardSerializer(serializers.ModelSerializer):
    # embed the card data
    card = CardSerializer(read_only=True)
    # accept a write-only 'last_rating' field so the client can send Again/Good/Easy/etc.
    last_rating = serializers.CharField(required=False, allow_null=True)
    status = serializers.CharField(required=False)

    class Meta:
        model = UserCard
        fields = [
            "id",
            "card",
            "ease_factor",
            "interval",
            "repetitions",
            "due_date",
            "last_rating",
            "status",
        ]
        read_only_fields = [
            "ease_factor",
            "interval",
            "repetitions",
            "due_date",
        ]

    def update(self, instance, validated_data):
        # 1) pull the rating out of the payload
        rating = validated_data.pop("last_rating", None)
        status = validated_data.pop("status", None)
        # 2) store it on the model
        if rating is not None:
            instance.last_rating = rating
        if status is not None:
            instance.status = status

        # 3) scheduling logic (SM-2, etc.)
        if rating:
            if rating == "easy":
                instance.interval = max(instance.interval * 2, 1)
                instance.ease_factor += 0.15
            elif rating == "good":
                instance.interval = max(instance.interval + 1, 1)
            elif rating == "hard":
                instance.interval = 1
                instance.ease_factor = max(instance.ease_factor - 0.15, 1.3)
            else:  # again
                instance.interval = 0
            instance.repetitions = (
                (instance.repetitions + 1) if rating != "again" else 0
            )
            instance.due_date = timezone.now() + timezone.timedelta(
                days=instance.interval
            )

        # 4) make sure your last_rating + scheduling changes get persisted
        instance.save()

        # 5) let DRF save any other writable fields (none in this case)
        return super().update(instance, validated_data)
