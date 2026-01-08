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

# ============== NEW FEATURE MODELS ==============

# Trivia Game Models
class TriviaQuestionResponse(BaseModel):
    id: str
    question: str
    options: List[str]
    category: str
    about_user: str  # whose preferences this question is about

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

# Love Notes Models
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

# Date Ideas Models
class DateIdeaRequest(BaseModel):
    budget: Optional[str] = "medium"  # low, medium, high
    mood: Optional[str] = "romantic"  # romantic, adventurous, relaxed, fun
    location_type: Optional[str] = "any"  # indoor, outdoor, any

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

# Memory Timeline Models
class MemoryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str  # YYYY-MM-DD
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

# Mood Check-in Models
class MoodCheckinCreate(BaseModel):
    mood: str  # happy, content, neutral, stressed, sad
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

async def generate_with_gemini(prompt: str, system_message: str) -> str:
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return None
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"gen-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response.strip()
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

    system_message = "You are a relationship expert who creates meaningful, engaging questions for couples and close friends to deepen their connection."
    
    response = await generate_with_gemini(prompt, system_message)
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
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"partner_id": partner_id, "partner_name": partner_name}}
    )
    await db.users.update_one(
        {"id": partner_id},
        {"$set": {"partner_id": current_user["id"], "partner_name": current_user["name"]}}
    )
    
    await db.pairing_codes.delete_one({"code": request.code.upper()})
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)


# ============== QUESTION ROUTES ==============

def get_today_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def get_category_for_date(date_str: str) -> str:
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
    
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    question = await db.questions.find_one({"date": today, "pair_key": pair_key}, {"_id": 0})
    
    if not question:
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
    
    if question.get("answers", {}).get(user_id):
        raise HTTPException(status_code=400, detail="You have already answered this question")
    
    answered_at = datetime.now(timezone.utc).isoformat()
    await db.questions.update_one(
        {"id": answer_data.question_id},
        {"$set": {f"answers.{user_id}": {"text": answer_data.answer_text, "answered_at": answered_at}}}
    )
    
    updated_question = await db.questions.find_one({"id": answer_data.question_id}, {"_id": 0})
    answers = updated_question.get("answers", {})
    both_answered = bool(answers.get(user_id) and answers.get(partner_id))
    
    if both_answered:
        await update_streak(user_id, updated_question["date"])
        await update_streak(partner_id, updated_question["date"])
    
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

    system_message = "You are creating fun relationship trivia questions. Keep them light, engaging, and appropriate for couples."
    
    response = await generate_with_gemini(prompt, system_message)
    
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
    
    # Fallback questions
    fallback = {
        "favorites": {
            "question": f"What is {about_user_name}'s favorite way to spend a lazy Sunday?",
            "options": ["Sleeping in and watching movies", "Going for a hike or outdoor activity", "Cooking a big brunch", "Reading or relaxing at home"]
        },
        "memories": {
            "question": f"What made {about_user_name} laugh the hardest recently?",
            "options": ["A funny video or meme", "Something you said", "A pet doing something silly", "A comedy show or movie"]
        },
        "preferences": {
            "question": f"How does {about_user_name} prefer to unwind after a stressful day?",
            "options": ["Exercise or physical activity", "Quiet time alone", "Talking about their day", "Comfort food and TV"]
        },
        "dreams": {
            "question": f"What's on {about_user_name}'s bucket list?",
            "options": ["Traveling to a specific country", "Learning a new skill", "Starting a business", "An adventure activity"]
        },
        "habits": {
            "question": f"What's {about_user_name}'s morning routine like?",
            "options": ["Quick shower and out the door", "Coffee first, everything else later", "Full routine with breakfast", "Hit snooze multiple times"]
        },
        "personality": {
            "question": f"What's {about_user_name}'s love language?",
            "options": ["Words of affirmation", "Quality time", "Physical touch", "Acts of service"]
        }
    }
    
    return fallback.get(category, fallback["favorites"])

@api_router.get("/trivia/question", response_model=TriviaQuestionResponse)
async def get_trivia_question(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    # Randomly decide if question is about user or partner
    about_partner = random.choice([True, False])
    about_user_id = current_user["partner_id"] if about_partner else current_user["id"]
    about_user_name = current_user["partner_name"] if about_partner else current_user["name"]
    
    category = random.choice(TRIVIA_CATEGORIES)
    trivia_data = await generate_trivia_question(about_user_name, category)
    
    trivia_id = str(uuid.uuid4())
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    # Store the trivia question (the person it's about will set the correct answer)
    await db.trivia.insert_one({
        "id": trivia_id,
        "pair_key": pair_key,
        "question": trivia_data["question"],
        "options": trivia_data["options"],
        "category": category,
        "about_user_id": about_user_id,
        "about_user_name": about_user_name,
        "correct_answer": None,  # To be set by the person it's about
        "guesses": {},
        "created_at": datetime.now(timezone.utc).isoformat()
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
    """The person the question is about sets the correct answer"""
    trivia = await db.trivia.find_one({"id": trivia_id}, {"_id": 0})
    if not trivia:
        raise HTTPException(status_code=404, detail="Trivia not found")
    
    if trivia["about_user_id"] != current_user["id"]:
        raise HTTPException(status_code=400, detail="Only the person this question is about can set the answer")
    
    if answer not in trivia["options"]:
        raise HTTPException(status_code=400, detail="Invalid answer option")
    
    await db.trivia.update_one(
        {"id": trivia_id},
        {"$set": {"correct_answer": answer}}
    )
    
    return {"status": "ok"}

@api_router.post("/trivia/guess", response_model=TriviaResultResponse)
async def submit_trivia_guess(answer_data: TriviaAnswerCreate, current_user: dict = Depends(get_current_user)):
    """Submit a guess for a trivia question"""
    trivia = await db.trivia.find_one({"id": answer_data.trivia_id}, {"_id": 0})
    if not trivia:
        raise HTTPException(status_code=404, detail="Trivia not found")
    
    if trivia["about_user_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You can't guess on a question about yourself")
    
    if not trivia.get("correct_answer"):
        raise HTTPException(status_code=400, detail="Waiting for partner to set the correct answer")
    
    user_id = current_user["id"]
    is_correct = answer_data.selected_option == trivia["correct_answer"]
    points = 10 if is_correct else 0
    
    # Save the guess
    await db.trivia.update_one(
        {"id": answer_data.trivia_id},
        {"$set": {f"guesses.{user_id}": {
            "answer": answer_data.selected_option,
            "is_correct": is_correct,
            "points": points,
            "guessed_at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    
    # Update user's trivia score
    await db.trivia_scores.update_one(
        {"user_id": user_id, "pair_key": trivia["pair_key"]},
        {"$inc": {"score": points, "total_questions": 1, "correct": 1 if is_correct else 0}},
        upsert=True
    )
    
    return TriviaResultResponse(
        id=trivia["id"],
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
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    user_score = await db.trivia_scores.find_one({"user_id": user_id, "pair_key": pair_key}, {"_id": 0})
    partner_score = await db.trivia_scores.find_one({"user_id": partner_id, "pair_key": pair_key}, {"_id": 0})
    
    return TriviaScoreResponse(
        user_score=user_score.get("score", 0) if user_score else 0,
        partner_score=partner_score.get("score", 0) if partner_score else 0,
        total_questions=(user_score.get("total_questions", 0) if user_score else 0) + (partner_score.get("total_questions", 0) if partner_score else 0),
        user_correct=user_score.get("correct", 0) if user_score else 0,
        partner_correct=partner_score.get("correct", 0) if partner_score else 0
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
        "id": note_id,
        "from_user_id": current_user["id"],
        "from_user_name": current_user["name"],
        "to_user_id": current_user["partner_id"],
        "message": note_data.message,
        "emoji": note_data.emoji,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.love_notes.insert_one(note)
    
    return LoveNoteResponse(**{k: v for k, v in note.items() if k != "to_user_id"})

@api_router.get("/notes", response_model=List[LoveNoteResponse])
async def get_love_notes(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    notes = await db.love_notes.find(
        {"to_user_id": current_user["id"]},
        {"_id": 0, "to_user_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return [LoveNoteResponse(**note) for note in notes]

@api_router.get("/notes/sent", response_model=List[LoveNoteResponse])
async def get_sent_notes(current_user: dict = Depends(get_current_user)):
    notes = await db.love_notes.find(
        {"from_user_id": current_user["id"]},
        {"_id": 0, "to_user_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return [LoveNoteResponse(**note) for note in notes]

@api_router.post("/notes/{note_id}/read")
async def mark_note_read(note_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.love_notes.update_one(
        {"id": note_id, "to_user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"status": "ok"}

@api_router.get("/notes/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.love_notes.count_documents({
        "to_user_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}


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

    system_message = "You are a creative date planner helping couples have amazing experiences together."
    
    response = await generate_with_gemini(prompt, system_message)
    
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
    
    # Fallback ideas
    fallbacks = {
        "romantic": {"title": "Sunset Picnic", "description": "Pack your favorite snacks and watch the sunset together at a scenic spot.", "tips": ["Bring a cozy blanket", "Make a playlist", "Don't forget dessert"]},
        "adventurous": {"title": "Hiking Adventure", "description": "Explore a new trail together and discover hidden gems in nature.", "tips": ["Check the weather", "Pack snacks and water", "Take photos at viewpoints"]},
        "relaxed": {"title": "Movie Marathon Night", "description": "Create a cozy fort, pick your favorite movies, and spend the evening cuddled up.", "tips": ["Prepare snacks beforehand", "Put phones away", "Take breaks to discuss"]},
        "fun": {"title": "Game Night Challenge", "description": "Compete in board games, video games, or card games with fun stakes.", "tips": ["Loser makes dinner", "Try new games", "Keep score for bragging rights"]}
    }
    
    return fallbacks.get(mood, fallbacks["romantic"])

@api_router.post("/dates/generate", response_model=DateIdeaResponse)
async def generate_date(request: DateIdeaRequest, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    idea_data = await generate_date_idea(request.budget, request.mood, request.location_type)
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    idea_id = str(uuid.uuid4())
    idea = {
        "id": idea_id,
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
    
    await db.date_ideas.insert_one(idea)
    
    return DateIdeaResponse(**{k: v for k, v in idea.items() if k != "pair_key"})

@api_router.get("/dates", response_model=List[DateIdeaResponse])
async def get_date_ideas(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    ideas = await db.date_ideas.find(
        {"pair_key": pair_key},
        {"_id": 0, "pair_key": 0}
    ).sort("created_at", -1).to_list(50)
    
    return [DateIdeaResponse(**idea) for idea in ideas]

@api_router.post("/dates/{idea_id}/favorite")
async def toggle_favorite(idea_id: str, current_user: dict = Depends(get_current_user)):
    idea = await db.date_ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Date idea not found")
    
    new_status = not idea.get("is_favorite", False)
    await db.date_ideas.update_one(
        {"id": idea_id},
        {"$set": {"is_favorite": new_status}}
    )
    
    return {"is_favorite": new_status}

@api_router.post("/dates/{idea_id}/complete")
async def mark_completed(idea_id: str, current_user: dict = Depends(get_current_user)):
    idea = await db.date_ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Date idea not found")
    
    new_status = not idea.get("is_completed", False)
    await db.date_ideas.update_one(
        {"id": idea_id},
        {"$set": {"is_completed": new_status}}
    )
    
    return {"is_completed": new_status}


# ============== MEMORY TIMELINE ROUTES ==============

@api_router.post("/memories", response_model=MemoryResponse)
async def create_memory(memory_data: MemoryCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    memory_id = str(uuid.uuid4())
    memory = {
        "id": memory_id,
        "pair_key": pair_key,
        "title": memory_data.title,
        "description": memory_data.description,
        "date": memory_data.date,
        "photo_url": memory_data.photo_url,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.memories.insert_one(memory)
    
    return MemoryResponse(**{k: v for k, v in memory.items() if k != "pair_key"})

@api_router.get("/memories", response_model=List[MemoryResponse])
async def get_memories(current_user: dict = Depends(get_current_user)):
    if not current_user.get("partner_id"):
        raise HTTPException(status_code=400, detail="You need to pair with a partner first")
    
    user_id = current_user["id"]
    partner_id = current_user["partner_id"]
    pair_ids = sorted([user_id, partner_id])
    pair_key = f"{pair_ids[0]}_{pair_ids[1]}"
    
    memories = await db.memories.find(
        {"pair_key": pair_key},
        {"_id": 0, "pair_key": 0}
    ).sort("date", -1).to_list(100)
    
    return [MemoryResponse(**memory) for memory in memories]

@api_router.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.memories.delete_one({
        "id": memory_id,
        "created_by": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Memory not found or you don't have permission to delete it")
    
    return {"status": "ok"}


# ============== MOOD CHECK-IN ROUTES ==============

VALID_MOODS = ["happy", "content", "neutral", "stressed", "sad"]

@api_router.post("/mood", response_model=MoodCheckinResponse)
async def submit_mood(mood_data: MoodCheckinCreate, current_user: dict = Depends(get_current_user)):
    if mood_data.mood not in VALID_MOODS:
        raise HTTPException(status_code=400, detail=f"Mood must be one of: {VALID_MOODS}")
    
    today = get_today_date()
    user_id = current_user["id"]
    
    # Check if already submitted today
    existing = await db.moods.find_one({"user_id": user_id, "date": today})
    
    mood_id = existing["id"] if existing else str(uuid.uuid4())
    mood_doc = {
        "id": mood_id,
        "user_id": user_id,
        "user_name": current_user["name"],
        "mood": mood_data.mood,
        "note": mood_data.note,
        "date": today,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.moods.update_one({"id": mood_id}, {"$set": mood_doc})
    else:
        await db.moods.insert_one(mood_doc)
    
    return MoodCheckinResponse(**mood_doc)

@api_router.get("/mood/today", response_model=TodayMoodResponse)
async def get_today_mood(current_user: dict = Depends(get_current_user)):
    today = get_today_date()
    user_id = current_user["id"]
    partner_id = current_user.get("partner_id")
    
    user_mood = await db.moods.find_one({"user_id": user_id, "date": today}, {"_id": 0})
    partner_mood = None
    
    if partner_id:
        partner_mood = await db.moods.find_one({"user_id": partner_id, "date": today}, {"_id": 0})
    
    return TodayMoodResponse(
        user_mood=MoodCheckinResponse(**user_mood) if user_mood else None,
        partner_mood=MoodCheckinResponse(**partner_mood) if partner_mood else None
    )

@api_router.get("/mood/history", response_model=List[MoodCheckinResponse])
async def get_mood_history(days: int = 30, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    partner_id = current_user.get("partner_id")
    
    user_ids = [user_id]
    if partner_id:
        user_ids.append(partner_id)
    
    moods = await db.moods.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0}
    ).sort("date", -1).to_list(days * 2)
    
    return [MoodCheckinResponse(**mood) for mood in moods]


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
