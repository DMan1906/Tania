from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore, db as rtdb
import google.generativeai as genai
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
import string
import random
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============== FIREBASE INITIALIZATION ==============
# Initialize Firebase Admin SDK
firebase_cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', str(ROOT_DIR / 'firebase-credentials.json'))
firebase_database_url = os.environ.get('FIREBASE_DATABASE_URL')

# Check if credentials file exists or use environment variable
if os.path.exists(firebase_cred_path):
    cred = credentials.Certificate(firebase_cred_path)
elif os.environ.get('FIREBASE_CREDENTIALS_JSON'):
    cred_dict = json.loads(os.environ['FIREBASE_CREDENTIALS_JSON'])
    cred = credentials.Certificate(cred_dict)
else:
    raise ValueError("Firebase credentials not found. Please set FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS_JSON")

# Initialize with Realtime Database URL if available
firebase_options = {}
if firebase_database_url:
    firebase_options['databaseURL'] = firebase_database_url

firebase_admin.initialize_app(cred, firebase_options)
db = firestore.client()

# ============== CLOUDINARY SETUP ==============
try:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET')
    )
    CLOUDINARY_AVAILABLE = True
except Exception:
    CLOUDINARY_AVAILABLE = False

# ============== REALTIME DATABASE HELPERS ==============
def broadcast_realtime(path: str, data: dict):
    """Broadcast data to Firebase Realtime Database for real-time sync"""
    try:
        if firebase_database_url:
            ref = rtdb.reference(path)
            ref.set({
                **data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    except Exception as e:
        logger.warning(f"Failed to broadcast to RTDB: {e}")

def broadcast_pair_update(pair_key: str, update_type: str, data: dict):
    """Broadcast update to a pair's realtime channel"""
    broadcast_realtime(f"pairs/{pair_key}/{update_type}", data)

def broadcast_user_update(user_id: str, update_type: str, data: dict):
    """Broadcast update to a user's realtime channel"""
    broadcast_realtime(f"users/{user_id}/{update_type}", data)


# ============== CLOUDINARY HELPERS ==============
def upload_image_file(file_path: str, folder: str = 'candle_app') -> str:
    """Upload a local file to Cloudinary and return the secure URL."""
    if not CLOUDINARY_AVAILABLE:
        raise RuntimeError('Cloudinary SDK not available or not configured')

    result = cloudinary.uploader.upload(file_path, folder=folder, use_filename=True, unique_filename=False)
    return result.get('secure_url')

# ============== GEMINI INITIALIZATION ==============
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# JWT & Password config
JWT_SECRET = os.environ.get('JWT_SECRET', 'candle-app-secret-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

security = HTTPBearer()

# Create the main app and router
app = FastAPI(title="Candle API", description="Couples Connection App API with Firebase")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RelationshipMilestones(BaseModel):
    started_talking: Optional[str] = None  # Date we started talking
    first_met: Optional[str] = None  # Date we actually met
    became_official: Optional[str] = None  # Date we became official
    first_intimate: Optional[str] = None  # First intimate moment
    first_sex: Optional[str] = None  # First time we had sex

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    created_at: str
    milestones: Optional[RelationshipMilestones] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PairingCodeResponse(BaseModel):
    code: str
    expires_at: str

class ConnectRequest(BaseModel):
    code: str

class AnswerCreate(BaseModel):
    question_id: str
    answer_text: str

class ReactionCreate(BaseModel):
    question_id: str
    reaction: str

class QuestionResponse(BaseModel):
    id: str
    text: str
    category: str
    date: str
    user_answer: Optional[str] = None
    user_answered_at: Optional[str] = None
    partner_answer: Optional[str] = None
    partner_answered_at: Optional[str] = None
    both_answered: bool = False
    user_reaction: Optional[str] = None
    partner_reaction: Optional[str] = None

class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_answered_date: Optional[str] = None
    milestones: List[int] = []

# New Feature Models
class TriviaQuestionResponse(BaseModel):
    id: str
    question: str
    options: List[str]
    category: str
    about_user: str

class TriviaAnswerCreate(BaseModel):
    trivia_id: str
    selected_option: str

class TriviaResultResponse(BaseModel):
    id: str
    question: str
    your_guess: str
    correct_answer: str
    is_correct: bool
    points_earned: int

class TriviaScoreResponse(BaseModel):
    user_score: int
    partner_score: int
    total_questions: int
    user_correct: int
    partner_correct: int

class LoveNoteCreate(BaseModel):
    message: str
    emoji: Optional[str] = None

class LoveNoteResponse(BaseModel):
    id: str
    from_user_id: str
    from_user_name: str
    message: str
    emoji: Optional[str] = None
    is_read: bool
    created_at: str

class DateIdeaRequest(BaseModel):
    budget: Optional[str] = "medium"
    mood: Optional[str] = "romantic"
    location_type: Optional[str] = "any"

class DateIdeaResponse(BaseModel):
    id: str
    title: str
    description: str
    budget: str
    mood: str
    location_type: str
    tips: List[str]
    is_favorite: bool = False
    is_completed: bool = False
    created_at: str

class MemoryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    photo_url: Optional[str] = None

class MemoryResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    date: str
    photo_url: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str

class MoodCheckinCreate(BaseModel):
    mood: str
    note: Optional[str] = None

class MoodCheckinResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    mood: str
    note: Optional[str] = None
    date: str
    created_at: str

class TodayMoodResponse(BaseModel):
    user_mood: Optional[MoodCheckinResponse] = None
    partner_mood: Optional[MoodCheckinResponse] = None

class MilestoneUpdate(BaseModel):
    started_talking: Optional[str] = None
    first_met: Optional[str] = None
    became_official: Optional[str] = None
    first_intimate: Optional[str] = None
    first_sex: Optional[str] = None

class MilestoneDisplay(BaseModel):
    name: str
    label: str
    date: Optional[str] = None
    days_since: Optional[int] = None

# ============== LOVE COUPONS MODELS ==============
class LoveCouponCreate(BaseModel):
    title: str
    description: Optional[str] = None
    emoji: Optional[str] = "🎟️"

class LoveCouponResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    emoji: str
    created_by: str
    created_by_name: str
    is_redeemed: bool = False
    redeemed_at: Optional[str] = None
    redeemed_by: Optional[str] = None
    created_at: str

# ============== BUCKET LIST MODELS ==============
class BucketListItemCreate(BaseModel):
    title: str
    category: Optional[str] = "general"
    notes: Optional[str] = None

class BucketListItemResponse(BaseModel):
    id: str
    title: str
    category: str
    notes: Optional[str] = None
    is_completed: bool = False
    completed_at: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str


# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash"""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_data = user_doc.to_dict()
        user_data['id'] = user_doc.id
        # Remove password from response
        user_data.pop('password', None)
        return user_data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== GEMINI HELPER ==============

QUESTION_CATEGORIES = ["emotional", "playful", "gratitude", "dreams", "communication", "spicy", "hypothetical"]

async def generate_with_gemini(prompt: str, system_instruction: str = None) -> str:
    if not GEMINI_API_KEY:
        return None
    
    try:
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction=system_instruction
        )
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return None

async def generate_question_with_gemini(category: str, previous_questions: List[str]) -> str:
    previous_str = "\n".join([f"- {q}" for q in previous_questions[-20:]]) if previous_questions else "None"
    
    prompt = f"""Generate ONE unique relationship question in the "{category}" category.

Category descriptions:
- emotional: Questions about feelings, fears, and emotional needs
- playful: Fun, light-hearted questions that make people laugh
- gratitude: Questions about appreciation and thankfulness  
- dreams: Questions about hopes, goals, and the future together
- communication: Questions about how partners communicate and resolve conflicts
- spicy: Romantic, flirty questions (keep it tasteful)
- hypothetical: "What if" scenarios that reveal values and preferences

Previously asked questions to AVOID repeating:
{previous_str}

Rules:
1. Question must be in the {category} category
2. Must be different from all previous questions
3. Should be open-ended (not yes/no)
4. Should encourage meaningful conversation
5. Keep it between 10-30 words

Return ONLY the question text, nothing else."""

    system_instruction = "You are a relationship expert who creates meaningful, engaging questions for couples and close friends to deepen their connection."
    
    response = await generate_with_gemini(prompt, system_instruction)
    if response and len(response) > 10:
        return response.strip('"').strip("'")
    return get_fallback_question(category)

def get_fallback_question(category: str) -> str:
    fallback_questions = {
        "emotional": [
            "What's something you've never told me that you've been wanting to share?",
            "When was the last time you felt truly understood by me?",
            "What emotion do you find hardest to express, and why?"
        ],
        "playful": [
            "If we could swap lives for a day, what would you do first?",
            "What's the most embarrassing thing you'd be willing to do for a million dollars?",
            "If you could give me any silly superpower, what would it be?"
        ],
        "gratitude": [
            "What's something small I do that makes your day better?",
            "When did you last feel really grateful for our relationship?",
            "What moment together are you most thankful for?"
        ],
        "dreams": [
            "If we had unlimited resources, what adventure would you want us to take?",
            "What's a dream you've never shared with anyone?",
            "Where do you see us in 10 years?"
        ],
        "communication": [
            "How can I better support you when you're stressed?",
            "What's something you wish I understood better about you?",
            "How do you prefer to receive apologies?"
        ],
        "spicy": [
            "What was going through your mind when we first met?",
            "What's your favorite memory of us being spontaneous?",
            "What's something romantic you've always wanted to try together?"
        ],
        "hypothetical": [
            "If we could live anywhere in the world for a year, where would you choose?",
            "If you could relive one day from our relationship, which would it be?",
            "If we wrote a book about us, what would the title be?"
        ]
    }
    questions = fallback_questions.get(category, fallback_questions["emotional"])
    return random.choice(questions)


# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    logger.info(f"Registration attempt for email: {user_data.email}")

    # Check if email exists
    users_ref = db.collection('users')
    existing = users_ref.where(filter=firestore.FieldFilter('email', '==', user_data.email)).limit(1).get()

    existing_list = list(existing)
    logger.info(f"Existing users found: {len(existing_list)}")

    if len(existing_list) > 0:
        logger.warning(f"Email already registered: {user_data.email}")
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    logger.info(f"Creating user with ID: {user_id}")

    user_doc = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "partner_id": None,
        "partner_name": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # Save user to Firestore
    try:
        users_ref.document(user_id).set(user_doc)
        logger.info(f"User document created successfully")
    except Exception as e:
        logger.error(f"Failed to create user document: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

    # Initialize streak
    try:
        db.collection('streaks').document(user_id).set({
            "user_id": user_id,
            "current_streak": 0,
            "longest_streak": 0,
            "last_answered_date": None,
            "milestones_reached": []
        })
        logger.info(f"Streak document created successfully")
    except Exception as e:
        logger.warning(f"Failed to create streak document: {e}")

    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        partner_id=None,
        partner_name=None,
        created_at=user_doc["created_at"],
        milestones=None
    )

    logger.info(f"Registration successful for user: {user_id}")
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials_data: UserLogin):
    users_ref = db.collection('users')
    users = users_ref.where(filter=firestore.FieldFilter('email', '==', credentials_data.email)).limit(1).get()
    
    user_list = list(users)
    if not user_list:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_doc = user_list[0]
    user = user_doc.to_dict()
    
    if not verify_password(credentials_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user_doc.id)
    milestones_data = user.get("milestones")
    user_response = UserResponse(
        id=user_doc.id,
        email=user["email"],
        name=user["name"],
        partner_id=user.get("partner_id"),
        partner_name=user.get("partner_name"),
        created_at=user["created_at"],
        milestones=RelationshipMilestones(**milestones_data) if milestones_data else None
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    milestones_data = current_user.get("milestones")
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        partner_id=current_user.get("partner_id"),
        partner_name=current_user.get("partner_name"),
        created_at=current_user["created_at"],
        milestones=RelationshipMilestones(**milestones_data) if milestones_data else None
    )


# ============== MILESTONES ROUTES ==============

@api_router.put("/milestones", response_model=UserResponse)
async def update_milestones(milestone_data: MilestoneUpdate, current_user: dict = Depends(get_current_user)):
    """Update relationship milestones for the current user"""
    user_ref = db.collection('users').document(current_user["id"])
    
    # Build milestones dict, only including non-None values
    milestones = {}
    if milestone_data.started_talking is not None:
        milestones["started_talking"] = milestone_data.started_talking
    if milestone_data.first_met is not None:
        milestones["first_met"] = milestone_data.first_met
    if milestone_data.became_official is not None:
        milestones["became_official"] = milestone_data.became_official
    if milestone_data.first_intimate is not None:
        milestones["first_intimate"] = milestone_data.first_intimate
    if milestone_data.first_sex is not None:
        milestones["first_sex"] = milestone_data.first_sex
    
    # Merge with existing milestones
    existing_milestones = current_user.get("milestones", {}) or {}
    existing_milestones.update(milestones)
    
    user_ref.update({"milestones": existing_milestones})
    
    # Broadcast real-time update to partner
    partner_id = current_user.get("partner_id")
    if partner_id:
        pair_key = get_pair_key(current_user["id"], partner_id)
        broadcast_pair_update(pair_key, "milestones", {
            "event": "milestones_updated",
            "user_id": current_user["id"],
            "user_name": current_user["name"],
            "milestones": existing_milestones
        })
    
    # Return updated user
    updated_user = user_ref.get().to_dict()
    milestones_data = updated_user.get("milestones")
    
    return UserResponse(
        id=current_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        partner_id=updated_user.get("partner_id"),
        partner_name=updated_user.get("partner_name"),
        created_at=updated_user["created_at"],
        milestones=RelationshipMilestones(**milestones_data) if milestones_data else None
    )

@api_router.get("/milestones", response_model=List[MilestoneDisplay])
async def get_milestones(current_user: dict = Depends(get_current_user)):
    """Get all relationship milestones with days since calculation"""
    milestones = current_user.get("milestones", {}) or {}
    today = datetime.now(timezone.utc).date()
    
    milestone_configs = [
        ("started_talking", "Started Talking"),
        ("first_met", "First Met"),
        ("became_official", "Became Official"),
        ("first_intimate", "First Intimate Moment"),
        ("first_sex", "First Time Together"),
    ]
    
    result = []
    for name, label in milestone_configs:
        date_str = milestones.get(name)
        days_since = None
        
        if date_str:
            try:
                milestone_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                days_since = (today - milestone_date).days
            except ValueError:
                pass
        
        result.append(MilestoneDisplay(
            name=name,
            label=label,
            date=date_str,
            days_since=days_since
        ))
    
    return result


# ============== PAIRING ROUTES ==============

def generate_pairing_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@api_router.post("/pairing/generate", response_model=PairingCodeResponse)
async def generate_code(current_user: dict = Depends(get_current_user)):
    if current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You are already paired with a partner")
    
    # Delete existing codes for this user
    codes_ref = db.collection('pairing_codes')
    existing_codes = codes_ref.where('user_id', '==', current_user["id"]).get()
    for doc in existing_codes:
        doc.reference.delete()
    
    code = generate_pairing_code()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    codes_ref.document(code).set({
        "code": code,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return PairingCodeResponse(code=code, expires_at=expires_at.isoformat())

@api_router.post("/pairing/connect", response_model=UserResponse)
async def connect_with_partner(request: ConnectRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You are already paired with a partner")
    
    code_doc = db.collection('pairing_codes').document(request.code.upper()).get()
    
    if not code_doc.exists:
        raise HTTPException(status_code=404, detail="Invalid pairing code")
    
    pairing = code_doc.to_dict()
    
    if datetime.fromisoformat(pairing["expires_at"]) < datetime.now(timezone.utc):
        code_doc.reference.delete()
        raise HTTPException(status_code=400, detail="Pairing code has expired")
    
    if pairing["user_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot pair with yourself")
    
    partner_id = pairing["user_id"]
    partner_name = pairing["user_name"]
    
    # Update both users
    db.collection('users').document(current_user["id"]).update({
        "partner_id": partner_id,
        "partner_name": partner_name
    })
    db.collection('users').document(partner_id).update({
        "partner_id": current_user["id"],
        "partner_name": current_user["name"]
    })
    
    # Delete the used code
    code_doc.reference.delete()
    
    # Get updated user
    updated_user = db.collection('users').document(current_user["id"]).get().to_dict()
    updated_user['id'] = current_user["id"]
    updated_user.pop('password', None)
    
    return UserResponse(**updated_user)


# ============== QUESTION ROUTES ==============

def get_today_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def get_category_for_date(date_str: str) -> str:
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    day_of_year = date_obj.timetuple().tm_yday
    return QUESTION_CATEGORIES[day_of_year % len(QUESTION_CATEGORIES)]

def get_pair_key(user_id: str, partner_id: str) -> str:
    pair_ids = sorted([user_id, partner_id])
    return f"{pair_ids[0]}_{pair_ids[1]}"

@api_router.get("/questions/today", response_model=QuestionResponse)
async def get_today_question(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    today = get_today_date()
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_key = get_pair_key(user_id, partner_id)
    
    # Check if question exists for today
    questions_ref = db.collection('questions')
    existing = questions_ref.where('date', '==', today).where('pair_key', '==', pair_key).limit(1).get()
    existing_list = list(existing)
    
    if existing_list:
        question_doc = existing_list[0]
        question = question_doc.to_dict()
        question['id'] = question_doc.id
    else:
        # Get previous questions
        previous = questions_ref.where('pair_key', '==', pair_key).order_by('date', direction=firestore.Query.DESCENDING).limit(100).get()
        previous_texts = [q.to_dict().get('text', '') for q in previous]
        
        category = get_category_for_date(today)
        question_text = await generate_question_with_gemini(category, previous_texts)
        
        question_id = str(uuid.uuid4())
        question = {
            "text": question_text,
            "category": category,
            "date": today,
            "pair_key": pair_key,
            "answers": {},
            "reactions": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        questions_ref.document(question_id).set(question)
        question['id'] = question_id
    
    # Build response
    answers = question.get("answers", {})
    reactions = question.get("reactions", {})
    
    user_answer = answers.get(user_id)
    partner_answer = answers.get(partner_id)
    both_answered = bool(user_answer and partner_answer)
    
    return QuestionResponse(
        id=question['id'],
        text=question["text"],
        category=question["category"],
        date=question["date"],
        user_answer=user_answer.get("text") if user_answer else None,
        user_answered_at=user_answer.get("answered_at") if user_answer else None,
        partner_answer=partner_answer.get("text") if both_answered else None,
        partner_answered_at=partner_answer.get("answered_at") if both_answered else None,
        both_answered=both_answered,
        user_reaction=reactions.get(user_id),
        partner_reaction=reactions.get(partner_id) if both_answered else None
    )

@api_router.post("/questions/answer", response_model=QuestionResponse)
async def submit_answer(answer_data: AnswerCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    if len(answer_data.answer_text) > 500:
        raise HTTPException(status_code=400, detail="Answer must be 500 characters or less")
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    
    question_ref = db.collection('questions').document(answer_data.question_id)
    question_doc = question_ref.get()
    
    if not question_doc.exists:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question = question_doc.to_dict()
    
    if question.get("answers", {}).get(user_id):
        raise HTTPException(status_code=400, detail="You have already answered this question")
    
    # Save answer
    answered_at = datetime.now(timezone.utc).isoformat()
    question_ref.update({
        f"answers.{user_id}": {"text": answer_data.answer_text, "answered_at": answered_at}
    })
    
    # Get updated question
    updated_doc = question_ref.get()
    updated_question = updated_doc.to_dict()
    answers = updated_question.get("answers", {})
    both_answered = bool(answers.get(user_id) and answers.get(partner_id))
    
    if both_answered:
        await update_streak(user_id, updated_question["date"])
        await update_streak(partner_id, updated_question["date"])
    
    user_answer = answers.get(user_id)
    partner_answer = answers.get(partner_id)
    reactions = updated_question.get("reactions", {})
    
    # Broadcast real-time update to partner
    pair_key = get_pair_key(user_id, partner_id)
    broadcast_pair_update(pair_key, "questions", {
        "event": "answer_submitted",
        "question_id": answer_data.question_id,
        "user_id": user_id,
        "user_name": current_user["name"],
        "both_answered": both_answered,
        "date": updated_question["date"]
    })
    
    return QuestionResponse(
        id=answer_data.question_id,
        text=updated_question["text"],
        category=updated_question["category"],
        date=updated_question["date"],
        user_answer=user_answer.get("text") if user_answer else None,
        user_answered_at=user_answer.get("answered_at") if user_answer else None,
        partner_answer=partner_answer.get("text") if both_answered else None,
        partner_answered_at=partner_answer.get("answered_at") if both_answered else None,
        both_answered=both_answered,
        user_reaction=reactions.get(user_id),
        partner_reaction=reactions.get(partner_id) if both_answered else None
    )

@api_router.post("/questions/react")
async def add_reaction(reaction_data: ReactionCreate, current_user: dict = Depends(get_current_user)):
    valid_reactions = ["heart", "laugh", "surprised", "cry", "fire"]
    if reaction_data.reaction not in valid_reactions:
        raise HTTPException(status_code=400, detail=f"Reaction must be one of: {valid_reactions}")
    
    user_id = current_user["id"]
    partner_id = current_user.get("partner_id")
    question_ref = db.collection('questions').document(reaction_data.question_id)
    
    if not question_ref.get().exists:
        raise HTTPException(status_code=404, detail="Question not found")
    
    question_ref.update({f"reactions.{user_id}": reaction_data.reaction})
    
    # Broadcast real-time update
    if partner_id:
        pair_key = get_pair_key(user_id, partner_id)
        broadcast_pair_update(pair_key, "questions", {
            "event": "reaction_added",
            "question_id": reaction_data.question_id,
            "user_id": user_id,
            "reaction": reaction_data.reaction
        })
    
    return {"status": "ok"}

@api_router.get("/questions/history", response_model=List[QuestionResponse])
async def get_question_history(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_key = get_pair_key(user_id, partner_id)
    
    questions = db.collection('questions').where('pair_key', '==', pair_key).order_by('date', direction=firestore.Query.DESCENDING).limit(100).get()
    
    result = []
    for q_doc in questions:
        q = q_doc.to_dict()
        answers = q.get("answers", {})
        reactions = q.get("reactions", {})
        user_answer = answers.get(user_id)
        partner_answer = answers.get(partner_id)
        both_answered = bool(user_answer and partner_answer)
        
        result.append(QuestionResponse(
            id=q_doc.id,
            text=q["text"],
            category=q["category"],
            date=q["date"],
            user_answer=user_answer.get("text") if user_answer else None,
            user_answered_at=user_answer.get("answered_at") if user_answer else None,
            partner_answer=partner_answer.get("text") if both_answered else None,
            partner_answered_at=partner_answer.get("answered_at") if both_answered else None,
            both_answered=both_answered,
            user_reaction=reactions.get(user_id),
            partner_reaction=reactions.get(partner_id) if both_answered else None
        ))
    
    return result


# ============== STREAK ROUTES ==============

STREAK_MILESTONES = [7, 14, 30, 60, 100, 365]

async def update_streak(user_id: str, answered_date: str):
    streak_ref = db.collection('streaks').document(user_id)
    streak_doc = streak_ref.get()
    
    if streak_doc.exists:
        streak = streak_doc.to_dict()
    else:
        streak = {
            "user_id": user_id,
            "current_streak": 0,
            "longest_streak": 0,
            "last_answered_date": None,
            "milestones_reached": []
        }
    
    today = datetime.strptime(answered_date, "%Y-%m-%d").date()
    
    if streak.get("last_answered_date"):
        last_date = datetime.strptime(streak["last_answered_date"], "%Y-%m-%d").date()
        diff = (today - last_date).days
        
        if diff == 0:
            return
        elif diff == 1:
            streak["current_streak"] += 1
        else:
            streak["current_streak"] = 1
    else:
        streak["current_streak"] = 1
    
    streak["last_answered_date"] = answered_date
    
    if streak["current_streak"] > streak["longest_streak"]:
        streak["longest_streak"] = streak["current_streak"]
    
    for milestone in STREAK_MILESTONES:
        if streak["current_streak"] >= milestone and milestone not in streak.get("milestones_reached", []):
            if "milestones_reached" not in streak:
                streak["milestones_reached"] = []
            streak["milestones_reached"].append(milestone)
    
    streak_ref.set(streak)

@api_router.get("/streaks", response_model=StreakResponse)
async def get_streak(current_user: dict = Depends(get_current_user)):
    streak_doc = db.collection('streaks').document(current_user["id"]).get()
    
    if not streak_doc.exists:
        return StreakResponse(
            current_streak=0,
            longest_streak=0,
            last_answered_date=None,
            milestones=[]
        )
    
    streak = streak_doc.to_dict()
    return StreakResponse(
        current_streak=streak.get("current_streak", 0),
        longest_streak=streak.get("longest_streak", 0),
        last_answered_date=streak.get("last_answered_date"),
        milestones=streak.get("milestones_reached", [])
    )


# ============== TRIVIA GAME ROUTES ==============

TRIVIA_CATEGORIES = ["favorites", "memories", "preferences", "dreams", "habits", "personality"]

async def generate_trivia_question(about_user_name: str, category: str) -> dict:
    prompt = f"""Generate a fun "How well do you know me?" trivia question for couples.

The question should be about {about_user_name}'s {category}.

Category examples:
- favorites: favorite color, food, movie, song, book, place
- memories: first date, funny moments, embarrassing stories
- preferences: morning/night person, coffee/tea, cats/dogs
- dreams: bucket list items, career goals, travel wishes
- habits: daily routines, quirks, pet peeves
- personality: fears, strengths, love language

Generate a multiple choice question with 4 options.

Return in this EXACT format (no extra text):
QUESTION: [Your question here]
A: [Option A]
B: [Option B]
C: [Option C]
D: [Option D]"""

    system_instruction = "You are creating fun relationship trivia questions. Keep them light, engaging, and appropriate for couples."
    
    response = await generate_with_gemini(prompt, system_instruction)
    
    if response:
        try:
            lines = response.strip().split('\n')
            question = ""
            options = []
            for line in lines:
                line = line.strip()
                if line.startswith("QUESTION:"):
                    question = line.replace("QUESTION:", "").strip()
                elif line.startswith(("A:", "B:", "C:", "D:")):
                    options.append(line[2:].strip())
            
            if question and len(options) == 4:
                return {"question": question, "options": options}
        except:
            pass
    
    # Fallback
    fallback = {
        "favorites": {"question": f"What is {about_user_name}'s favorite way to spend a lazy Sunday?", "options": ["Sleeping in and watching movies", "Going for a hike", "Cooking a big brunch", "Reading at home"]},
        "memories": {"question": f"What made {about_user_name} laugh the hardest recently?", "options": ["A funny video", "Something you said", "A pet doing something silly", "A comedy show"]},
        "preferences": {"question": f"How does {about_user_name} prefer to unwind after a stressful day?", "options": ["Exercise", "Quiet time alone", "Talking about their day", "Comfort food and TV"]},
        "dreams": {"question": f"What's on {about_user_name}'s bucket list?", "options": ["Traveling somewhere specific", "Learning a new skill", "Starting a business", "An adventure activity"]},
        "habits": {"question": f"What's {about_user_name}'s morning routine like?", "options": ["Quick and out the door", "Coffee first", "Full routine with breakfast", "Hit snooze multiple times"]},
        "personality": {"question": f"What's {about_user_name}'s love language?", "options": ["Words of affirmation", "Quality time", "Physical touch", "Acts of service"]}
    }
    return fallback.get(category, fallback["favorites"])

@api_router.get("/trivia/question", response_model=TriviaQuestionResponse)
async def get_trivia_question(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    about_partner = random.choice([True, False])
    about_user_id = current_user["partner_id"] if about_partner else current_user["id"]
    about_user_name = current_user["partner_name"] if about_partner else current_user["name"]
    
    category = random.choice(TRIVIA_CATEGORIES)
    trivia_data = await generate_trivia_question(about_user_name, category)
    
    trivia_id = str(uuid.uuid4())
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    db.collection('trivia').document(trivia_id).set({
        "pair_key": pair_key,
        "question": trivia_data["question"],
        "options": trivia_data["options"],
        "category": category,
        "about_user_id": about_user_id,
        "about_user_name": about_user_name,
        "correct_answer": None,
        "guesses": {},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast real-time update to both partners
    broadcast_pair_update(pair_key, "trivia", {
        "event": "new_question",
        "trivia_id": trivia_id,
        "question": trivia_data["question"],
        "options": trivia_data["options"],
        "category": category,
        "about_user_id": about_user_id,
        "about_user_name": about_user_name,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"]
    })
    
    return TriviaQuestionResponse(
        id=trivia_id,
        question=trivia_data["question"],
        options=trivia_data["options"],
        category=category,
        about_user=about_user_name
    )

@api_router.post("/trivia/set-answer")
async def set_trivia_answer(trivia_id: str, answer: str, current_user: dict = Depends(get_current_user)):
    trivia_ref = db.collection('trivia').document(trivia_id)
    trivia_doc = trivia_ref.get()
    
    if not trivia_doc.exists:
        raise HTTPException(status_code=404, detail="Trivia not found")
    
    trivia = trivia_doc.to_dict()
    
    if trivia["about_user_id"] != current_user["id"]:
        raise HTTPException(status_code=400, detail="Only the person this question is about can set the answer")
    
    if answer not in trivia["options"]:
        raise HTTPException(status_code=400, detail="Invalid answer option")
    
    trivia_ref.update({"correct_answer": answer})
    
    # Broadcast real-time update
    pair_key = trivia["pair_key"]
    broadcast_pair_update(pair_key, "trivia", {
        "event": "answer_set",
        "trivia_id": trivia_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"]
    })
    
    return {"status": "ok"}

@api_router.post("/trivia/guess", response_model=TriviaResultResponse)
async def submit_trivia_guess(answer_data: TriviaAnswerCreate, current_user: dict = Depends(get_current_user)):
    trivia_ref = db.collection('trivia').document(answer_data.trivia_id)
    trivia_doc = trivia_ref.get()
    
    if not trivia_doc.exists:
        raise HTTPException(status_code=404, detail="Trivia not found")
    
    trivia = trivia_doc.to_dict()
    
    if trivia["about_user_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You can't guess on a question about yourself")
    
    if not trivia.get("correct_answer"):
        raise HTTPException(status_code=400, detail="Waiting for partner to set the correct answer")
    
    user_id = current_user["id"]
    is_correct = answer_data.selected_option == trivia["correct_answer"]
    points = 10 if is_correct else 0
    
    trivia_ref.update({
        f"guesses.{user_id}": {
            "answer": answer_data.selected_option,
            "is_correct": is_correct,
            "points": points,
            "guessed_at": datetime.now(timezone.utc).isoformat()
        }
    })
    
    # Update score
    score_ref = db.collection('trivia_scores').document(f"{user_id}_{trivia['pair_key']}")
    score_doc = score_ref.get()
    
    if score_doc.exists:
        current_score = score_doc.to_dict()
        score_ref.update({
            "score": current_score.get("score", 0) + points,
            "total_questions": current_score.get("total_questions", 0) + 1,
            "correct": current_score.get("correct", 0) + (1 if is_correct else 0)
        })
    else:
        score_ref.set({
            "user_id": user_id,
            "pair_key": trivia["pair_key"],
            "score": points,
            "total_questions": 1,
            "correct": 1 if is_correct else 0
        })
    
    # Broadcast real-time update
    broadcast_pair_update(trivia["pair_key"], "trivia", {
        "event": "guess_submitted",
        "trivia_id": answer_data.trivia_id,
        "user_id": user_id,
        "user_name": current_user["name"],
        "is_correct": is_correct,
        "points": points
    })
    
    return TriviaResultResponse(
        id=answer_data.trivia_id,
        question=trivia["question"],
        your_guess=answer_data.selected_option,
        correct_answer=trivia["correct_answer"],
        is_correct=is_correct,
        points_earned=points
    )

@api_router.get("/trivia/scores", response_model=TriviaScoreResponse)
async def get_trivia_scores(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_key = get_pair_key(user_id, partner_id)
    
    user_score_doc = db.collection('trivia_scores').document(f"{user_id}_{pair_key}").get()
    partner_score_doc = db.collection('trivia_scores').document(f"{partner_id}_{pair_key}").get()
    
    user_score = user_score_doc.to_dict() if user_score_doc.exists else {}
    partner_score = partner_score_doc.to_dict() if partner_score_doc.exists else {}
    
    return TriviaScoreResponse(
        user_score=user_score.get("score", 0),
        partner_score=partner_score.get("score", 0),
        total_questions=user_score.get("total_questions", 0) + partner_score.get("total_questions", 0),
        user_correct=user_score.get("correct", 0),
        partner_correct=partner_score.get("correct", 0)
    )


# ============== LOVE NOTES ROUTES ==============

@api_router.post("/notes", response_model=LoveNoteResponse)
async def send_love_note(note_data: LoveNoteCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    if len(note_data.message) > 500:
        raise HTTPException(status_code=400, detail="Message must be 500 characters or less")
    
    note_id = str(uuid.uuid4())
    note = {
        "from_user_id": current_user["id"],
        "from_user_name": current_user["name"],
        "to_user_id": current_user["partner_id"],
        "message": note_data.message,
        "emoji": note_data.emoji,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.collection('love_notes').document(note_id).set(note)
    note['id'] = note_id
    
    # Broadcast real-time update to partner
    broadcast_user_update(current_user["partner_id"], "notes", {
        "event": "new_note",
        "note_id": note_id,
        "from_user_id": current_user["id"],
        "from_user_name": current_user["name"],
        "emoji": note_data.emoji,
        "preview": note_data.message[:50] + "..." if len(note_data.message) > 50 else note_data.message
    })

    # Also write a lightweight Firestore notification so clients without RTDB can poll
    try:
        notif_ref = db.collection('user_notifications').document(f"{current_user['partner_id']}_{note_id}")
        notif_ref.set({
            "to_user_id": current_user['partner_id'],
            "event": "new_note",
            "note_id": note_id,
            "from_user_id": current_user['id'],
            "from_user_name": current_user['name'],
            "preview": note_data.message[:100],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.warning(f"Failed to write user notification: {e}")
    
    return LoveNoteResponse(
        id=note_id,
        from_user_id=note["from_user_id"],
        from_user_name=note["from_user_name"],
        message=note["message"],
        emoji=note["emoji"],
        is_read=note["is_read"],
        created_at=note["created_at"]
    )

@api_router.get("/notes", response_model=List[LoveNoteResponse])
async def get_love_notes(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    notes = db.collection('love_notes').where('to_user_id', '==', current_user["id"]).order_by('created_at', direction=firestore.Query.DESCENDING).limit(50).get()
    
    return [LoveNoteResponse(
        id=doc.id,
        from_user_id=doc.to_dict()["from_user_id"],
        from_user_name=doc.to_dict()["from_user_name"],
        message=doc.to_dict()["message"],
        emoji=doc.to_dict().get("emoji"),
        is_read=doc.to_dict()["is_read"],
        created_at=doc.to_dict()["created_at"]
    ) for doc in notes]

@api_router.get("/notes/sent", response_model=List[LoveNoteResponse])
async def get_sent_notes(current_user: dict = Depends(get_current_user)):
    notes = db.collection('love_notes').where('from_user_id', '==', current_user["id"]).order_by('created_at', direction=firestore.Query.DESCENDING).limit(50).get()
    
    return [LoveNoteResponse(
        id=doc.id,
        from_user_id=doc.to_dict()["from_user_id"],
        from_user_name=doc.to_dict()["from_user_name"],
        message=doc.to_dict()["message"],
        emoji=doc.to_dict().get("emoji"),
        is_read=doc.to_dict()["is_read"],
        created_at=doc.to_dict()["created_at"]
    ) for doc in notes]

@api_router.post("/notes/{note_id}/read")
async def mark_note_read(note_id: str, current_user: dict = Depends(get_current_user)):
    note_ref = db.collection('love_notes').document(note_id)
    note_doc = note_ref.get()
    
    if not note_doc.exists or note_doc.to_dict()["to_user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note_ref.update({"is_read": True})
    return {"status": "ok"}

@api_router.get("/notes/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    notes = db.collection('love_notes').where('to_user_id', '==', current_user["id"]).where('is_read', '==', False).get()
    return {"count": len(list(notes))}


# ============== DATE IDEAS ROUTES ==============

async def generate_date_idea(budget: str, mood: str, location_type: str) -> dict:
    prompt = f"""Generate a creative date idea for a couple.

Requirements:
- Budget level: {budget} (low = free or under $20, medium = $20-$100, high = $100+)
- Mood: {mood} (romantic, adventurous, relaxed, fun)
- Location: {location_type} (indoor, outdoor, any)

Return in this EXACT format:
TITLE: [Short catchy title]
DESCRIPTION: [2-3 sentence description]
TIP1: [First helpful tip]
TIP2: [Second helpful tip]
TIP3: [Third helpful tip]"""

    system_instruction = "You are a creative date planner helping couples have amazing experiences together."
    
    response = await generate_with_gemini(prompt, system_instruction)
    
    if response:
        try:
            lines = response.strip().split('\n')
            title = ""
            description = ""
            tips = []
            
            for line in lines:
                line = line.strip()
                if line.startswith("TITLE:"):
                    title = line.replace("TITLE:", "").strip()
                elif line.startswith("DESCRIPTION:"):
                    description = line.replace("DESCRIPTION:", "").strip()
                elif line.startswith(("TIP1:", "TIP2:", "TIP3:")):
                    tips.append(line.split(":", 1)[1].strip())
            
            if title and description:
                return {"title": title, "description": description, "tips": tips or ["Have fun!", "Take photos", "Be present"]}
        except:
            pass
    
    fallbacks = {
        "romantic": {"title": "Sunset Picnic", "description": "Pack your favorite snacks and watch the sunset together.", "tips": ["Bring a cozy blanket", "Make a playlist", "Don't forget dessert"]},
        "adventurous": {"title": "Hiking Adventure", "description": "Explore a new trail together.", "tips": ["Check the weather", "Pack snacks", "Take photos"]},
        "relaxed": {"title": "Movie Marathon Night", "description": "Create a cozy fort and watch your favorite movies.", "tips": ["Prepare snacks", "Put phones away", "Take breaks"]},
        "fun": {"title": "Game Night Challenge", "description": "Compete in board games with fun stakes.", "tips": ["Loser makes dinner", "Try new games", "Keep score"]}
    }
    return fallbacks.get(mood, fallbacks["romantic"])

@api_router.post("/dates/generate", response_model=DateIdeaResponse)
async def generate_date(request: DateIdeaRequest, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    idea_data = await generate_date_idea(request.budget, request.mood, request.location_type)
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    idea_id = str(uuid.uuid4())
    idea = {
        "pair_key": pair_key,
        "title": idea_data["title"],
        "description": idea_data["description"],
        "budget": request.budget,
        "mood": request.mood,
        "location_type": request.location_type,
        "tips": idea_data["tips"],
        "is_favorite": False,
        "is_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.collection('date_ideas').document(idea_id).set(idea)
    idea['id'] = idea_id
    
    return DateIdeaResponse(**{k: v for k, v in idea.items() if k != "pair_key"})

@api_router.get("/dates", response_model=List[DateIdeaResponse])
async def get_date_ideas(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    ideas = db.collection('date_ideas').where('pair_key', '==', pair_key).order_by('created_at', direction=firestore.Query.DESCENDING).limit(50).get()
    
    return [DateIdeaResponse(
        id=doc.id,
        title=doc.to_dict()["title"],
        description=doc.to_dict()["description"],
        budget=doc.to_dict()["budget"],
        mood=doc.to_dict()["mood"],
        location_type=doc.to_dict()["location_type"],
        tips=doc.to_dict()["tips"],
        is_favorite=doc.to_dict()["is_favorite"],
        is_completed=doc.to_dict()["is_completed"],
        created_at=doc.to_dict()["created_at"]
    ) for doc in ideas]

@api_router.post("/dates/{idea_id}/favorite")
async def toggle_favorite(idea_id: str, current_user: dict = Depends(get_current_user)):
    idea_ref = db.collection('date_ideas').document(idea_id)
    idea_doc = idea_ref.get()
    
    if not idea_doc.exists:
        raise HTTPException(status_code=404, detail="Date idea not found")
    
    new_status = not idea_doc.to_dict().get("is_favorite", False)
    idea_ref.update({"is_favorite": new_status})
    return {"is_favorite": new_status}

@api_router.post("/dates/{idea_id}/complete")
async def mark_completed(idea_id: str, current_user: dict = Depends(get_current_user)):
    idea_ref = db.collection('date_ideas').document(idea_id)
    idea_doc = idea_ref.get()
    
    if not idea_doc.exists:
        raise HTTPException(status_code=404, detail="Date idea not found")
    
    new_status = not idea_doc.to_dict().get("is_completed", False)
    idea_ref.update({"is_completed": new_status})
    return {"is_completed": new_status}


# ============== MEMORY TIMELINE ROUTES ==============

@api_router.post("/memories", response_model=MemoryResponse)
async def create_memory(memory_data: MemoryCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    memory_id = str(uuid.uuid4())
    
    memory = {
        "pair_key": pair_key,
        "title": memory_data.title,
        "description": memory_data.description,
        "date": memory_data.date,
        "photo_url": memory_data.photo_url,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.collection('memories').document(memory_id).set(memory)
    memory['id'] = memory_id
    
    return MemoryResponse(**{k: v for k, v in memory.items() if k != "pair_key"})

@api_router.get("/memories", response_model=List[MemoryResponse])
async def get_memories(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    memories = db.collection('memories').where('pair_key', '==', pair_key).order_by('date', direction=firestore.Query.DESCENDING).limit(100).get()
    
    return [MemoryResponse(
        id=doc.id,
        title=doc.to_dict()["title"],
        description=doc.to_dict().get("description"),
        date=doc.to_dict()["date"],
        photo_url=doc.to_dict().get("photo_url"),
        created_by=doc.to_dict()["created_by"],
        created_by_name=doc.to_dict()["created_by_name"],
        created_at=doc.to_dict()["created_at"]
    ) for doc in memories]

@api_router.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str, current_user: dict = Depends(get_current_user)):
    memory_ref = db.collection('memories').document(memory_id)
    memory_doc = memory_ref.get()
    
    if not memory_doc.exists or memory_doc.to_dict()["created_by"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Memory not found or you don't have permission")
    
    memory_ref.delete()
    return {"status": "ok"}


# ============== MOOD CHECK-IN ROUTES ==============

VALID_MOODS = ["happy", "content", "neutral", "stressed", "sad"]

@api_router.post("/mood", response_model=MoodCheckinResponse)
async def submit_mood(mood_data: MoodCheckinCreate, current_user: dict = Depends(get_current_user)):
    if mood_data.mood not in VALID_MOODS:
        raise HTTPException(status_code=400, detail=f"Mood must be one of: {VALID_MOODS}")
    
    today = get_today_date()
    user_id = current_user["id"]
    mood_id = f"{user_id}_{today}"
    
    mood_doc = {
        "user_id": user_id,
        "user_name": current_user["name"],
        "mood": mood_data.mood,
        "note": mood_data.note,
        "date": today,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.collection('moods').document(mood_id).set(mood_doc)
    mood_doc['id'] = mood_id
    
    # Broadcast real-time update to partner
    partner_id = current_user.get("partner_id")
    if partner_id:
        pair_key = get_pair_key(user_id, partner_id)
        broadcast_pair_update(pair_key, "moods", {
            "event": "mood_updated",
            "user_id": user_id,
            "user_name": current_user["name"],
            "mood": mood_data.mood,
            "note": mood_data.note,
            "date": today
        })
    
    return MoodCheckinResponse(**mood_doc)

@api_router.get("/mood/today", response_model=TodayMoodResponse)
async def get_today_mood(current_user: dict = Depends(get_current_user)):
    today = get_today_date()
    user_id = current_user["id"]
    partner_id = current_user.get("partner_id")
    
    user_mood_doc = db.collection('moods').document(f"{user_id}_{today}").get()
    user_mood = None
    if user_mood_doc.exists:
        data = user_mood_doc.to_dict()
        data['id'] = user_mood_doc.id
        user_mood = MoodCheckinResponse(**data)
    
    partner_mood = None
    if partner_id:
        partner_mood_doc = db.collection('moods').document(f"{partner_id}_{today}").get()
        if partner_mood_doc.exists:
            data = partner_mood_doc.to_dict()
            data['id'] = partner_mood_doc.id
            partner_mood = MoodCheckinResponse(**data)
    
    return TodayMoodResponse(user_mood=user_mood, partner_mood=partner_mood)

@api_router.get("/mood/history", response_model=List[MoodCheckinResponse])
async def get_mood_history(days: int = 30, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    partner_id = current_user.get("partner_id")
    
    user_ids = [user_id]
    if partner_id:
        user_ids.append(partner_id)
    
    all_moods = []
    for uid in user_ids:
        moods = db.collection('moods').where('user_id', '==', uid).order_by('date', direction=firestore.Query.DESCENDING).limit(days).get()
        for doc in moods:
            data = doc.to_dict()
            data['id'] = doc.id
            all_moods.append(MoodCheckinResponse(**data))
    
    all_moods.sort(key=lambda x: x.date, reverse=True)
    return all_moods[:days * 2]


# ============== LOVE COUPONS ROUTES ==============

DEFAULT_COUPONS = [
    {"title": "10-Minute Massage", "emoji": "💆"},
    {"title": "Breakfast in Bed", "emoji": "🍳"},
    {"title": "Movie Night Pick", "emoji": "🎬"},
    {"title": "One Free Pass", "emoji": "🎟️"},
    {"title": "Surprise Date Night", "emoji": "✨"},
    {"title": "Cuddle Session", "emoji": "🤗"},
    {"title": "Home Cooked Meal", "emoji": "👨‍🍳"},
    {"title": "Back Scratch", "emoji": "💅"},
]

@api_router.post("/coupons", response_model=LoveCouponResponse)
async def create_coupon(coupon_data: LoveCouponCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    coupon_id = str(uuid.uuid4())
    
    coupon = {
        "pair_key": pair_key,
        "title": coupon_data.title,
        "description": coupon_data.description,
        "emoji": coupon_data.emoji or "🎟️",
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "is_redeemed": False,
        "redeemed_at": None,
        "redeemed_by": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.collection('coupons').document(coupon_id).set(coupon)
    
    # Broadcast real-time update
    broadcast_pair_update(pair_key, "coupons", {
        "event": "coupon_created",
        "coupon_id": coupon_id,
        "title": coupon_data.title,
        "created_by_name": current_user["name"]
    })
    
    return LoveCouponResponse(id=coupon_id, **{k: v for k, v in coupon.items() if k != "pair_key"})

@api_router.get("/coupons", response_model=List[LoveCouponResponse])
async def get_coupons(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    coupons = db.collection('coupons').where('pair_key', '==', pair_key).get()
    
    return [LoveCouponResponse(
        id=doc.id,
        title=doc.to_dict()["title"],
        description=doc.to_dict().get("description"),
        emoji=doc.to_dict().get("emoji", "🎟️"),
        created_by=doc.to_dict()["created_by"],
        created_by_name=doc.to_dict()["created_by_name"],
        is_redeemed=doc.to_dict().get("is_redeemed", False),
        redeemed_at=doc.to_dict().get("redeemed_at"),
        redeemed_by=doc.to_dict().get("redeemed_by"),
        created_at=doc.to_dict()["created_at"]
    ) for doc in coupons]

@api_router.post("/coupons/{coupon_id}/redeem")
async def redeem_coupon(coupon_id: str, current_user: dict = Depends(get_current_user)):
    coupon_ref = db.collection('coupons').document(coupon_id)
    coupon_doc = coupon_ref.get()
    
    if not coupon_doc.exists:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    coupon = coupon_doc.to_dict()
    
    # Can only redeem coupons given to you (created by partner)
    if coupon["created_by"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You can only redeem coupons given to you")
    
    if coupon.get("is_redeemed"):
        raise HTTPException(status_code=400, detail="Coupon already redeemed")
    
    coupon_ref.update({
        "is_redeemed": True,
        "redeemed_at": datetime.now(timezone.utc).isoformat(),
        "redeemed_by": current_user["id"]
    })
    
    # Broadcast real-time update
    broadcast_pair_update(coupon["pair_key"], "coupons", {
        "event": "coupon_redeemed",
        "coupon_id": coupon_id,
        "title": coupon["title"],
        "redeemed_by_name": current_user["name"]
    })
    
    return {"status": "redeemed"}

@api_router.get("/coupons/templates")
async def get_coupon_templates():
    return DEFAULT_COUPONS


# ============== BUCKET LIST ROUTES ==============

BUCKET_CATEGORIES = ["travel", "experiences", "food", "goals", "romance", "general"]

@api_router.post("/bucket-list", response_model=BucketListItemResponse)
async def create_bucket_item(item_data: BucketListItemCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    item_id = str(uuid.uuid4())
    
    item = {
        "pair_key": pair_key,
        "title": item_data.title,
        "category": item_data.category or "general",
        "notes": item_data.notes,
        "is_completed": False,
        "completed_at": None,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.collection('bucket_list').document(item_id).set(item)
    
    # Broadcast real-time update
    broadcast_pair_update(pair_key, "bucket_list", {
        "event": "item_added",
        "item_id": item_id,
        "title": item_data.title,
        "created_by_name": current_user["name"]
    })
    
    return BucketListItemResponse(id=item_id, **{k: v for k, v in item.items() if k != "pair_key"})

@api_router.get("/bucket-list", response_model=List[BucketListItemResponse])
async def get_bucket_list(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    items = db.collection('bucket_list').where('pair_key', '==', pair_key).get()
    
    return [BucketListItemResponse(
        id=doc.id,
        title=doc.to_dict()["title"],
        category=doc.to_dict().get("category", "general"),
        notes=doc.to_dict().get("notes"),
        is_completed=doc.to_dict().get("is_completed", False),
        completed_at=doc.to_dict().get("completed_at"),
        created_by=doc.to_dict()["created_by"],
        created_by_name=doc.to_dict()["created_by_name"],
        created_at=doc.to_dict()["created_at"]
    ) for doc in items]

@api_router.post("/bucket-list/{item_id}/complete")
async def toggle_bucket_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item_ref = db.collection('bucket_list').document(item_id)
    item_doc = item_ref.get()
    
    if not item_doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item = item_doc.to_dict()
    new_status = not item.get("is_completed", False)
    
    item_ref.update({
        "is_completed": new_status,
        "completed_at": datetime.now(timezone.utc).isoformat() if new_status else None
    })
    
    # Broadcast real-time update
    broadcast_pair_update(item["pair_key"], "bucket_list", {
        "event": "item_toggled",
        "item_id": item_id,
        "title": item["title"],
        "is_completed": new_status,
        "toggled_by_name": current_user["name"]
    })
    
    return {"is_completed": new_status}

@api_router.delete("/bucket-list/{item_id}")
async def delete_bucket_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item_ref = db.collection('bucket_list').document(item_id)
    item_doc = item_ref.get()
    
    if not item_doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item = item_doc.to_dict()
    item_ref.delete()
    
    # Broadcast real-time update
    broadcast_pair_update(item["pair_key"], "bucket_list", {
        "event": "item_deleted",
        "item_id": item_id
    })
    
    return {"status": "deleted"}

@api_router.get("/bucket-list/categories")
async def get_bucket_categories():
    return BUCKET_CATEGORIES


# ============== DATE NIGHT SPINNER ==============

DATE_PRESETS = {
    "movies": ["Watch a romantic comedy", "Movie marathon", "Drive-in theater", "Foreign film night"],
    "food": ["Cook together", "Order from a new restaurant", "Fancy dinner out", "Picnic in the park"],
    "adventure": ["Go hiking", "Try a new activity", "Road trip", "Explore a new neighborhood"],
    "relaxation": ["Spa night at home", "Stargazing", "Beach day", "Lazy Sunday in bed"],
    "creative": ["Paint together", "Build something", "Photo walk", "Write love letters"],
    "games": ["Board game night", "Video games", "Trivia night", "Puzzle together"]
}

@api_router.get("/date-spinner/spin")
async def spin_date_wheel(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if category and category in DATE_PRESETS:
        options = DATE_PRESETS[category]
    else:
        # Mix from all categories
        options = [item for items in DATE_PRESETS.values() for item in items]
    
    selected = random.choice(options)
    
    return {
        "result": selected,
        "category": category or "mixed"
    }

@api_router.get("/date-spinner/categories")
async def get_spinner_categories():
    return list(DATE_PRESETS.keys())


# ============== UPLOADS (CLOUDINARY) ==============
@api_router.post('/upload/photo')
async def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a photo to Cloudinary and return the secure URL.

    Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment.
    """
    if not CLOUDINARY_AVAILABLE:
        raise HTTPException(status_code=500, detail='Cloudinary not configured on server')

    # Quick permission check
    if not current_user:
        raise HTTPException(status_code=401, detail='Authentication required')

    tmp_dir = ROOT_DIR / 'tmp'
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / file.filename

    try:
        content = await file.read()
        with open(tmp_path, 'wb') as f:
            f.write(content)

        url = upload_image_file(str(tmp_path), folder=f"candle/{current_user['id']}")
        try:
            os.remove(tmp_path)
        except Exception:
            pass

        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload photo: {e}")
        raise HTTPException(status_code=500, detail='Upload failed')


# ============== THUMB KISS / TOUCH FEATURE ==============

@api_router.post("/thumb-kiss")
async def send_thumb_kiss(current_user: dict = Depends(get_current_user)):
    """Send a thumb kiss to partner - a cute touch gesture"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    # Create thumb kiss event
    kiss_event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "from_user_id": current_user["id"],
        "from_user_name": current_user["name"],
        "to_user_id": current_user["partner_id"],
        "type": "thumb_kiss"
    }
    
    # Save to Firestore for history
    db.collection('thumb_kisses').add({
        "pair_key": pair_key,
        "from_user_id": current_user["id"],
        "from_user_name": current_user["name"],
        "to_user_id": current_user["partner_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast real-time update
    broadcast_pair_update(pair_key, "thumbKiss", kiss_event)
    
    return {"status": "sent", "timestamp": kiss_event["timestamp"]}


@api_router.get("/thumb-kiss/count")
async def get_thumb_kiss_count(current_user: dict = Depends(get_current_user)):
    """Get count of thumb kisses received today"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Query Firestore for today's kisses
    kisses = db.collection('thumb_kisses').where(
        'pair_key', '==', pair_key
    ).where(
        'to_user_id', '==', current_user['id']
    ).stream()
    
    count = 0
    for kiss in kisses:
        kiss_date = kiss.get('created_at')[:10]
        if kiss_date == today:
            count += 1
    
    return {"count": count, "date": today}


# ============== FANTASY MATCHER FEATURE ==============

FANTASY_PREFERENCES = {
    "setting": ["Beach", "Mountains", "City", "Home", "Hotel", "Adventure"],
    "vibe": ["Romantic", "Playful", "Adventurous", "Relaxing", "Passionate", "Spontaneous"],
    "mood": ["Tender", "Flirty", "Bold", "Sensual", "Giggly", "Intense"],
    "timing": ["Morning", "Afternoon", "Evening", "Night", "Anytime", "Surprise me"],
}

@api_router.post("/fantasy/profile")
async def save_fantasy_profile(preferences: dict, current_user: dict = Depends(get_current_user)):
    """Save user's fantasy preferences"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    # Validate preferences
    for key in preferences:
        if key not in FANTASY_PREFERENCES:
            raise HTTPException(status_code=400, detail=f"Invalid preference: {key}")
        if preferences[key] not in FANTASY_PREFERENCES[key]:
            raise HTTPException(status_code=400, detail=f"Invalid value for {key}: {preferences[key]}")
    
    db.collection('fantasy_profiles').document(current_user["id"]).set({
        "pair_key": get_pair_key(current_user["id"], current_user["partner_id"]),
        "preferences": preferences,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "user_name": current_user["name"]
    })
    
    # Broadcast update
    broadcast_user_update(current_user["id"], "fantasy_profile", {"completed": True})
    
    return {"status": "saved", "preferences": preferences}


@api_router.get("/fantasy/profile")
async def get_fantasy_profile(current_user: dict = Depends(get_current_user)):
    """Get user's fantasy profile"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    profile_doc = db.collection('fantasy_profiles').document(current_user["id"]).get()
    
    if profile_doc.exists:
        profile = profile_doc.to_dict()
        return {
            "user_id": current_user["id"],
            "preferences": profile.get("preferences", {}),
            "updated_at": profile.get("updated_at")
        }
    
    return {"user_id": current_user["id"], "preferences": {}, "updated_at": None}


@api_router.get("/fantasy/match")
async def get_fantasy_match(current_user: dict = Depends(get_current_user)):
    """Get compatibility score with partner based on fantasy preferences"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    # Get both profiles
    user_profile = db.collection('fantasy_profiles').document(current_user["id"]).get()
    partner_profile = db.collection('fantasy_profiles').document(current_user["partner_id"]).get()
    
    if not user_profile.exists or not partner_profile.exists:
        raise HTTPException(status_code=400, detail="Both partners must complete their fantasy profiles first")
    
    user_prefs = user_profile.to_dict().get("preferences", {})
    partner_prefs = partner_profile.to_dict().get("preferences", {})
    
    # Calculate compatibility score
    matches = 0
    total = len(FANTASY_PREFERENCES)
    
    for category in FANTASY_PREFERENCES:
        if user_prefs.get(category) == partner_prefs.get(category):
            matches += 1
    
    compatibility = round((matches / total) * 100)
    
    return {
        "compatibility": compatibility,
        "matches": matches,
        "total": total,
        "your_preferences": user_prefs,
        "partner_preferences": partner_prefs
    }


# ============== SPICY DICE FEATURE ==============

SPICY_DICE_ACTIVITIES = {
    1: "Give each other a sensual massage",
    2: "Start with a slow, passionate kiss",
    3: "Whisper something you love about your partner",
    4: "Take turns choosing positions",
    5: "Switch locations (if possible!)",
    6: "Try something you've been curious about",
    7: "Compliment your partner's body",
    8: "Create a romantic playlist together first",
    9: "Take a warm bath together",
    10: "Give your partner a surprise",
    11: "Ask what they're fantasizing about",
    12: "Set the mood with candles/lighting",
    13: "Make it a slow, teasing experience",
    14: "Try synchronized movements",
    15: "Use ice or warmth as a sensation",
    16: "Blindfold and use touch sensations",
    17: "Give gentle, playful touches",
    18: "Take your time and savor each moment",
    19: "Whisper dirty thoughts to each other",
    20: "Try a position you've never done",
    21: "Role-play a scenario together",
    22: "Use props or accessories",
    23: "Take control and lead your partner",
    24: "Be vulnerable and share desires",
    25: "Use mirrors for visual excitement",
    26: "Try tantric breathing together",
    27: "Create a comfortable, judgment-free space",
    28: "Be playful and laugh together",
    29: "Explore each other slowly",
    30: "End with cuddles and affection",
    31: "Try something totally spontaneous",
    32: "Make lots of eye contact",
    33: "Use your hands in new ways",
    34: "Try a different pace",
    35: "Share what felt amazing",
    36: "Plan the next adventure together",
}

@api_router.post("/spicy-dice/roll")
async def roll_spicy_dice(current_user: dict = Depends(get_current_user)):
    """Roll the spicy dice and get a random activity"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    # Roll two dice (1-6 each)
    import random
    dice1 = random.randint(1, 6)
    dice2 = random.randint(1, 6)
    
    # Convert to activity number (1-36)
    activity_num = (dice1 - 1) * 6 + dice2
    activity = SPICY_DICE_ACTIVITIES.get(activity_num, "Try something spontaneous!")
    
    # Save roll to history
    db.collection('spicy_dice_rolls').add({
        "pair_key": pair_key,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "dice1": dice1,
        "dice2": dice2,
        "activity_num": activity_num,
        "activity": activity,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast real-time update
    broadcast_pair_update(pair_key, "spicy_dice", {
        "event": "dice_rolled",
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "dice1": dice1,
        "dice2": dice2,
        "activity_num": activity_num,
        "activity": activity
    })
    
    return {
        "dice1": dice1,
        "dice2": dice2,
        "activity_num": activity_num,
        "activity": activity,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/spicy-dice/activities")
async def get_spicy_dice_activities():
    """Get all spicy dice activities"""
    return {
        "activities": SPICY_DICE_ACTIVITIES,
        "total": len(SPICY_DICE_ACTIVITIES)
    }


@api_router.get("/spicy-dice/history")
async def get_spicy_dice_history(current_user: dict = Depends(get_current_user)):
    """Get roll history for the pair"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    rolls = db.collection('spicy_dice_rolls').where(
        'pair_key', '==', pair_key
    ).order_by('created_at', direction='DESCENDING').limit(20).stream()
    
    history = []
    for roll in rolls:
        history.append(roll.to_dict())
    
    return {"rolls": history}


# ============== SHARED CANVAS FEATURE ==============

@api_router.post("/canvas/save")
async def save_canvas(data: dict, current_user: dict = Depends(get_current_user)):
    """Save a canvas drawing"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    if not data.get("image_data"):
        raise HTTPException(status_code=400, detail="No image data provided")
    
    canvas_id = str(uuid.uuid4())
    
    db.collection('canvas_drawings').document(canvas_id).set({
        "pair_key": pair_key,
        "creator_id": current_user["id"],
        "creator_name": current_user["name"],
        "image_data": data["image_data"],
        "title": data.get("title", "Untitled Drawing"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast update
    broadcast_pair_update(pair_key, "canvas", {
        "event": "drawing_saved",
        "drawing_id": canvas_id,
        "creator_id": current_user["id"],
        "creator_name": current_user["name"],
        "title": data.get("title", "Untitled Drawing")
    })
    
    return {"drawing_id": canvas_id, "status": "saved"}


@api_router.get("/canvas")
async def get_canvas_drawings(current_user: dict = Depends(get_current_user)):
    """Get all saved canvas drawings for the pair"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    drawings = db.collection('canvas_drawings').where(
        'pair_key', '==', pair_key
    ).order_by('created_at', direction='DESCENDING').stream()
    
    result = []
    for drawing in drawings:
        data = drawing.to_dict()
        # Don't include full image data in list, just metadata
        result.append({
            "drawing_id": drawing.id,
            "creator_name": data.get("creator_name"),
            "title": data.get("title"),
            "created_at": data.get("created_at")
        })
    
    return {"drawings": result}


@api_router.get("/canvas/{drawing_id}")
async def get_canvas_drawing(drawing_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific canvas drawing"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    drawing_doc = db.collection('canvas_drawings').document(drawing_id).get()
    
    if not drawing_doc.exists:
        raise HTTPException(status_code=404, detail="Drawing not found")
    
    drawing = drawing_doc.to_dict()
    pair_key = get_pair_key(current_user["id"], current_user["partner_id"])
    
    if drawing.get("pair_key") != pair_key:
        raise HTTPException(status_code=403, detail="Not authorized to view this drawing")
    
    return {
        "drawing_id": drawing_id,
        "creator_name": drawing.get("creator_name"),
        "title": drawing.get("title"),
        "image_data": drawing.get("image_data"),
        "created_at": drawing.get("created_at")
    }


@api_router.delete("/canvas/{drawing_id}")
async def delete_canvas_drawing(drawing_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a canvas drawing"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    drawing_doc = db.collection('canvas_drawings').document(drawing_id).get()
    
    if not drawing_doc.exists:
        raise HTTPException(status_code=404, detail="Drawing not found")
    
    drawing = drawing_doc.to_dict()
    
    if drawing.get("creator_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only creator can delete drawing")
    
    pair_key = drawing.get("pair_key")
    db.collection('canvas_drawings').document(drawing_id).delete()
    
    # Broadcast update
    broadcast_pair_update(pair_key, "canvas", {
        "event": "drawing_deleted",
        "drawing_id": drawing_id
    })
    
    return {"status": "deleted"}


# ============== PRIVACY SETTINGS ==============

DEFAULT_PRIVACY_SETTINGS = {
    "share_moods": True,
    "share_memories": True,
    "share_bucket_list": True,
    "share_coupons": True,
    "share_trivia_scores": True,
    "share_date_history": True,
    "share_love_notes": True,
    "show_full_history": True
}

@api_router.get("/privacy/settings")
async def get_privacy_settings(current_user: dict = Depends(get_current_user)):
    """Get user's privacy settings"""
    settings_doc = db.collection('privacy_settings').document(current_user["id"]).get()
    
    if settings_doc.exists:
        return settings_doc.to_dict()
    
    # Return default settings if not found
    return DEFAULT_PRIVACY_SETTINGS


@api_router.put("/privacy/settings")
async def update_privacy_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    """Update user's privacy settings"""
    # Validate all settings exist
    for key in DEFAULT_PRIVACY_SETTINGS.keys():
        if key not in settings:
            raise HTTPException(status_code=400, detail=f"Missing setting: {key}")
        if not isinstance(settings[key], bool):
            raise HTTPException(status_code=400, detail=f"Setting must be boolean: {key}")
    
    db.collection('privacy_settings').document(current_user["id"]).set({
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        **settings,
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast update
    broadcast_user_update(current_user["id"], "privacy_settings", settings)
    
    return {"status": "updated", "settings": settings}


@api_router.get("/partner/privacy")
async def check_partner_privacy(current_user: dict = Depends(get_current_user)):
    """Check what privacy settings partner has enabled"""
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    settings_doc = db.collection('privacy_settings').document(current_user["partner_id"]).get()
    
    if settings_doc.exists:
        return settings_doc.to_dict()
    
    # Return default settings (everything shared)
    return DEFAULT_PRIVACY_SETTINGS


# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Candle API is running", "status": "healthy", "database": "Firebase Firestore"}

# ============== RELATIONSHIP MILESTONES ==============

@api_router.put("/milestones")
async def update_milestones(milestones: dict, current_user: dict = Depends(get_current_user)):
    """Update relationship milestone dates"""
    # Milestone fields: start_talking, met, became_official, first_kiss, first_time
    valid_fields = {'start_talking', 'met', 'became_official', 'first_kiss', 'first_time'}
    
    # Validate that all provided fields are valid
    for key in milestones.keys():
        if key not in valid_fields:
            raise HTTPException(status_code=400, detail=f"Invalid milestone field: {key}")
    
    # Save to Firestore
    db.collection('users').document(current_user["id"]).update({
        "milestones": milestones,
        "milestones_updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast update
    broadcast_user_update(current_user["id"], "milestones", milestones)
    
    return {"status": "updated", "milestones": milestones}


@api_router.get("/milestones")
async def get_milestones(current_user: dict = Depends(get_current_user)):
    """Get relationship milestones for current user"""
    user_doc = db.collection('users').document(current_user["id"]).get()
    milestones = user_doc.get('milestones', {})
    return milestones


@api_router.get("/partner/milestones")
async def get_partner_milestones(current_user: dict = Depends(get_current_user)):
    """Get partner's relationship milestones"""
    if not current_user.get('partner_id'):
        raise HTTPException(status_code=400, detail="Not paired with a partner")
    
    partner_doc = db.collection('users').document(current_user['partner_id']).get()
    milestones = partner_doc.get('milestones', {})
    return milestones


# ============== PIC OF THE DAY ==============

@api_router.post("/pic-of-day")
async def upload_pic_of_day(pic_data: dict, current_user: dict = Depends(get_current_user)):
    """Upload today's pic (image_url from Cloudinary)"""
    if not current_user.get('partner_id'):
        raise HTTPException(status_code=400, detail="Not paired with a partner")
    
    today = datetime.now(timezone.utc).date().isoformat()
    
    db.collection('pic_of_day').document(today).set({
        "date": today,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "image_url": pic_data.get('image_url'),
        "pair_key": current_user.get('pair_key'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }, merge=True)
    
    # Broadcast to partner
    broadcast_pair_update(
        current_user.get('pair_key'),
        "pic_of_day",
        {"date": today, "user_id": current_user["id"], "uploaded": True}
    )
    
    return {"status": "uploaded", "date": today}


@api_router.get("/pic-of-day")
async def get_pic_of_day(current_user: dict = Depends(get_current_user)):
    """Get today's pic (if partner uploaded, blur if not"""
    if not current_user.get('partner_id'):
        raise HTTPException(status_code=400, detail="Not paired with a partner")
    
    today = datetime.now(timezone.utc).date().isoformat()
    
    pic_doc = db.collection('pic_of_day').document(today).get()
    if not pic_doc.exists:
        return {"status": "no_pic", "date": today}
    
    pic_data = pic_doc.to_dict()
    
    # Check if both partners have uploaded
    partner_uploaded = pic_data.get('partner_uploaded', False)
    my_uploaded = pic_data.get('my_uploaded', False)
    
    return {
        "date": today,
        "partner_image": pic_data.get('image_url'),
        "should_blur": not my_uploaded,  # Blur if I haven't uploaded yet
        "partner_uploaded": partner_uploaded,
        "my_uploaded": my_uploaded
    }


@api_router.get("/pic-of-day/history")
async def get_pic_history(current_user: dict = Depends(get_current_user)):
    """Get all past pics (archive them to memories)"""
    if not current_user.get('pair_key'):
        raise HTTPException(status_code=400, detail="Not paired")
    
    pics = db.collection('pic_of_day')\
        .where('pair_key', '==', current_user['pair_key'])\
        .order_by('date', direction='DESCENDING')\
        .limit(30)\
        .stream()
    
    return [{"date": p.get('date'), "image_url": p.get('image_url')} for p in pics]


# ============== TRIVIA OVERHAUL ==============

@api_router.post("/trivia/answer-and-pass")
async def trivia_answer_and_pass(answer_data: dict, current_user: dict = Depends(get_current_user)):
    """Partner A answers trivia, passes to Partner B for guess"""
    if not current_user.get('pair_key'):
        raise HTTPException(status_code=400, detail="Not paired")
    
    trivia_id = answer_data.get('trivia_id')
    partner_answer = answer_data.get('answer')
    
    # Save Partner A's answer
    db.collection('trivia_rounds').add({
        "pair_key": current_user['pair_key'],
        "trivia_id": trivia_id,
        "phase": "partner_a_answered",
        "partner_a_id": current_user["id"],
        "partner_a_answer": partner_answer,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Broadcast to Partner B (pass for guessing)
    broadcast_pair_update(
        current_user['pair_key'],
        "trivia_waiting_guess",
        {"trivia_id": trivia_id, "phase": "waiting_b_guess"}
    )
    
    return {"status": "passed_to_partner"}


@api_router.post("/trivia/submit-guess")
async def trivia_submit_guess(guess_data: dict, current_user: dict = Depends(get_current_user)):
    """Partner B guesses Partner A's answer"""
    if not current_user.get('pair_key'):
        raise HTTPException(status_code=400, detail="Not paired")
    
    trivia_id = guess_data.get('trivia_id')
    partner_b_guess = guess_data.get('guess')
    
    # Get the trivia round
    rounds = db.collection('trivia_rounds')\
        .where('trivia_id', '==', trivia_id)\
        .where('pair_key', '==', current_user['pair_key'])\
        .order_by('created_at', direction='DESCENDING')\
        .limit(1)\
        .stream()
    
    round_data = None
    for round_doc in rounds:
        round_data = round_doc.to_dict()
        round_id = round_doc.id
    
    if not round_data:
        raise HTTPException(status_code=404, detail="Trivia round not found")
    
    partner_a_answer = round_data.get('partner_a_answer')
    is_correct = partner_b_guess == partner_a_answer
    
    # Update round with Partner B's guess and result
    db.collection('trivia_rounds').document(round_id).update({
        "phase": "completed",
        "partner_b_id": current_user["id"],
        "partner_b_guess": partner_b_guess,
        "is_correct": is_correct,
        "completed_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get actual trivia question for context
    trivia_question = db.collection('trivia').document(trivia_id).get()
    
    # Broadcast results to both partners
    broadcast_pair_update(
        current_user['pair_key'],
        "trivia_result",
        {
            "trivia_id": trivia_id,
            "is_correct": is_correct,
            "partner_a_answer": partner_a_answer,
            "partner_b_guess": partner_b_guess,
            "question": trivia_question.get('question') if trivia_question.exists else ""
        }
    )
    
    return {
        "status": "completed",
        "is_correct": is_correct,
        "partner_a_answer": partner_a_answer,
        "partner_b_guess": partner_b_guess
    }


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ============== APP SETUP ==============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
