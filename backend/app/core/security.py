import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union
import jwt
from passlib.context import CryptContext
from app.core.config import settings

# CryptContext configured with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the hashed version."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback for plain bcrypt if passlib has environment issues
        import bcrypt
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for a password."""
    try:
        return pwd_context.hash(password)
    except Exception:
        import bcrypt
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    digits = string.digits
    return "".join(random.choice(digits) for _ in range(length))
