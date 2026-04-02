from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from friends.models import Friendship, UserBan

from .models import Room, RoomMembership, Message, RoomBan, MessageAttachment


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


@override_settings(MEDIA_ROOT='test_media')
class RoomFeatureApiTests(APITestCase):
	def setUp(self):
		self.owner = User.objects.create_user(
			username='owner2',
			email='owner2@example.com',
			password='pass12345',
		)
		self.admin = User.objects.create_user(
			username='admin2',
			email='admin2@example.com',
			password='pass12345',
		)
		self.member = User.objects.create_user(
			username='member2',
			email='member2@example.com',
			password='pass12345',
		)
		self.other = User.objects.create_user(
			username='other2',
			email='other2@example.com',
			password='pass12345',
		)

	def _create_room(self, name='room-x', visibility=Room.Visibility.PUBLIC):
		room = Room.objects.create(
			name=name,
			description='desc',
			visibility=visibility,
			owner=self.owner,
		)
		RoomMembership.objects.create(room=room, user=self.owner, role=RoomMembership.Role.OWNER)
		return room

	def test_create_room_as_authenticated_user(self):
		self.client.force_login(self.member)
		response = self.client.post(
			'/api/rooms/create/',
			{'name': 'Feature Room', 'description': 'Feature', 'visibility': 'public'},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		room = Room.objects.get(id=response.data['id'])
		self.assertEqual(room.owner_id, self.member.id)
		self.assertTrue(RoomMembership.objects.filter(room=room, user=self.member, role='owner').exists())

	def test_unique_room_name_enforced_case_insensitive(self):
		self._create_room(name='General')
		self.client.force_login(self.member)
		response = self.client.post(
			'/api/rooms/create/',
			{'name': 'general', 'description': '', 'visibility': 'public'},
			format='json',
		)
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_public_catalog_visibility_and_search(self):
		self._create_room(name='Python Club', visibility=Room.Visibility.PUBLIC)
		self._create_room(name='Private Club', visibility=Room.Visibility.PRIVATE)
		self.client.force_login(self.member)

		response_all = self.client.get('/api/rooms/')
		self.assertEqual(response_all.status_code, status.HTTP_200_OK)
		names = {room['name'] for room in response_all.data}
		self.assertIn('Python Club', names)
		self.assertNotIn('Private Club', names)

		response_search = self.client.get('/api/rooms/?search=python')
		self.assertEqual(response_search.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response_search.data), 1)
		self.assertEqual(response_search.data[0]['name'], 'Python Club')

	def test_join_public_room_and_banned_user_cannot_join(self):
		room = self._create_room(name='Joinable', visibility=Room.Visibility.PUBLIC)
		RoomBan.objects.create(room=room, banned_user=self.other, banned_by=self.owner, reason='ban')

		self.client.force_login(self.member)
		join_ok = self.client.post(f'/api/rooms/{room.id}/join/')
		self.assertEqual(join_ok.status_code, status.HTTP_200_OK)
		self.assertTrue(RoomMembership.objects.filter(room=room, user=self.member).exists())

		self.client.force_login(self.other)
		join_forbidden = self.client.post(f'/api/rooms/{room.id}/join/')
		self.assertEqual(join_forbidden.status_code, status.HTTP_403_FORBIDDEN)

	def test_private_room_join_blocked_without_invitation(self):
		room = self._create_room(name='Secret', visibility=Room.Visibility.PRIVATE)
		self.client.force_login(self.member)
		response = self.client.post(f'/api/rooms/{room.id}/join/')
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_private_room_invitation_grants_access(self):
		room = self._create_room(name='Invite Only', visibility=Room.Visibility.PRIVATE)
		self.client.force_login(self.owner)

		invite_response = self.client.post(
			f'/api/rooms/{room.id}/invite/',
			{'username': self.member.username},
			format='json',
		)
		self.assertEqual(invite_response.status_code, status.HTTP_200_OK)
		self.assertTrue(RoomMembership.objects.filter(room=room, user=self.member).exists())

		self.client.force_login(self.member)
		detail_response = self.client.get(f'/api/rooms/{room.id}/')
		self.assertEqual(detail_response.status_code, status.HTTP_200_OK)

	def test_leave_room_and_owner_cannot_leave(self):
		room = self._create_room(name='Leave Test')
		RoomMembership.objects.create(room=room, user=self.member, role=RoomMembership.Role.MEMBER)

		self.client.force_login(self.member)
		leave_member = self.client.post(f'/api/rooms/{room.id}/leave/')
		self.assertEqual(leave_member.status_code, status.HTTP_200_OK)
		self.assertFalse(RoomMembership.objects.filter(room=room, user=self.member).exists())

		self.client.force_login(self.owner)
		leave_owner = self.client.post(f'/api/rooms/{room.id}/leave/')
		self.assertEqual(leave_owner.status_code, status.HTTP_400_BAD_REQUEST)

	def test_owner_can_delete_room_and_delete_messages_and_files_permanently(self):
		room = self._create_room(name='Delete Test')
		message = Message.objects.create(room=room, user=self.owner, content='with file')
		attachment = MessageAttachment.objects.create(
			message=message,
			file=SimpleUploadedFile('note.txt', b'hello-room'),
			original_name='note.txt',
		)
		stored_name = attachment.file.name
		self.assertTrue(default_storage.exists(stored_name))

		self.client.force_login(self.owner)
		delete_response = self.client.delete(f'/api/rooms/{room.id}/')
		self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

		self.assertFalse(Room.objects.filter(id=room.id).exists())
		self.assertFalse(Message.objects.filter(id=message.id).exists())
		self.assertFalse(MessageAttachment.objects.filter(id=attachment.id).exists())
		self.assertFalse(default_storage.exists(stored_name))

	def test_admin_can_moderate_and_remove_member_treated_as_ban(self):
		room = self._create_room(name='Mod Test')
		RoomMembership.objects.create(room=room, user=self.admin, role=RoomMembership.Role.ADMIN)
		RoomMembership.objects.create(room=room, user=self.member, role=RoomMembership.Role.MEMBER)
		message = Message.objects.create(room=room, user=self.member, content='msg')

		self.client.force_login(self.admin)
		delete_response = self.client.delete(f'/api/rooms/room-messages/{message.id}/moderation-delete/')
		self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

		remove_response = self.client.delete(f'/api/rooms/{room.id}/members/{self.member.id}/')
		self.assertEqual(remove_response.status_code, status.HTTP_200_OK)
		self.assertFalse(RoomMembership.objects.filter(room=room, user=self.member).exists())
		self.assertTrue(RoomBan.objects.filter(room=room, banned_user=self.member).exists())

	def test_banned_list_contains_banned_by_metadata_and_unban_allows_rejoin(self):
		room = self._create_room(name='Ban List')
		RoomMembership.objects.create(room=room, user=self.admin, role=RoomMembership.Role.ADMIN)
		RoomMembership.objects.create(room=room, user=self.member, role=RoomMembership.Role.MEMBER)

		self.client.force_login(self.admin)
		ban_response = self.client.post(f'/api/rooms/{room.id}/ban/{self.member.id}/', {'reason': 'rule'}, format='json')
		self.assertEqual(ban_response.status_code, status.HTTP_201_CREATED)

		list_response = self.client.get(f'/api/rooms/{room.id}/bans/')
		self.assertEqual(list_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(list_response.data), 1)
		self.assertEqual(list_response.data[0]['banned_by_username'], self.admin.username)

		unban_response = self.client.delete(f'/api/rooms/{room.id}/bans/{self.member.id}/')
		self.assertEqual(unban_response.status_code, status.HTTP_204_NO_CONTENT)

		self.client.force_login(self.member)
		join_response = self.client.post(f'/api/rooms/{room.id}/join/')
		self.assertEqual(join_response.status_code, status.HTTP_200_OK)

	def test_admin_can_demote_other_admin_but_not_owner_or_promote_member(self):
		room = self._create_room(name='Admin Rules')
		other_admin = User.objects.create_user(username='admin3', email='admin3@example.com', password='pass12345')
		plain_member = User.objects.create_user(username='member3', email='member3@example.com', password='pass12345')
		RoomMembership.objects.create(room=room, user=self.admin, role=RoomMembership.Role.ADMIN)
		RoomMembership.objects.create(room=room, user=other_admin, role=RoomMembership.Role.ADMIN)
		RoomMembership.objects.create(room=room, user=plain_member, role=RoomMembership.Role.MEMBER)

		self.client.force_login(self.admin)
		demote_admin = self.client.patch(
			f'/api/rooms/{room.id}/members/{other_admin.id}/role/',
			{'role': 'member'},
			format='json',
		)
		self.assertEqual(demote_admin.status_code, status.HTTP_200_OK)

		demote_owner = self.client.patch(
			f'/api/rooms/{room.id}/members/{self.owner.id}/role/',
			{'role': 'member'},
			format='json',
		)
		self.assertEqual(demote_owner.status_code, status.HTTP_400_BAD_REQUEST)

		promote_member = self.client.patch(
			f'/api/rooms/{room.id}/members/{plain_member.id}/role/',
			{'role': 'admin'},
			format='json',
		)
		self.assertEqual(promote_member.status_code, status.HTTP_403_FORBIDDEN)

	def test_removed_user_loses_room_message_and_attachment_access_but_files_remain_until_room_deleted(self):
		room = self._create_room(name='Access Test')
		RoomMembership.objects.create(room=room, user=self.admin, role=RoomMembership.Role.ADMIN)
		RoomMembership.objects.create(room=room, user=self.member, role=RoomMembership.Role.MEMBER)

		message = Message.objects.create(room=room, user=self.owner, content='with attachment')
		attachment = MessageAttachment.objects.create(
			message=message,
			file=SimpleUploadedFile('access.txt', b'access'),
			original_name='access.txt',
		)
		stored_name = attachment.file.name
		self.assertTrue(default_storage.exists(stored_name))

		self.client.force_login(self.admin)
		remove_response = self.client.delete(f'/api/rooms/{room.id}/members/{self.member.id}/')
		self.assertEqual(remove_response.status_code, status.HTTP_200_OK)

		self.client.force_login(self.member)
		messages_response = self.client.get(f'/api/rooms/{room.id}/messages/')
		self.assertEqual(messages_response.status_code, status.HTTP_403_FORBIDDEN)

		download_response = self.client.get(f'/api/rooms/attachments/{attachment.id}/download/')
		self.assertEqual(download_response.status_code, status.HTTP_403_FORBIDDEN)

		self.assertTrue(default_storage.exists(stored_name))
