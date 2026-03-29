from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import FriendRequest, Friendship, UserBan


User = get_user_model()


class FriendsApiFlowTests(APITestCase):
	def setUp(self):
		self.alice = User.objects.create_user(
			username="alice",
			email="alice@example.com",
			password="pass12345",
		)
		self.bob = User.objects.create_user(
			username="bob",
			email="bob@example.com",
			password="pass12345",
		)
		self.charlie = User.objects.create_user(
			username="charlie",
			email="charlie@example.com",
			password="pass12345",
		)

	def test_friend_request_send_lists_accept_reject_cancel_and_friend_list(self):
		self.client.force_login(self.alice)

		send_response = self.client.post(
			"/api/friends/requests/",
			{"to_user": self.bob.id, "message": "Hi Bob"},
			format="json",
		)
		self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)
		request_id = send_response.data["id"]

		outgoing_response = self.client.get("/api/friends/requests/outgoing/")
		self.assertEqual(outgoing_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(outgoing_response.data), 1)
		self.assertEqual(outgoing_response.data[0]["id"], request_id)

		self.client.force_login(self.bob)

		incoming_response = self.client.get("/api/friends/requests/incoming/")
		self.assertEqual(incoming_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(incoming_response.data), 1)
		self.assertEqual(incoming_response.data[0]["id"], request_id)

		accept_response = self.client.post(f"/api/friends/requests/{request_id}/accept/")
		self.assertEqual(accept_response.status_code, status.HTTP_200_OK)
		self.assertEqual(accept_response.data["status"], FriendRequest.Status.ACCEPTED)

		bob_friends_response = self.client.get("/api/friends/")
		self.assertEqual(bob_friends_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(bob_friends_response.data), 1)
		self.assertEqual(bob_friends_response.data[0]["id"], self.alice.id)

		self.client.force_login(self.alice)
		alice_friends_response = self.client.get("/api/friends/")
		self.assertEqual(alice_friends_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(alice_friends_response.data), 1)
		self.assertEqual(alice_friends_response.data[0]["id"], self.bob.id)

		reject_create_response = self.client.post(
			"/api/friends/requests/",
			{"to_user": self.charlie.id, "message": "Hi Charlie"},
			format="json",
		)
		self.assertEqual(reject_create_response.status_code, status.HTTP_201_CREATED)
		reject_request_id = reject_create_response.data["id"]

		self.client.force_login(self.charlie)
		reject_response = self.client.post(f"/api/friends/requests/{reject_request_id}/reject/")
		self.assertEqual(reject_response.status_code, status.HTTP_200_OK)
		self.assertEqual(reject_response.data["status"], FriendRequest.Status.REJECTED)

		self.client.force_login(self.alice)
		cancel_create_response = self.client.post(
			"/api/friends/requests/",
			{"to_user": self.charlie.id, "message": "Try again"},
			format="json",
		)
		self.assertEqual(cancel_create_response.status_code, status.HTTP_201_CREATED)
		cancel_request_id = cancel_create_response.data["id"]

		cancel_response = self.client.post(f"/api/friends/requests/{cancel_request_id}/cancel/")
		self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
		self.assertEqual(cancel_response.data["status"], FriendRequest.Status.CANCELED)

	def test_user_ban_and_unban_flow(self):
		Friendship.objects.create(user1=self.alice, user2=self.bob)

		self.client.force_login(self.alice)

		ban_response = self.client.post(f"/api/friends/ban/{self.bob.id}/")
		self.assertEqual(ban_response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(
			UserBan.objects.filter(source_user=self.alice, target_user=self.bob).exists()
		)
		self.assertFalse(
			Friendship.objects.filter(user1=self.alice, user2=self.bob).exists()
		)

		unban_response = self.client.delete(f"/api/friends/ban/{self.bob.id}/")
		self.assertEqual(unban_response.status_code, status.HTTP_204_NO_CONTENT)
		self.assertFalse(
			UserBan.objects.filter(source_user=self.alice, target_user=self.bob).exists()
		)
