import logging
import bcrypt
import jwt
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.redis import get_redis
from app.models import Operator, SecurityEvent
from app.core.auth import create_access_token, get_current_operator, oauth2_scheme, _JWT_ALGORITHM
from app.api.v1.schemas import OperatorLoginResponse

logger = logging.getLogger("aura.operator")
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "viewer"


# ── Register ─────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register_operator(
    body: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Self-registration endpoint for new operators / hackathon judges.
    Creates a new operator account with the 'viewer' role by default.
    Usernames must be unique. Role cannot be self-elevated above 'analyst'.
    """
    if len(body.username.strip()) < 3:
        raise HTTPException(status_code=422, detail="Username must be at least 3 characters.")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    # Only allow safe roles — never self-elevate to admin
    allowed_roles = {"viewer", "analyst"}
    role = body.role if body.role in allowed_roles else "viewer"

    existing = db.query(Operator).filter(Operator.username == body.username.strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken. Please choose a different username.")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt(rounds=12)).decode()
    new_op = Operator(username=body.username.strip(), password_hash=hashed, role=role)
    db.add(new_op)
    db.commit()
    db.refresh(new_op)
    logger.info(f"New operator registered: {new_op.username} (role={role})")
    return {"id": new_op.id, "username": new_op.username, "role": new_op.role}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=OperatorLoginResponse)
async def login_operator(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else "unknown"

    # 1. Rate Limiting via Redis
    try:
        redis = get_redis()
        rate_key = f"rate_limit:login:{ip_address}:{form_data.username}"
        current_count = redis.incr(rate_key)
        if current_count == 1:
            redis.expire(rate_key, settings.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS)

        if current_count > settings.AUTH_LOGIN_RATE_LIMIT_REQUESTS:
            logger.warning(f"Login rate limit exceeded for IP {ip_address}")
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later.",
                headers={"Retry-After": str(settings.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS)}
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Redis failure during login rate limiting: {e}")
        if settings.ENV == "development":
            logger.warning("Redis is offline. Bypassing login rate limiter in development environment.")
        else:
            raise HTTPException(status_code=503, detail="Service unavailable")

    operator = db.query(Operator).filter(Operator.username == form_data.username).first()
    if not operator or not bcrypt.checkpw(form_data.password.encode(), operator.password_hash.encode()):
        evt = SecurityEvent(
            actor_id=form_data.username,
            event_type="login",
            status="failure",
            ip_address=ip_address,
            details="Invalid credentials"
        )
        db.add(evt)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    evt = SecurityEvent(actor_id=operator.username, event_type="login", status="success", ip_address=ip_address)
    db.add(evt)
    db.commit()

    access_token = create_access_token(data={"sub": operator.username})
    return OperatorLoginResponse(access_token=access_token, role=operator.role)


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout_operator(
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_operator: Operator = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    ip_address = request.client.host if request.client else "unknown"
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[_JWT_ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            import time
            ttl = exp - int(time.time())
            if ttl > 0:
                redis = get_redis()
                redis.setex(f"revoked_jwt:{jti}", ttl, "revoked")
    except Exception as e:
        logger.error(f"Error during logout: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

    evt = SecurityEvent(actor_id=current_operator.username, event_type="logout", status="success", ip_address=ip_address)
    db.add(evt)
    db.commit()

    return {"status": "ok", "message": "Logged out successfully"}


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me")
async def get_operator_me(current_operator: Operator = Depends(get_current_operator)):
    return {
        "id": current_operator.id,
        "username": current_operator.username,
        "role": current_operator.role
    }
