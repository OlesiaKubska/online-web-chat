from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from friends.models import Friendship, UserBan

from .models import Room, RoomMembership


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
