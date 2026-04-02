from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from friends.models import Friendship, UserBan

from .models import Room, RoomMembership, Message


User = get_user_model()


class DirectDialogApiTests(APITestCase):
	def setUp(self):
		self.alice = User.objects.create_user(
			username='alice',
			email='alice@example.com',
			password='pass12345',
		)
		self.bob = User.objects.create_user(
			username='bob',
			email='bob@example.com',
			password='pass12345',
		)
		self.charlie = User.objects.create_user(
			username='charlie',
			email='charlie@example.com',
			password='pass12345',
		)

	def test_create_or_get_direct_dialog_success_and_no_duplicate(self):
		Friendship.objects.create(user1=self.alice, user2=self.bob)
		self.client.force_login(self.alice)

		create_response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.bob.id},
			format='json',
		)
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
		room_id = create_response.data['id']
		self.assertTrue(create_response.data['is_direct'])

		self.assertTrue(RoomMembership.objects.filter(room_id=room_id, user=self.alice).exists())
		self.assertTrue(RoomMembership.objects.filter(room_id=room_id, user=self.bob).exists())

		second_response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.bob.id},
			format='json',
		)
		self.assertEqual(second_response.status_code, status.HTTP_200_OK)
		self.assertEqual(second_response.data['id'], room_id)
		self.assertEqual(
			Room.objects.filter(is_direct=True, dm_user1=self.alice, dm_user2=self.bob).count(),
			1,
		)

	def test_cannot_create_direct_dialog_with_self(self):
		self.client.force_login(self.alice)

		response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.alice.id},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['detail'], 'You cannot create a direct dialog with yourself.')

	def test_cannot_create_direct_dialog_if_not_friends(self):
		self.client.force_login(self.alice)

		response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.charlie.id},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['detail'], 'Direct dialog is allowed only between friends.')

	def test_cannot_create_direct_dialog_if_banned(self):
		Friendship.objects.create(user1=self.alice, user2=self.bob)
		UserBan.objects.create(source_user=self.alice, target_user=self.bob)
		self.client.force_login(self.alice)

		response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.bob.id},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(
			response.data['detail'],
			'Cannot create direct dialog because one user banned the other.',
		)

	def test_list_my_direct_dialogs(self):
		Friendship.objects.create(user1=self.alice, user2=self.bob)
		self.client.force_login(self.alice)

		create_response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.bob.id},
			format='json',
		)
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		public_room = Room.objects.create(
			name='general-room',
			description='public',
			visibility=Room.Visibility.PUBLIC,
			owner=self.alice,
		)
		RoomMembership.objects.create(
			room=public_room,
			user=self.alice,
			role=RoomMembership.Role.OWNER,
		)

		list_response = self.client.get('/api/rooms/dialogs/')
		self.assertEqual(list_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(list_response.data), 1)
		self.assertTrue(list_response.data[0]['is_direct'])

	def test_banned_users_can_read_direct_history_but_cannot_send_new_messages(self):
		Friendship.objects.create(user1=self.alice, user2=self.bob)
		self.client.force_login(self.alice)

		create_response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.bob.id},
			format='json',
		)
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
		room_id = create_response.data['id']

		seed_message = Message.objects.create(
			room_id=room_id,
			user=self.alice,
			content='hello before ban',
		)
		self.assertIsNotNone(seed_message.id)

		ban_response = self.client.post(f'/api/friends/ban/{self.bob.id}/')
		self.assertEqual(ban_response.status_code, status.HTTP_201_CREATED)

		self.client.force_login(self.bob)

		history_response = self.client.get(f'/api/rooms/{room_id}/messages/')
		self.assertEqual(history_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(history_response.data), 1)

		send_response = self.client.post(
			f'/api/rooms/{room_id}/messages/',
			{'content': 'hello after ban'},
			format='json',
		)
		self.assertEqual(send_response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(
			send_response.data['detail'],
			'Direct dialog is read-only because one user banned the other.',
		)

	def test_personal_messaging_requires_friendship_in_existing_direct_dialog(self):
		Friendship.objects.create(user1=self.alice, user2=self.bob)
		self.client.force_login(self.alice)

		create_response = self.client.post(
			'/api/rooms/dialogs/create-or-get/',
			{'user_id': self.bob.id},
			format='json',
		)
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
		room_id = create_response.data['id']

		remove_friend_response = self.client.delete(f'/api/friends/{self.bob.id}/')
		self.assertEqual(remove_friend_response.status_code, status.HTTP_204_NO_CONTENT)

		send_response = self.client.post(
			f'/api/rooms/{room_id}/messages/',
			{'content': 'hello after unfriend'},
			format='json',
		)
		self.assertEqual(send_response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertEqual(
			send_response.data['detail'],
			'Direct dialog is read-only because users are no longer friends.',
		)


class ModerationApiTests(APITestCase):
	def setUp(self):
		self.owner = User.objects.create_user(
			username='owner',
			email='owner@example.com',
			password='pass12345',
		)
		self.admin = User.objects.create_user(
			username='admin',
			email='admin@example.com',
			password='pass12345',
		)
		self.member = User.objects.create_user(
			username='member',
			email='member@example.com',
			password='pass12345',
		)

		self.room = Room.objects.create(
			name='mod-room',
			description='Moderation room',
			visibility=Room.Visibility.PUBLIC,
			owner=self.owner,
		)
		RoomMembership.objects.create(
			room=self.room,
			user=self.owner,
			role=RoomMembership.Role.OWNER,
		)
		RoomMembership.objects.create(
			room=self.room,
			user=self.admin,
			role=RoomMembership.Role.ADMIN,
		)
		RoomMembership.objects.create(
			room=self.room,
			user=self.member,
			role=RoomMembership.Role.MEMBER,
		)

	def test_admin_cannot_ban_owner(self):
		self.client.force_login(self.admin)

		response = self.client.post(
			f'/api/rooms/{self.room.id}/ban/{self.owner.id}/',
			{'reason': 'nope'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['detail'], 'Cannot ban the room owner.')

	def test_duplicate_ban_returns_400(self):
		self.client.force_login(self.admin)

		first = self.client.post(
			f'/api/rooms/{self.room.id}/ban/{self.member.id}/',
			{'reason': 'first'},
			format='json',
		)
		self.assertEqual(first.status_code, status.HTTP_201_CREATED)

		second = self.client.post(
			f'/api/rooms/{self.room.id}/ban/{self.member.id}/',
			{'reason': 'second'},
			format='json',
		)

		self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(second.data['non_field_errors'][0], 'User is already banned from this room.')
