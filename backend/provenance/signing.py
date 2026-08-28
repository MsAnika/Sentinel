import base64
import hmac
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.asymmetric import ed25519


class ProvenanceSigner:
    def __init__(self, private_key: Optional[ed25519.Ed25519PrivateKey] = None):
        self._private_key = private_key or ed25519.Ed25519PrivateKey.generate()
        self._public_key = self._private_key.public_key()
        self._hmac_secret = b"INTELX_DEFENCE_AIRGAP_SECRET_KEY_2026"

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

    def generate_hmac(self, data_str: str) -> str:
        h = hmac.new(self._hmac_secret, data_str.encode("utf-8"), hashlib.sha256)
        return h.hexdigest()
