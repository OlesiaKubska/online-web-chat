import shutil
import tempfile
import os

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from rooms.models import Message, MessageAttachment, Room, RoomMembership


class ChangePasswordViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alice',
            email='alice@example.com',
            password='old-password-123',
        )
        self.url = '/api/auth/change-password/'

    def test_requires_authentication(self):
        response = self.client.post(
            self.url,
            {'old_password': 'old-password-123', 'new_password': 'new-password-123'},
            format='json',
        )

        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_changes_password_and_keeps_session_active(self):
        self.client.force_login(self.user)

        response = self.client.post(
            self.url,
            {'old_password': 'old-password-123', 'new_password': 'new-password-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Password changed successfully')

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('new-password-123'))

        me_response = self.client.get('/api/auth/me/')
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)

    def test_rejects_incorrect_old_password(self):
        self.client.force_login(self.user)

        response = self.client.post(
            self.url,
            {'old_password': 'wrong-password', 'new_password': 'new-password-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['old_password'][0], 'Old password is incorrect.')


class LoginAndRegistrationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alice',
            email='alice@example.com',
            password='old-password-123',
        )

    def test_login_with_email_and_password(self):
        response = self.client.post(
            '/api/auth/login/',
            {'email': 'alice@example.com', 'password': 'old-password-123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], 'alice@example.com')

    def test_registration_rejects_duplicate_email_case_insensitive(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'email': 'ALICE@EXAMPLE.COM',
                'username': 'alice-two',
                'password': 'new-password-123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['email'][0], 'A user with this email already exists.')


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alice',
            email='alice@example.com',
            password='old-password-123',
        )

    def test_password_reset_request_returns_token_payload_in_debug(self):
        with override_settings(DEBUG=True):
            response = self.client.post(
                '/api/auth/password-reset/request/',
                {'email': 'alice@example.com'},
                format='json',
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reset', response.data)
        self.assertIn('uid', response.data['reset'])
        self.assertIn('token', response.data['reset'])

    def test_password_reset_confirm_changes_password(self):
        with override_settings(DEBUG=True):
            request_response = self.client.post(
                '/api/auth/password-reset/request/',
                {'email': 'alice@example.com'},
                format='json',
            )

        reset_data = request_response.data['reset']

        confirm_response = self.client.post(
            '/api/auth/password-reset/confirm/',
            {
                'uid': reset_data['uid'],
                'token': reset_data['token'],
                'new_password': 'new-password-123',
            },
            format='json',
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)

        login_response = self.client.post(
            '/api/auth/login/',
            {'email': 'alice@example.com', 'password': 'new-password-123'},
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)


class DeleteAccountTests(APITestCase):
    def setUp(self):
        self.media_dir = tempfile.mkdtemp()

        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='owner-pass-123',
        )
        self.other_owner = User.objects.create_user(
            username='other-owner',
            email='other-owner@example.com',
            password='other-pass-123',
        )

        self.owned_room = Room.objects.create(
            name='owned-room',
            owner=self.owner,
            visibility=Room.Visibility.PUBLIC,
        )
        RoomMembership.objects.create(
            room=self.owned_room,
            user=self.owner,
            role=RoomMembership.Role.OWNER,
        )

        self.other_room = Room.objects.create(
            name='other-room',
            owner=self.other_owner,
            visibility=Room.Visibility.PUBLIC,
        )
        RoomMembership.objects.create(
            room=self.other_room,
            user=self.other_owner,
            role=RoomMembership.Role.OWNER,
        )
        RoomMembership.objects.create(
            room=self.other_room,
            user=self.owner,
            role=RoomMembership.Role.MEMBER,
        )

    def tearDown(self):
        shutil.rmtree(self.media_dir, ignore_errors=True)

    def test_delete_account_removes_user_owned_rooms_and_memberships(self):
        with override_settings(MEDIA_ROOT=self.media_dir):
            message = Message.objects.create(
                room=self.owned_room,
                user=self.owner,
                content='Owner message',
            )

            uploaded_file = SimpleUploadedFile('proof.txt', b'hello world', content_type='text/plain')
            attachment = MessageAttachment.objects.create(
                message=message,
                file=uploaded_file,
                original_name='proof.txt',
                comment='test file',
            )
            file_path = attachment.file.path

            self.client.force_login(self.owner)
            response = self.client.post(
                '/api/auth/delete-account/',
                {'current_password': 'owner-pass-123'},
                format='json',
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=self.owner.id).exists())

        self.assertFalse(Room.objects.filter(id=self.owned_room.id).exists())
        self.assertTrue(Room.objects.filter(id=self.other_room.id).exists())

        self.assertFalse(RoomMembership.objects.filter(room=self.other_room, user_id=self.owner.id).exists())
        self.assertFalse(Message.objects.filter(room_id=self.owned_room.id).exists())
        self.assertFalse(MessageAttachment.objects.filter(id=attachment.id).exists())
        self.assertFalse(os.path.exists(file_path))

        me_response = self.client.get('/api/auth/me/')
        self.assertEqual(me_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_account_rejects_wrong_password(self):
        self.client.force_login(self.owner)
        response = self.client.post(
            '/api/auth/delete-account/',
            {'current_password': 'wrong-pass'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=self.owner.id).exists())
