from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = hash_password("Sup3rSecret!")
    assert hashed != "Sup3rSecret!"
    assert verify_password("Sup3rSecret!", hashed)
    assert not verify_password("WrongPassword", hashed)


def test_access_token_contains_role_and_subject():
    token = create_access_token(user_id="42", role="engineer")
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "engineer"
    assert payload["type"] == "access"


def test_refresh_token_type_differs_from_access():
    refresh = create_refresh_token(user_id="42")
    payload = decode_token(refresh)
    assert payload["type"] == "refresh"
