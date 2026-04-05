from urllib.parse import quote

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

    def test_join_public_room_rejects_when_capacity_is_reached(self):
        room = self._create_room(name='Capacity Full', visibility=Room.Visibility.PUBLIC)
        filler_users = [
            User(username=f'capacity-{index}', email=f'capacity-{index}@example.com', password='!')
            for index in range(999)
        ]
        User.objects.bulk_create(filler_users)
        persisted_fillers = list(User.objects.filter(username__startswith='capacity-'))
        RoomMembership.objects.bulk_create(
            [
                RoomMembership(room=room, user=user, role=RoomMembership.Role.MEMBER)
                for user in persisted_fillers
            ]
        )

        self.assertEqual(RoomMembership.objects.filter(room=room).count(), 1000)

        self.client.force_login(self.other)
        join_response = self.client.post(f'/api/rooms/{room.id}/join/')

        self.assertEqual(join_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            join_response.data['detail'],
            'Room has reached the maximum of 1000 participants.',
        )

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

    def test_removed_member_cannot_edit_or_delete_old_messages(self):
        room = self._create_room(name='History Protection')
        RoomMembership.objects.create(room=room, user=self.admin, role=RoomMembership.Role.ADMIN)
        RoomMembership.objects.create(room=room, user=self.member, role=RoomMembership.Role.MEMBER)
        message = Message.objects.create(room=room, user=self.member, content='before removal')

        self.client.force_login(self.admin)
        remove_response = self.client.delete(f'/api/rooms/{room.id}/members/{self.member.id}/')
        self.assertEqual(remove_response.status_code, status.HTTP_200_OK)

        self.client.force_login(self.member)
        edit_response = self.client.patch(
            f'/api/rooms/messages/{message.id}/',
            {'content': 'after removal'},
            format='json',
        )
        delete_response = self.client.delete(f'/api/rooms/messages/{message.id}/')

        self.assertEqual(edit_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

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


@override_settings(MEDIA_ROOT='test_media')
class MessagingApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            username='msg-alice',
            email='msg-alice@example.com',
            password='pass12345',
        )
        self.bob = User.objects.create_user(
            username='msg-bob',
            email='msg-bob@example.com',
            password='pass12345',
        )
        self.admin = User.objects.create_user(
            username='msg-admin',
            email='msg-admin@example.com',
            password='pass12345',
        )
        self.charlie = User.objects.create_user(
            username='msg-charlie',
            email='msg-charlie@example.com',
            password='pass12345',
        )

        self.room = Room.objects.create(
            name='Messaging Room',
            description='Messaging tests',
            visibility=Room.Visibility.PUBLIC,
            owner=self.alice,
        )
        RoomMembership.objects.create(room=self.room, user=self.alice, role=RoomMembership.Role.OWNER)
        RoomMembership.objects.create(room=self.room, user=self.bob, role=RoomMembership.Role.MEMBER)
        RoomMembership.objects.create(room=self.room, user=self.admin, role=RoomMembership.Role.ADMIN)

    def test_send_message_supports_multiline_and_emoji(self):
        self.client.force_login(self.alice)
        content = 'Hello\nWorld \U0001F604'
        response = self.client.post(
            f'/api/rooms/{self.room.id}/messages/',
            {'content': content},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['content'], content)

    def test_message_size_limit_3kb_enforced(self):
        self.client.force_login(self.alice)
        over_limit = 'a' * 3073
        response = self.client.post(
            f'/api/rooms/{self.room.id}/messages/',
            {'content': over_limit},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Message content cannot exceed 3 KB.', response.data['content'][0])

    def test_reply_linkage_is_persisted_and_serialized(self):
        self.client.force_login(self.alice)
        original = Message.objects.create(room=self.room, user=self.alice, content='Original')

        reply_response = self.client.post(
            f'/api/rooms/{self.room.id}/messages/',
            {'content': 'Reply', 'reply_to': original.id},
            format='json',
        )
        self.assertEqual(reply_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reply_response.data['reply_to'], original.id)
        self.assertEqual(reply_response.data['reply_to_message']['id'], original.id)

    def test_editing_own_message_sets_edited_flag(self):
        message = Message.objects.create(room=self.room, user=self.alice, content='Before')
        self.client.force_login(self.alice)

        response = self.client.patch(
            f'/api/rooms/messages/{message.id}/',
            {'content': 'After'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        message.refresh_from_db()
        self.assertEqual(message.content, 'After')
        self.assertTrue(message.edited)

    def test_editing_message_forbidden_for_non_author(self):
        message = Message.objects.create(room=self.room, user=self.alice, content='Before')
        self.client.force_login(self.bob)

        response = self.client.patch(
            f'/api/rooms/messages/{message.id}/',
            {'content': 'After'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_by_author_allowed(self):
        message = Message.objects.create(room=self.room, user=self.alice, content='Delete me')
        self.client.force_login(self.alice)

        response = self.client.delete(f'/api/rooms/messages/{message.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Message.objects.filter(id=message.id).exists())

    def test_admin_delete_allowed_only_for_room_chat(self):
        room_message = Message.objects.create(room=self.room, user=self.bob, content='Room msg')
        self.client.force_login(self.admin)

        room_delete = self.client.delete(f'/api/rooms/messages/{room_message.id}/')
        self.assertEqual(room_delete.status_code, status.HTTP_204_NO_CONTENT)

        # Create friendship between alice and bob for direct dialog
        Friendship.objects.create(user1=self.alice, user2=self.bob)
        self.client.force_login(self.alice)
        dialog_create = self.client.post(
            '/api/rooms/dialogs/create-or-get/',
            {'user_id': self.bob.id},
            format='json',
        )
        self.assertIn(dialog_create.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        direct_room_id = dialog_create.data['id']
        direct_message = Message.objects.create(room_id=direct_room_id, user=self.bob, content='Direct msg')

        direct_delete = self.client.delete(f'/api/rooms/messages/{direct_message.id}/')
        self.assertEqual(direct_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_message_ordering_and_pagination_cursor(self):
        # Create 25 messages with small delays to ensure distinct timestamps
        import time
        for index in range(25):
            Message.objects.create(room=self.room, user=self.alice, content=f'msg-{index}')
            if index < 24:
                time.sleep(0.001)

        self.client.force_login(self.alice)
        # First request without cursor should return 20 most recent messages
        first_page = self.client.get(f'/api/rooms/{self.room.id}/messages/')
        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        # Should have pagination support (up to 20 messages per request)
        self.assertLessEqual(len(first_page.data), 20)
        # Most recent messages should be first (msg-24 created most recently)
        self.assertEqual(first_page.data[0]['content'], 'msg-24')
        # Verify chronological ordering (newest first)
        for i in range(1, len(first_page.data)):
            prev_time = first_page.data[i-1]['created_at']
            curr_time = first_page.data[i]['created_at']
            self.assertGreaterEqual(prev_time, curr_time)

    def test_attachment_upload_and_download_for_member(self):
        self.client.force_login(self.alice)
        message = Message.objects.create(room=self.room, user=self.alice, content='With file')

        upload = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {
                'file': SimpleUploadedFile('doc.txt', b'hello-file'),
                'comment': 'file-comment',
            },
        )
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)
        self.assertEqual(upload.data['original_name'], 'doc.txt')
        self.assertEqual(upload.data['comment'], 'file-comment')
        self.assertIn('/api/rooms/attachments/', upload.data['file_url'])
        attachment_id = upload.data['id']

        self.client.force_login(self.bob)
        download = self.client.get(f'/api/rooms/attachments/{attachment_id}/download/')
        self.assertEqual(download.status_code, status.HTTP_200_OK)

    def test_attachment_upload_rejects_file_larger_than_20mb(self):
        self.client.force_login(self.alice)
        message = Message.objects.create(room=self.room, user=self.alice, content='With large file')
        oversized_file = SimpleUploadedFile(
            'large.bin',
            b'a' * ((20 * 1024 * 1024) + 1),
            content_type='application/octet-stream',
        )

        response = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {'file': oversized_file},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Files cannot exceed 20 MB.')

    def test_attachment_upload_rejects_image_larger_than_3mb(self):
        self.client.force_login(self.alice)
        message = Message.objects.create(room=self.room, user=self.alice, content='With large image')
        oversized_image = SimpleUploadedFile(
            'large.png',
            b'\x89PNG\r\n\x1a\n' + (b'a' * ((3 * 1024 * 1024) + 1)),
            content_type='image/png',
        )

        response = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {'file': oversized_image},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Images cannot exceed 3 MB.')

    def test_attachment_upload_is_limited_to_message_author(self):
        message = Message.objects.create(room=self.room, user=self.alice, content='Alice message')
        self.client.force_login(self.bob)

        response = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {'file': SimpleUploadedFile('intrude.txt', b'not-allowed')},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_attachment_upload_image_preserves_metadata(self):
        self.client.force_login(self.alice)
        message = Message.objects.create(room=self.room, user=self.alice, content='With image')

        upload = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {
                'file': SimpleUploadedFile('photo.png', b'\x89PNG\r\n\x1a\n', content_type='image/png'),
                'comment': 'png-image',
            },
        )
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)
        self.assertEqual(upload.data['original_name'], 'photo.png')
        self.assertEqual(upload.data['comment'], 'png-image')

    def test_attachment_download_denied_for_non_member(self):
        self.client.force_login(self.alice)
        message = Message.objects.create(room=self.room, user=self.alice, content='Private file')
        upload = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {'file': SimpleUploadedFile('secret.bin', b'\x00\x01\x02')},
        )
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)

        self.client.force_login(self.charlie)
        download = self.client.get(f"/api/rooms/attachments/{upload.data['id']}/download/")
        self.assertEqual(download.status_code, status.HTTP_403_FORBIDDEN)

    def test_banned_user_cannot_download_attachment_file_remains_stored(self):
        self.client.force_login(self.alice)
        message = Message.objects.create(room=self.room, user=self.alice, content='With restricted file')
        upload = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {
                'file': SimpleUploadedFile('restricted.txt', b'restricted-by-ban'),
                'comment': '',
            },
        )
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)
        attachment = MessageAttachment.objects.get(pk=upload.data['id'])
        stored_name = attachment.file.name
        self.assertTrue(default_storage.exists(stored_name))

        self.client.force_login(self.admin)
        ban = self.client.post(f'/api/rooms/{self.room.id}/ban/{self.bob.id}/', {}, format='json')
        self.assertEqual(ban.status_code, status.HTTP_201_CREATED)

        self.client.force_login(self.bob)
        denied_download = self.client.get(f"/api/rooms/attachments/{attachment.id}/download/")
        self.assertEqual(denied_download.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(default_storage.exists(stored_name))

    def test_personal_chat_participant_can_download_attachment(self):
        Friendship.objects.create(user1=self.alice, user2=self.bob)
        self.client.force_login(self.alice)
        create_dialog = self.client.post(
            '/api/rooms/dialogs/create-or-get/',
            {'user_id': self.bob.id},
            format='json',
        )
        self.assertIn(create_dialog.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        room_id = create_dialog.data['id']

        message = Message.objects.create(room_id=room_id, user=self.alice, content='DM file')
        upload = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {'file': SimpleUploadedFile('dm.pdf', b'%PDF-1.4')},
        )
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)

        self.client.force_login(self.bob)
        download = self.client.get(f"/api/rooms/attachments/{upload.data['id']}/download/")
        self.assertEqual(download.status_code, status.HTTP_200_OK)

    def test_personal_chat_non_participant_cannot_download_attachment(self):
        Friendship.objects.create(user1=self.alice, user2=self.bob)
        self.client.force_login(self.alice)
        create_dialog = self.client.post(
            '/api/rooms/dialogs/create-or-get/',
            {'user_id': self.bob.id},
            format='json',
        )
        self.assertIn(create_dialog.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        room_id = create_dialog.data['id']

        message = Message.objects.create(room_id=room_id, user=self.alice, content='DM hidden file')
        upload = self.client.post(
            f'/api/rooms/room-messages/{message.id}/attachments/',
            {'file': SimpleUploadedFile('dm-secret.txt', b'secret')},
        )
        self.assertEqual(upload.status_code, status.HTTP_201_CREATED)

        self.client.force_login(self.charlie)
        denied_download = self.client.get(f"/api/rooms/attachments/{upload.data['id']}/download/")
        self.assertEqual(denied_download.status_code, status.HTTP_403_FORBIDDEN)

    def test_offline_user_receives_persisted_messages_via_history_fetch(self):
        self.client.force_login(self.alice)
        create = self.client.post(
            f'/api/rooms/{self.room.id}/messages/',
            {'content': 'message while bob offline'},
            format='json',
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)

        self.client.force_login(self.bob)
        history = self.client.get(f'/api/rooms/{self.room.id}/messages/')
        self.assertEqual(history.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['content'] == 'message while bob offline' for item in history.data))


class UnreadIndicatorsApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            username='notify-alice',
            email='notify-alice@example.com',
            password='pass12345',
        )
        self.bob = User.objects.create_user(
            username='notify-bob',
            email='notify-bob@example.com',
            password='pass12345',
        )
        self.charlie = User.objects.create_user(
            username='notify-charlie',
            email='notify-charlie@example.com',
            password='pass12345',
        )

        self.room = Room.objects.create(
            name='notify-room',
            description='notify tests',
            visibility=Room.Visibility.PUBLIC,
            owner=self.alice,
        )
        RoomMembership.objects.create(
            room=self.room,
            user=self.alice,
            role=RoomMembership.Role.OWNER,
        )
        RoomMembership.objects.create(
            room=self.room,
            user=self.bob,
            role=RoomMembership.Role.MEMBER,
        )

    def test_unread_indicator_appears_for_room_message_and_clears_on_open(self):
        Message.objects.create(room=self.room, user=self.alice, content='hello bob')

        self.client.force_login(self.bob)
        before_open = self.client.get('/api/rooms/my/')
        self.assertEqual(before_open.status_code, status.HTTP_200_OK)
        room_item = next(item for item in before_open.data if item['id'] == self.room.id)
        self.assertEqual(room_item['unread_count'], 1)

        open_chat = self.client.get(f'/api/rooms/{self.room.id}/messages/')
        self.assertEqual(open_chat.status_code, status.HTTP_200_OK)

        after_open = self.client.get('/api/rooms/my/')
        self.assertEqual(after_open.status_code, status.HTTP_200_OK)
        room_item_after = next(item for item in after_open.data if item['id'] == self.room.id)
        self.assertEqual(room_item_after['unread_count'], 0)

    def test_unread_is_per_user_and_not_cleared_for_other_participants(self):
        Message.objects.create(room=self.room, user=self.alice, content='hello bob')

        self.client.force_login(self.bob)
        open_chat = self.client.get(f'/api/rooms/{self.room.id}/messages/')
        self.assertEqual(open_chat.status_code, status.HTTP_200_OK)

        self.client.force_login(self.alice)
        my_rooms = self.client.get('/api/rooms/my/')
        self.assertEqual(my_rooms.status_code, status.HTTP_200_OK)
        room_item = next(item for item in my_rooms.data if item['id'] == self.room.id)
        self.assertEqual(room_item['unread_count'], 0)

    def test_unread_indicator_appears_for_personal_dialog_and_clears_only_for_opened_dialog(self):
        Friendship.objects.create(user1=self.alice, user2=self.bob)
        Friendship.objects.create(user1=self.bob, user2=self.charlie)

        self.client.force_login(self.alice)
        first_dialog_resp = self.client.post(
            '/api/rooms/dialogs/create-or-get/',
            {'user_id': self.bob.id},
            format='json',
        )
        self.assertIn(first_dialog_resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        first_dialog_id = first_dialog_resp.data['id']

        self.client.force_login(self.charlie)
        second_dialog_resp = self.client.post(
            '/api/rooms/dialogs/create-or-get/',
            {'user_id': self.bob.id},
            format='json',
        )
        self.assertIn(second_dialog_resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        second_dialog_id = second_dialog_resp.data['id']

        first_dialog = Room.objects.get(pk=first_dialog_id)
        second_dialog = Room.objects.get(pk=second_dialog_id)
        Message.objects.create(room=first_dialog, user=self.alice, content='dm one')
        Message.objects.create(room=second_dialog, user=self.charlie, content='dm two')

        self.client.force_login(self.bob)
        dialogs_before_open = self.client.get('/api/rooms/dialogs/')
        self.assertEqual(dialogs_before_open.status_code, status.HTTP_200_OK)
        first_before = next(item for item in dialogs_before_open.data if item['id'] == first_dialog_id)
        second_before = next(item for item in dialogs_before_open.data if item['id'] == second_dialog_id)
        self.assertEqual(first_before['unread_count'], 1)
        self.assertEqual(second_before['unread_count'], 1)

        open_first = self.client.get(f'/api/rooms/{first_dialog_id}/messages/')
        self.assertEqual(open_first.status_code, status.HTTP_200_OK)

        dialogs_after_open = self.client.get('/api/rooms/dialogs/')
        self.assertEqual(dialogs_after_open.status_code, status.HTTP_200_OK)
        first_after = next(item for item in dialogs_after_open.data if item['id'] == first_dialog_id)
        second_after = next(item for item in dialogs_after_open.data if item['id'] == second_dialog_id)
        self.assertEqual(first_after['unread_count'], 0)
        self.assertEqual(second_after['unread_count'], 1)
