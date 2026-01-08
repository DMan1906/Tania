from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT & Password config
JWT_SECRET = os.environ.get('JWT_SECRET', 'candle-app-secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app and router
app = FastAPI()
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

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    created_at: str

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
    reaction: str  # heart, laugh, surprised, cry, fire

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


# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== GEMINI HELPER ==============

QUESTION_CATEGORIES = ["emotional", "playful", "gratitude", "dreams", "communication", "spicy", "hypothetical"]

async def generate_question_with_gemini(category: str, previous_questions: List[str]) -> str:
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return get_fallback_question(category)
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"question-gen-{uuid.uuid4()}",
            system_message="You are a relationship expert who creates meaningful, engaging questions for couples and close friends to deepen their connection. Generate questions that spark genuine conversation and help people understand each other better."
        ).with_model("gemini", "gemini-2.5-flash")
        
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

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        question = response.strip().strip('"').strip("'")
        if question and len(question) > 10:
            return question
        return get_fallback_question(category)
        
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
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
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "partner_id": None,
        "partner_name": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Initialize streak
    await db.streaks.insert_one({
        "user_id": user_id,
        "current_streak": 0,
        "longest_streak": 0,
        "last_answered_date": None,
        "milestones_reached": []
    })
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        partner_id=None,
        partner_name=None,
        created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        partner_id=user.get("partner_id"),
        partner_name=user.get("partner_name"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)


# ============== PAIRING ROUTES ==============

def generate_pairing_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@api_router.post("/pairing/generate", response_model=PairingCodeResponse)
async def generate_code(current_user: dict = Depends(get_current_user)):
    if current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You are already paired with a partner")
    
    # Delete any existing codes for this user
    await db.pairing_codes.delete_many({"user_id": current_user["id"]})
    
    code = generate_pairing_code()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    await db.pairing_codes.insert_one({
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
    
    pairing = await db.pairing_codes.find_one({"code": request.code.upper()})
    if not pairing:
        raise HTTPException(status_code=404, detail="Invalid pairing code")
    
    if datetime.fromisoformat(pairing["expires_at"]) < datetime.now(timezone.utc):
        await db.pairing_codes.delete_one({"code": request.code.upper()})
        raise HTTPException(status_code=400, detail="Pairing code has expired")
    
    if pairing["user_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot pair with yourself")
    
    partner_id = pairing["user_id"]
    partner_name = pairing["user_name"]
    
    # Update both users
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"partner_id": partner_id, "partner_name": partner_name}}
    )
    await db.users.update_one(
        {"id": partner_id},
        {"$set": {"partner_id": current_user["id"], "partner_name": current_user["name"]}}
    )
    
    # Delete the used code
    await db.pairing_codes.delete_one({"code": request.code.upper()})
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)


# ============== QUESTION ROUTES ==============

def get_today_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def get_category_for_date(date_str: str) -> str:
    # Rotate through categories based on date
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    day_of_year = date_obj.timetuple().tm_yday
    return QUESTION_CATEGORIES[day_of_year % len(QUESTION_CATEGORIES)]

@api_router.get("/questions/today", response_model=QuestionResponse)
async def get_today_question(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    today = get_today_date()
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    
    # Create pair key (sorted to be consistent)
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    # Check if question exists for today
    question = await db.questions.find_one({"date": today, "pair_key": pair_key}, {"_id": 0})
    
    if not question:
        # Get previous questions to avoid repeats
        previous = await db.questions.find({"pair_key": pair_key}, {"_id": 0, "text": 1}).to_list(100)
        previous_texts = [q["text"] for q in previous]
        
        category = get_category_for_date(today)
        question_text = await generate_question_with_gemini(category, previous_texts)
        
        question = {
            "id": str(uuid.uuid4()),
            "text": question_text,
            "category": category,
            "date": today,
            "pair_key": pair_key,
            "answers": {},
            "reactions": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.questions.insert_one(question)
    
    # Build response
    answers = question.get("answers", {})
    reactions = question.get("reactions", {})
    
    user_answer = answers.get(user_id)
    partner_answer = answers.get(partner_id)
    both_answered = bool(user_answer and partner_answer)
    
    return QuestionResponse(
        id=question["id"],
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
    
    question = await db.questions.find_one({"id": answer_data.question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if already answered
    if question.get("answers", {}).get(user_id):
        raise HTTPException(status_code=400, detail="You have already answered this question")
    
    # Save answer
    answered_at = datetime.now(timezone.utc).isoformat()
    await db.questions.update_one(
        {"id": answer_data.question_id},
        {"$set": {f"answers.{user_id}": {"text": answer_data.answer_text, "answered_at": answered_at}}}
    )
    
    # Update streak if both answered
    updated_question = await db.questions.find_one({"id": answer_data.question_id}, {"_id": 0})
    answers = updated_question.get("answers", {})
    both_answered = bool(answers.get(user_id) and answers.get(partner_id))
    
    if both_answered:
        await update_streak(user_id, updated_question["date"])
        await update_streak(partner_id, updated_question["date"])
    
    # Build response
    user_answer = answers.get(user_id)
    partner_answer = answers.get(partner_id)
    reactions = updated_question.get("reactions", {})
    
    return QuestionResponse(
        id=updated_question["id"],
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
    
    result = await db.questions.update_one(
        {"id": reaction_data.question_id},
        {"$set": {f"reactions.{user_id}": reaction_data.reaction}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"status": "ok"}

@api_router.get("/questions/history", response_model=List[QuestionResponse])
async def get_question_history(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    questions = await db.questions.find(
        {"pair_key": pair_key},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    result = []
    for q in questions:
        answers = q.get("answers", {})
        reactions = q.get("reactions", {})
        user_answer = answers.get(user_id)
        partner_answer = answers.get(partner_id)
        both_answered = bool(user_answer and partner_answer)
        
        result.append(QuestionResponse(
            id=q["id"],
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
    streak = await db.streaks.find_one({"user_id": user_id})
    if not streak:
        streak = {
            "user_id": user_id,
            "current_streak": 0,
            "longest_streak": 0,
            "last_answered_date": None,
            "milestones_reached": []
        }
    
    today = datetime.strptime(answered_date, "%Y-%m-%d").date()
    
    if streak["last_answered_date"]:
        last_date = datetime.strptime(streak["last_answered_date"], "%Y-%m-%d").date()
        diff = (today - last_date).days
        
        if diff == 0:
            # Same day, no change
            return
        elif diff == 1:
            # Consecutive day
            streak["current_streak"] += 1
        else:
            # Streak broken
            streak["current_streak"] = 1
    else:
        streak["current_streak"] = 1
    
    streak["last_answered_date"] = answered_date
    
    if streak["current_streak"] > streak["longest_streak"]:
        streak["longest_streak"] = streak["current_streak"]
    
    # Check for new milestones
    for milestone in STREAK_MILESTONES:
        if streak["current_streak"] >= milestone and milestone not in streak["milestones_reached"]:
            streak["milestones_reached"].append(milestone)
    
    await db.streaks.update_one(
        {"user_id": user_id},
        {"$set": streak},
        upsert=True
    )

@api_router.get("/streaks", response_model=StreakResponse)
async def get_streak(current_user: dict = Depends(get_current_user)):
    streak = await db.streaks.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not streak:
        return StreakResponse(
            current_streak=0,
            longest_streak=0,
            last_answered_date=None,
            milestones=[]
        )
    
    return StreakResponse(
        current_streak=streak.get("current_streak", 0),
        longest_streak=streak.get("longest_streak", 0),
        last_answered_date=streak.get("last_answered_date"),
        milestones=streak.get("milestones_reached", [])
    )


# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Candle API is running", "status": "healthy"}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
