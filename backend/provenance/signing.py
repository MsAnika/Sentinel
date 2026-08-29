import base64
import os
from typing import Optional
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

DEFAULT_KEY_PATH = os.environ.get("VIGILCV_SIGNING_KEY_PATH", "keys/provenance_signing_key.pem")


class ProvenanceSigner:
    """Signs/verifies provenance hashes with Ed25519. The private key is
    persisted to disk (not regenerated per process): a freshly-generated,
    never-saved key would make every previously-issued signature
    unverifiable the moment the service restarts, which defeats the point
    of a long-lived tamper-evident provenance chain."""

    def __init__(self, private_key: Optional[ed25519.Ed25519PrivateKey] = None, key_path: str = DEFAULT_KEY_PATH):
        self._key_path = key_path
        self._private_key = private_key or self._load_or_create_key(key_path)
        self._public_key = self._private_key.public_key()

    @staticmethod
    def _load_or_create_key(key_path: str) -> ed25519.Ed25519PrivateKey:
        if os.path.exists(key_path):
            with open(key_path, "rb") as f:
                return serialization.load_pem_private_key(f.read(), password=None)

        key = ed25519.Ed25519PrivateKey.generate()
        key_dir = os.path.dirname(key_path)
        if key_dir:
            os.makedirs(key_dir, exist_ok=True)
        pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        try:
            fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            # Another process won the race to create it first; use theirs.
            with open(key_path, "rb") as f:
                return serialization.load_pem_private_key(f.read(), password=None)
        with os.fdopen(fd, "wb") as f:
            f.write(pem)
        return key

    @property
    def public_key_bytes(self) -> bytes:
        return self._public_key.public_bytes_raw()

    @property
    def public_key_hex(self) -> str:
        return self._public_key.public_bytes_raw().hex()

    def sign_provenance_hash(self, provenance_hash: str) -> str:
        sig_bytes = self._private_key.sign(provenance_hash.encode("utf-8"))
        return base64.b64encode(sig_bytes).decode("utf-8")

    def verify_signature(self, provenance_hash: str, signature_b64: str) -> bool:
        try:
            sig_bytes = base64.b64decode(signature_b64.encode("utf-8"))
            self._public_key.verify(sig_bytes, provenance_hash.encode("utf-8"))
            return True
        except Exception:
            return False
