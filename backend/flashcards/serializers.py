from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Deck, Card, UserCard, CardType
import jsonschema

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


class CardTypeSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = CardType
        fields = [
            "id",
            "name",
            "description",
            "fields",
            "layout",
            "created_at",
            "owner",
        ]

    def validate(self, data):
        owner = self.context["request"].user if "request" in self.context else None
        name = data.get("name")
        fields = data.get("fields")
        # Always require at least one field if fields is present (on create or update)
        if fields is not None:
            if not isinstance(fields, list) or not any(str(f).strip() for f in fields):
                raise serializers.ValidationError(
                    {"fields": "At least one field is required."}
                )
            lower_fields = [str(f).strip().lower() for f in fields]
            if len(lower_fields) != len(set(lower_fields)):
                raise serializers.ValidationError(
                    {"fields": "Field names must be unique."}
                )
        if owner and name:
            qs = CardType.objects.filter(owner=owner, name=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"name": "You already have a card type with this name."}
                )
        # Prevent editing fields if cards exist for this type
        if self.instance and "fields" in data:
            if list(data["fields"]) != list(self.instance.fields):
                if any(deck.cards.exists() for deck in self.instance.decks.all()):
                    raise serializers.ValidationError(
                        {
                            "fields": "Cannot edit fields after cards have been created for this type."
                        }
                    )
        return data


class DeckSerializer(serializers.ModelSerializer):
    cards = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    owner = serializers.ReadOnlyField(source="owner.username")
    shared = serializers.BooleanField(required=False)
    tags = serializers.CharField(required=False, allow_blank=True)
    card_type = serializers.PrimaryKeyRelatedField(
        queryset=CardType.objects.all(),
        required=True,
        write_only=True,
        error_messages={
            "required": "Card type is required.",
            "does_not_exist": "Card type does not exist.",
        },
    )

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
            "card_type",
        ]

    def validate_card_type(self, value):
        user = self.context["request"].user if "request" in self.context else None
        request = self.context.get("request")
        deck_id = None
        if request and request.data.get("deck"):
            deck_id = request.data["deck"]
        if deck_id:
            try:
                deck = Deck.objects.get(id=deck_id)
                if deck.name == "Starter Deck" and deck.owner is None:
                    return value
            except Deck.DoesNotExist:
                pass
        if value.owner != user:
            raise serializers.ValidationError("You do not own this card type.")
        return value

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["card_type"] = CardTypeSerializer(instance.card_type).data
        return rep


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
    deck = DeckSerializer(read_only=True)
    deck_id = serializers.PrimaryKeyRelatedField(
        queryset=Deck.objects.all(), source="deck", write_only=True, required=False
    )

    class Meta:
        model = Card
        fields = [
            "id",
            "deck",
            "deck_id",
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
        data = attrs.get("data", {})
        deck = attrs.get("deck") or getattr(self.instance, "deck", None)
        if not deck:
            raise serializers.ValidationError({"deck": "Deck is required."})
        card_type = deck.card_type
        # Build JSON schema from card_type.fields (assume all string fields for now)
        if isinstance(card_type.fields, list):
            schema = {
                "type": "object",
                "properties": {f: {"type": "string"} for f in card_type.fields},
                "required": list(card_type.fields),
                "additionalProperties": False,
            }
            try:
                jsonschema.validate(instance=data, schema=schema)
            except jsonschema.ValidationError as e:
                raise serializers.ValidationError(
                    {"data": f"Schema validation error: {e.message}"}
                )
        return super().validate(attrs)

    def create(self, validated_data):
        # Ensure top-level fields are set from data dict if present
        data = validated_data.get("data", {})
        for field in [
            "problem",
            "difficulty",
            "category",
            "hint",
            "pseudo",
            "solution",
            "complexity",
            "tags",
        ]:
            if field in data:
                validated_data[field] = data[field]
        return super().create(validated_data)


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
