from app.core.security import (
    create_csrf_token,
    create_session_token,
    csrf_tokens_match,
    get_password_hash,
    hash_session_token,
    verify_password,
)


def test_password_hash_roundtrip():
    hashed = get_password_hash("s3cret")

    assert hashed != "s3cret"
    valid, _ = verify_password("s3cret", hashed)
    assert valid


def test_verify_password_rejects_wrong_password():
    hashed = get_password_hash("s3cret")

    valid, _ = verify_password("wrong", hashed)
    assert not valid


def test_session_tokens_are_unique():
    assert create_session_token() != create_session_token()


def test_hash_session_token_is_deterministic_sha256():
    token = create_session_token()

    assert hash_session_token(token) == hash_session_token(token)
    assert len(hash_session_token(token)) == 64


def test_csrf_tokens_match():
    token = create_csrf_token()

    assert csrf_tokens_match(token, token)
    assert not csrf_tokens_match(token, create_csrf_token())
