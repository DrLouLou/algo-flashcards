from django.test import TestCase
from django.contrib.auth import get_user_model
from flashcards.models import CardType, Deck, Card
from flashcards.serializers import CardSerializer, CardTypeSerializer
from rest_framework.test import APIClient

User = get_user_model()


class CardSerializerSchemaValidationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="pw123456")
        self.card_type = CardType.objects.create(
            owner=self.user,
            name="Algo",
            fields=["problem", "solution", "difficulty"],
        )
        self.deck = Deck.objects.create(
            name="Test Deck", card_type=self.card_type, owner=self.user, tags=""
        )

    def test_valid_card(self):
        data = {"problem": "Q1", "solution": "42", "difficulty": "easy"}
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_field(self):
        data = {"problem": "Q1", "solution": "42"}  # missing difficulty
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertFalse(serializer.is_valid())
        self.assertIn("data", serializer.errors)
        self.assertIn("is a required property", str(serializer.errors["data"]))

    def test_extra_field(self):
        data = {"problem": "Q1", "solution": "42", "difficulty": "easy", "foo": "bar"}
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertFalse(serializer.is_valid())
        self.assertIn("data", serializer.errors)
        self.assertIn(
            "Additional properties are not allowed", str(serializer.errors["data"])
        )

    def test_wrong_type(self):
        data = {
            "problem": 123,
            "solution": "42",
            "difficulty": "easy",
        }  # problem should be string
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertFalse(serializer.is_valid())
        self.assertIn("data", serializer.errors)
        self.assertIn("is not of type 'string'", str(serializer.errors["data"]))


class CardTypeEditFieldsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="typeuser", password="pw123456")
        self.card_type = CardType.objects.create(
            owner=self.user,
            name="Type1",
            fields=["problem", "solution"],
        )
        self.deck = Deck.objects.create(
            name="Type Deck", card_type=self.card_type, owner=self.user, tags=""
        )

    def test_edit_fields_allowed_before_cards(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["problem", "solution", "difficulty"],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_edit_fields_blocked_after_cards(self):
        # Only use allowed fields for initial CardType
        Card.objects.create(
            deck=self.deck,
            data={"problem": "Q1", "solution": "A"},
            problem="Q1",
            solution="A",
            difficulty="easy",
        )
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["problem", "solution", "difficulty", "extra"],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("fields", serializer.errors)
        self.assertIn(
            "Cannot edit fields after cards have been created",
            str(serializer.errors["fields"]),
        )


class CardSerializerSchemaEdgeCaseTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="edgeuser", password="pw123456")
        self.card_type = CardType.objects.create(
            owner=self.user,
            name="EdgeAlgo",
            fields=["problem", "solution", "difficulty"],
        )
        self.deck = Deck.objects.create(
            name="Edge Deck", card_type=self.card_type, owner=self.user, tags=""
        )

    def test_empty_data(self):
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": {}})
        self.assertFalse(serializer.is_valid())
        self.assertIn("data", serializer.errors)

    def test_null_values(self):
        data = {"problem": None, "solution": None, "difficulty": None}
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertFalse(serializer.is_valid())
        self.assertIn("data", serializer.errors)

    def test_some_fields_empty_strings(self):
        data = {"problem": "", "solution": "", "difficulty": "easy"}
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_all_fields_empty_strings(self):
        data = {"problem": "", "solution": "", "difficulty": ""}
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_whitespace_strings(self):
        data = {"problem": "   ", "solution": "\t", "difficulty": "\n"}
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_additional_nested_object(self):
        data = {
            "problem": "Q",
            "solution": "A",
            "difficulty": "easy",
            "extra": {"foo": "bar"},
        }
        serializer = CardSerializer(data={"deck_id": self.deck.id, "data": data})
        self.assertFalse(serializer.is_valid())
        self.assertIn("data", serializer.errors)
        self.assertIn(
            "Additional properties are not allowed", str(serializer.errors["data"])
        )


class CardTypeEditFieldsEdgeCaseTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="typeedge", password="pw123456")
        self.card_type = CardType.objects.create(
            owner=self.user,
            name="TypeEdge",
            fields=["problem", "solution"],
        )

    def test_edit_fields_order_only(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["solution", "problem"],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_edit_fields_duplicate_names(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["problem", "problem"],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("fields", serializer.errors)
        self.assertIn("unique", str(serializer.errors["fields"]))

    def test_edit_fields_empty_list(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": [],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("fields", serializer.errors)
        self.assertIn(
            "At least one field is required", str(serializer.errors["fields"])
        )

    def test_edit_fields_non_string_names(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["problem", 123],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertTrue(
            serializer.is_valid(), serializer.errors
        )  # No backend check for type yet

    def test_edit_fields_whitespace_names(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["problem", "   "],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertTrue(
            serializer.is_valid(), serializer.errors
        )  # No backend check for whitespace yet

    def test_edit_fields_case_insensitive_duplicate(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["Problem", "problem"],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("fields", serializer.errors)
        self.assertIn("unique", str(serializer.errors["fields"]))

    def test_edit_fields_leading_trailing_spaces(self):
        serializer = CardTypeSerializer(
            instance=self.card_type,
            data={
                "name": self.card_type.name,
                "fields": ["problem", " problem ", "solution"],
                "description": self.card_type.description,
            },
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("fields", serializer.errors)
        self.assertIn("unique", str(serializer.errors["fields"]))


class PermissionsTest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username="user1", password="pw123456")
        self.user2 = User.objects.create_user(username="user2", password="pw123456")
        self.card_type1 = CardType.objects.create(
            owner=self.user1, name="T1", fields=["f"]
        )
        self.deck1 = Deck.objects.create(
            name="D1", card_type=self.card_type1, owner=self.user1, tags=""
        )
        self.card1 = Card.objects.create(
            deck=self.deck1, data={"f": "v"}, problem="p", difficulty="d"
        )
        self.client = APIClient()

    def test_cardtype_forbidden(self):
        self.client.force_authenticate(user=self.user2)
        url = f"/api/cardtypes/{self.card_type1.id}/"
        r = self.client.get(url)
        self.assertEqual(r.status_code, 404)
        r = self.client.patch(url, {"name": "new"}, format="json")
        self.assertEqual(r.status_code, 404)
        r = self.client.delete(url)
        self.assertEqual(r.status_code, 404)

    def test_deck_forbidden(self):
        self.client.force_authenticate(user=self.user2)
        url = f"/api/decks/{self.deck1.id}/"
        r = self.client.get(url)
        self.assertEqual(r.status_code, 404)
        r = self.client.patch(url, {"name": "new"}, format="json")
        self.assertEqual(r.status_code, 404)
        r = self.client.delete(url)
        self.assertEqual(r.status_code, 404)

    def test_card_forbidden(self):
        self.client.force_authenticate(user=self.user2)
        url = f"/api/cards/{self.card1.id}/"
        r = self.client.get(url)
        self.assertEqual(r.status_code, 404)
        r = self.client.patch(url, {"problem": "new"}, format="json")
        self.assertEqual(r.status_code, 404)
        r = self.client.delete(url)
        self.assertEqual(r.status_code, 404)
