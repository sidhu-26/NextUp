"""Unit and integration tests for authentication endpoints."""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse

User = get_user_model()


class AuthenticationApiTests(TestCase):
    """Test suite covering the complete authentication workflow."""

    def setUp(self):
        """Prepare user fixtures and clear throttle cache."""
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)

        # Owner user
        self.owner_username = "owner_test"
        self.owner_email = "owner@example.com"
        self.owner_password = "SecurePassword123!"

        self.owner = User.objects.create_user(
            username=self.owner_username,
            email=self.owner_email,
            password=self.owner_password,
            is_staff=True,
        )

        # Non-owner user
        self.non_owner_username = "other_user"
        self.non_owner_email = "other@example.com"
        self.non_owner_password = "OtherPassword123!"

        self.non_owner = User.objects.create_user(
            username=self.non_owner_username,
            email=self.non_owner_email,
            password=self.non_owner_password,
            is_staff=False,
        )

        # Inactive user
        self.inactive_username = "inactive_owner"
        self.inactive_email = "inactive@example.com"
        self.inactive_password = "InactivePassword123!"

        self.inactive_user = User.objects.create_user(
            username=self.inactive_username,
            email=self.inactive_email,
            password=self.inactive_password,
            is_active=False,
        )

        self.csrf_url = reverse("auth-csrf")
        self.login_url = reverse("auth-login")
        self.logout_url = reverse("auth-logout")
        self.me_url = reverse("auth-me")

    def _get_csrf_token(self) -> str:
        """Helper to initialize and obtain valid CSRF token."""
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("csrftoken", response.cookies)
        return response.cookies["csrftoken"].value

    # 1. Valid owner login
    def test_valid_owner_login(self):
        """Valid owner credentials return 200 and establish session."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            response = self.client.post(
                self.login_url,
                data={"username": self.owner_username, "password": self.owner_password},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )

            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["username"], self.owner_username)
            self.assertEqual(data["email"], self.owner_email)
            self.assertEqual(data["id"], str(self.owner.id))
            self.assertTrue(data["is_authenticated"])
            # Ensure sensitive attributes are never exposed
            self.assertNotIn("password", data)
            self.assertNotIn("session_key", data)
            self.assertNotIn("secret", data)
            # Ensure session cookie is present
            self.assertIn(
                self.client.session.session_key, response.cookies.get("sessionid").value
            )

    # 2. Invalid password
    def test_invalid_password(self):
        """Invalid password returns generic 401 error."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            response = self.client.post(
                self.login_url,
                data={"username": self.owner_username, "password": "WrongPassword!"},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["detail"], "Invalid credentials provided.")

    # 3. Unknown username
    def test_unknown_username(self):
        """Non-existent username returns identical generic 401 error (no user enumeration)."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            response = self.client.post(
                self.login_url,
                data={"username": "unknown_user", "password": "AnyPassword123!"},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["detail"], "Invalid credentials provided.")

    # 4. Inactive account
    def test_inactive_account(self):
        """Disabled account returns generic 401 error."""
        with self.settings(OWNER_USERNAME=self.inactive_username):
            csrf_token = self._get_csrf_token()
            response = self.client.post(
                self.login_url,
                data={
                    "username": self.inactive_username,
                    "password": self.inactive_password,
                },
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["detail"], "Invalid credentials provided.")

    # 5. Non-owner account rejection
    def test_non_owner_rejection(self):
        """Valid credentials for non-owner account are rejected with 401."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            response = self.client.post(
                self.login_url,
                data={
                    "username": self.non_owner_username,
                    "password": self.non_owner_password,
                },
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["detail"], "Invalid credentials provided.")

    # 6. Missing CSRF token
    def test_missing_csrf_token(self):
        """Unsafe POST request without CSRF token is rejected with 403."""
        self._get_csrf_token()  # sets cookie, but we send no HTTP_X_CSRFTOKEN header
        response = self.client.post(
            self.login_url,
            data={"username": self.owner_username, "password": self.owner_password},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    # 7. Invalid CSRF token
    def test_invalid_csrf_token(self):
        """Unsafe POST request with invalid CSRF token is rejected with 403."""
        self._get_csrf_token()
        response = self.client.post(
            self.login_url,
            data={"username": self.owner_username, "password": self.owner_password},
            content_type="application/json",
            HTTP_X_CSRFTOKEN="invalid-csrf-token-xyz",
        )
        self.assertEqual(response.status_code, 403)

    # 8. Session establishment
    def test_session_establishment(self):
        """Session is saved in session engine and persists across subsequent client requests."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            self.client.post(
                self.login_url,
                data={"username": self.owner_username, "password": self.owner_password},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertTrue(self.client.session.exists(self.client.session.session_key))

    # 9. Session rotation
    def test_session_rotation(self):
        """Session key rotates upon successful login to prevent session fixation attacks."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            # Force pre-existing anonymous session
            session = self.client.session
            session["pre_login_marker"] = "pre_auth"
            session.save()
            initial_session_key = session.session_key

            response = self.client.post(
                self.login_url,
                data={"username": self.owner_username, "password": self.owner_password},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(response.status_code, 200)
            new_session_key = self.client.session.session_key
            self.assertNotEqual(initial_session_key, new_session_key)

    # 10. Authenticated /me/
    def test_authenticated_me(self):
        """Authenticated session accesses /me/ returning minimal profile."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            self.client.post(
                self.login_url,
                data={"username": self.owner_username, "password": self.owner_password},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )

            me_response = self.client.get(self.me_url)
            self.assertEqual(me_response.status_code, 200)
            data = me_response.json()
            self.assertEqual(data["username"], self.owner_username)
            self.assertEqual(data["email"], self.owner_email)
            self.assertEqual(data["id"], str(self.owner.id))
            self.assertTrue(data["is_authenticated"])

    # 11. Unauthenticated /me/
    def test_unauthenticated_me(self):
        """Unauthenticated request to /me/ returns 401."""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)

    # 12. Successful logout
    def test_successful_logout(self):
        """Logout endpoint requires POST and CSRF, invalidating session."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            login_resp = self.client.post(
                self.login_url,
                data={"username": self.owner_username, "password": self.owner_password},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(login_resp.status_code, 200)
            # Use current CSRF token from client cookie after session cycle
            post_login_csrf = self.client.cookies["csrftoken"].value

            # Logout GET request fails (must require POST)
            get_logout_response = self.client.get(self.logout_url)
            self.assertEqual(get_logout_response.status_code, 405)

            # Valid logout POST
            logout_response = self.client.post(
                self.logout_url,
                content_type="application/json",
                HTTP_X_CSRFTOKEN=post_login_csrf,
            )
            self.assertEqual(logout_response.status_code, 200)
            self.assertEqual(
                logout_response.json()["detail"], "Successfully logged out."
            )

    # 13. Session invalidation
    def test_session_invalidation_after_logout(self):
        """After logout, subsequent requests to /me/ return 401."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            self.client.post(
                self.login_url,
                data={"username": self.owner_username, "password": self.owner_password},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            post_login_csrf = self.client.cookies["csrftoken"].value

            # Confirm authenticated
            self.assertEqual(self.client.get(self.me_url).status_code, 200)

            # Invalidate
            self.client.post(
                self.logout_url,
                content_type="application/json",
                HTTP_X_CSRFTOKEN=post_login_csrf,
            )

            # Confirm unauthenticated
            self.assertEqual(self.client.get(self.me_url).status_code, 401)

    # 14. Login rate limiting
    def test_login_rate_limiting(self):
        """Login rate throttle triggers HTTP 429 when threshold exceeded."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            # 5 requests allowed per minute in settings
            for _ in range(5):
                response = self.client.post(
                    self.login_url,
                    data={"username": "wrong", "password": "wrong"},
                    content_type="application/json",
                    HTTP_X_CSRFTOKEN=csrf_token,
                )
                self.assertEqual(response.status_code, 401)

            # 6th request triggers rate limit 429
            throttled_response = self.client.post(
                self.login_url,
                data={"username": "wrong", "password": "wrong"},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(throttled_response.status_code, 429)

    # 15. No public registration
    def test_no_public_registration(self):
        """Ensure no public registration endpoint exists."""
        register_url = "/api/v1/auth/register/"
        response = self.client.post(register_url, data={})
        self.assertEqual(response.status_code, 404)

    # 16. Safe error responses
    def test_safe_error_responses(self):
        """Error responses do not leak tracebacks, internal database errors, or server details."""
        with self.settings(OWNER_USERNAME=self.owner_username):
            csrf_token = self._get_csrf_token()
            response = self.client.post(
                self.login_url,
                data={"username": "invalid", "password": "bad"},
                content_type="application/json",
                HTTP_X_CSRFTOKEN=csrf_token,
            )
            self.assertEqual(response.status_code, 401)
            data = response.json()
            self.assertIn("detail", data)
            self.assertNotIn("traceback", str(data).lower())
            self.assertNotIn("exception", str(data).lower())
            self.assertNotIn("syntaxerror", str(data).lower())
            self.assertNotIn("postgres", str(data).lower())
            self.assertNotIn("sqlite", str(data).lower())
