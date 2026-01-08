import requests
import sys
import json
from datetime import datetime
import time

class CandleAPITester:
    def __init__(self, base_url="https://couplelink-5.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.user1_token = None
        self.user2_token = None
        self.user1_data = None
        self.user2_data = None
        self.pairing_code = None
        self.question_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("Root endpoint", "GET", "", 200)
        self.run_test("Health check", "GET", "health", 200)

    def test_user_registration(self):
        """Test user registration"""
        print("\n=== USER REGISTRATION TESTS ===")
        
        # Test User 1 registration
        timestamp = int(time.time())
        user1_email = f"user1_{timestamp}@test.com"
        user1_password = "testpass123"
        user1_name = "Test User One"
        
        success, response = self.run_test(
            "Register User 1",
            "POST",
            "auth/register",
            200,
            data={
                "email": user1_email,
                "password": user1_password,
                "name": user1_name
            }
        )
        
        if success:
            self.user1_token = response.get('access_token')
            self.user1_data = response.get('user')
            print(f"   User 1 ID: {self.user1_data.get('id')}")
        
        # Test User 2 registration
        user2_email = f"user2_{timestamp}@test.com"
        user2_password = "testpass456"
        user2_name = "Test User Two"
        
        success, response = self.run_test(
            "Register User 2",
            "POST",
            "auth/register",
            200,
            data={
                "email": user2_email,
                "password": user2_password,
                "name": user2_name
            }
        )
        
        if success:
            self.user2_token = response.get('access_token')
            self.user2_data = response.get('user')
            print(f"   User 2 ID: {self.user2_data.get('id')}")

        # Test duplicate email registration
        self.run_test(
            "Duplicate email registration",
            "POST",
            "auth/register",
            400,
            data={
                "email": user1_email,
                "password": "different123",
                "name": "Different Name"
            }
        )

    def test_user_login(self):
        """Test user login"""
        print("\n=== USER LOGIN TESTS ===")
        
        if not self.user1_data:
            print("❌ Skipping login tests - no user data")
            return
            
        # Test valid login
        success, response = self.run_test(
            "Valid login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.user1_data['email'],
                "password": "testpass123"
            }
        )
        
        # Test invalid login
        self.run_test(
            "Invalid login",
            "POST",
            "auth/login",
            401,
            data={
                "email": self.user1_data['email'],
                "password": "wrongpassword"
            }
        )

    def test_auth_me(self):
        """Test get current user"""
        print("\n=== AUTH ME TESTS ===")
        
        if not self.user1_token:
            print("❌ Skipping auth/me tests - no token")
            return
            
        self.run_test(
            "Get current user",
            "GET",
            "auth/me",
            200,
            token=self.user1_token
        )
        
        # Test without token
        self.run_test(
            "Get current user without token",
            "GET",
            "auth/me",
            401
        )

    def test_pairing_system(self):
        """Test pairing system"""
        print("\n=== PAIRING SYSTEM TESTS ===")
        
        if not self.user1_token or not self.user2_token:
            print("❌ Skipping pairing tests - missing tokens")
            return
        
        # Generate pairing code for User 1
        success, response = self.run_test(
            "Generate pairing code",
            "POST",
            "pairing/generate",
            200,
            token=self.user1_token
        )
        
        if success:
            self.pairing_code = response.get('code')
            print(f"   Generated code: {self.pairing_code}")
        
        # Test connecting User 2 with User 1's code
        if self.pairing_code:
            success, response = self.run_test(
                "Connect with partner",
                "POST",
                "pairing/connect",
                200,
                data={"code": self.pairing_code},
                token=self.user2_token
            )
            
            if success:
                print(f"   User 2 paired with: {response.get('partner_name')}")
        
        # Test invalid pairing code
        self.run_test(
            "Invalid pairing code",
            "POST",
            "pairing/connect",
            404,
            data={"code": "INVALID"},
            token=self.user2_token
        )

    def test_questions_system(self):
        """Test questions system"""
        print("\n=== QUESTIONS SYSTEM TESTS ===")
        
        if not self.user1_token or not self.user2_token:
            print("❌ Skipping questions tests - missing tokens")
            return
        
        # Test getting today's question (should work after pairing)
        success, response = self.run_test(
            "Get today's question",
            "GET",
            "questions/today",
            200,
            token=self.user1_token
        )
        
        if success:
            self.question_id = response.get('id')
            print(f"   Question: {response.get('text')[:50]}...")
            print(f"   Category: {response.get('category')}")
        
        # Test submitting answer from User 1
        if self.question_id:
            success, response = self.run_test(
                "Submit answer (User 1)",
                "POST",
                "questions/answer",
                200,
                data={
                    "question_id": self.question_id,
                    "answer_text": "This is User 1's test answer to the question."
                },
                token=self.user1_token
            )
            
            if success:
                print(f"   User answered: {response.get('user_answer') is not None}")
                print(f"   Both answered: {response.get('both_answered')}")
        
        # Test submitting answer from User 2
        if self.question_id:
            success, response = self.run_test(
                "Submit answer (User 2)",
                "POST",
                "questions/answer",
                200,
                data={
                    "question_id": self.question_id,
                    "answer_text": "This is User 2's test answer to the same question."
                },
                token=self.user2_token
            )
            
            if success:
                print(f"   Partner answered: {response.get('partner_answer') is not None}")
                print(f"   Both answered: {response.get('both_answered')}")
        
        # Test adding reaction
        if self.question_id:
            self.run_test(
                "Add reaction",
                "POST",
                "questions/react",
                200,
                data={
                    "question_id": self.question_id,
                    "reaction": "heart"
                },
                token=self.user1_token
            )
        
        # Test getting question history
        self.run_test(
            "Get question history",
            "GET",
            "questions/history",
            200,
            token=self.user1_token
        )

    def test_streaks_system(self):
        """Test streaks system"""
        print("\n=== STREAKS SYSTEM TESTS ===")
        
        if not self.user1_token:
            print("❌ Skipping streaks tests - missing token")
            return
        
        success, response = self.run_test(
            "Get streak data",
            "GET",
            "streaks",
            200,
            token=self.user1_token
        )
        
        if success:
            print(f"   Current streak: {response.get('current_streak')}")
            print(f"   Longest streak: {response.get('longest_streak')}")
            print(f"   Milestones: {response.get('milestones')}")

    def test_trivia_system(self):
        """Test trivia game system"""
        print("\n=== TRIVIA SYSTEM TESTS ===")
        
        if not self.user1_token or not self.user2_token:
            print("❌ Skipping trivia tests - missing tokens")
            return
        
        # Test getting trivia question
        success, response = self.run_test(
            "Get trivia question",
            "GET",
            "trivia/question",
            200,
            token=self.user1_token
        )
        
        trivia_id = None
        about_user = None
        if success:
            trivia_id = response.get('id')
            about_user = response.get('about_user')
            print(f"   Question: {response.get('question')[:50]}...")
            print(f"   About: {about_user}")
            print(f"   Options: {len(response.get('options', []))}")
        
        # Test setting correct answer (by the person the question is about)
        if trivia_id and about_user:
            # Determine which user should set the answer
            answer_token = self.user1_token if about_user == self.user1_data.get('name') else self.user2_token
            
            success, response = self.run_test(
                "Set trivia answer",
                "POST",
                f"trivia/set-answer?trivia_id={trivia_id}&answer=Option A",
                200,
                token=answer_token
            )
        
        # Test submitting guess (by the other user)
        if trivia_id and about_user:
            # Determine which user should guess
            guess_token = self.user2_token if about_user == self.user1_data.get('name') else self.user1_token
            
            success, response = self.run_test(
                "Submit trivia guess",
                "POST",
                "trivia/guess",
                200,
                data={
                    "trivia_id": trivia_id,
                    "selected_option": "Option A"
                },
                token=guess_token
            )
            
            if success:
                print(f"   Correct: {response.get('is_correct')}")
                print(f"   Points: {response.get('points_earned')}")
        
        # Test getting trivia scores
        success, response = self.run_test(
            "Get trivia scores",
            "GET",
            "trivia/scores",
            200,
            token=self.user1_token
        )
        
        if success:
            print(f"   User score: {response.get('user_score')}")
            print(f"   Partner score: {response.get('partner_score')}")

    def test_love_notes_system(self):
        """Test love notes system"""
        print("\n=== LOVE NOTES SYSTEM TESTS ===")
        
        if not self.user1_token or not self.user2_token:
            print("❌ Skipping love notes tests - missing tokens")
            return
        
        # Test sending a love note
        success, response = self.run_test(
            "Send love note",
            "POST",
            "notes",
            200,
            data={
                "message": "This is a test love note! 💕",
                "emoji": "❤️"
            },
            token=self.user1_token
        )
        
        note_id = None
        if success:
            note_id = response.get('id')
            print(f"   Note sent with ID: {note_id}")
        
        # Test getting received notes (User 2 should receive User 1's note)
        success, response = self.run_test(
            "Get received notes",
            "GET",
            "notes",
            200,
            token=self.user2_token
        )
        
        if success:
            notes = response if isinstance(response, list) else []
            print(f"   Received {len(notes)} notes")
        
        # Test getting sent notes (User 1 should see their sent note)
        success, response = self.run_test(
            "Get sent notes",
            "GET",
            "notes/sent",
            200,
            token=self.user1_token
        )
        
        if success:
            notes = response if isinstance(response, list) else []
            print(f"   Sent {len(notes)} notes")
        
        # Test getting unread count
        success, response = self.run_test(
            "Get unread count",
            "GET",
            "notes/unread-count",
            200,
            token=self.user2_token
        )
        
        if success:
            print(f"   Unread count: {response.get('count')}")
        
        # Test marking note as read
        if note_id:
            self.run_test(
                "Mark note as read",
                "POST",
                f"notes/{note_id}/read",
                200,
                token=self.user2_token
            )

    def test_date_ideas_system(self):
        """Test date ideas system"""
        print("\n=== DATE IDEAS SYSTEM TESTS ===")
        
        if not self.user1_token or not self.user2_token:
            print("❌ Skipping date ideas tests - missing tokens")
            return
        
        # Test generating a date idea
        success, response = self.run_test(
            "Generate date idea",
            "POST",
            "dates/generate",
            200,
            data={
                "budget": "medium",
                "mood": "romantic",
                "location_type": "any"
            },
            token=self.user1_token
        )
        
        idea_id = None
        if success:
            idea_id = response.get('id')
            print(f"   Generated idea: {response.get('title')}")
            print(f"   Description: {response.get('description')[:50]}...")
        
        # Test getting all date ideas
        success, response = self.run_test(
            "Get all date ideas",
            "GET",
            "dates",
            200,
            token=self.user1_token
        )
        
        if success:
            ideas = response if isinstance(response, list) else []
            print(f"   Found {len(ideas)} date ideas")
        
        # Test toggling favorite
        if idea_id:
            success, response = self.run_test(
                "Toggle favorite",
                "POST",
                f"dates/{idea_id}/favorite",
                200,
                token=self.user1_token
            )
            
            if success:
                print(f"   Favorite status: {response.get('is_favorite')}")
        
        # Test marking as complete
        if idea_id:
            success, response = self.run_test(
                "Mark as complete",
                "POST",
                f"dates/{idea_id}/complete",
                200,
                token=self.user1_token
            )
            
            if success:
                print(f"   Complete status: {response.get('is_completed')}")

    def test_memories_system(self):
        """Test memories system"""
        print("\n=== MEMORIES SYSTEM TESTS ===")
        
        if not self.user1_token or not self.user2_token:
            print("❌ Skipping memories tests - missing tokens")
            return
        
        # Test creating a memory
        success, response = self.run_test(
            "Create memory",
            "POST",
            "memories",
            200,
            data={
                "title": "Our First Test Memory",
                "description": "This is a test memory for the API testing",
                "date": "2024-01-15",
                "photo_url": "https://example.com/photo.jpg"
            },
            token=self.user1_token
        )
        
        memory_id = None
        if success:
            memory_id = response.get('id')
            print(f"   Created memory: {response.get('title')}")
            print(f"   Date: {response.get('date')}")
        
        # Test getting all memories
        success, response = self.run_test(
            "Get all memories",
            "GET",
            "memories",
            200,
            token=self.user1_token
        )
        
        if success:
            memories = response if isinstance(response, list) else []
            print(f"   Found {len(memories)} memories")
        
        # Test deleting memory (only creator can delete)
        if memory_id:
            success, response = self.run_test(
                "Delete memory",
                "DELETE",
                f"memories/{memory_id}",
                200,
                token=self.user1_token
            )
            
            if success:
                print(f"   Memory deleted successfully")

    def test_mood_system(self):
        """Test mood check-in system"""
        print("\n=== MOOD SYSTEM TESTS ===")
        
        if not self.user1_token or not self.user2_token:
            print("❌ Skipping mood tests - missing tokens")
            return
        
        # Test submitting mood
        success, response = self.run_test(
            "Submit mood",
            "POST",
            "mood",
            200,
            data={
                "mood": "happy",
                "note": "Feeling great today! Testing the API."
            },
            token=self.user1_token
        )
        
        if success:
            print(f"   Mood submitted: {response.get('mood')}")
            print(f"   Note: {response.get('note')[:30]}...")
        
        # Test getting today's mood
        success, response = self.run_test(
            "Get today's mood",
            "GET",
            "mood/today",
            200,
            token=self.user1_token
        )
        
        if success:
            user_mood = response.get('user_mood')
            partner_mood = response.get('partner_mood')
            print(f"   User mood: {user_mood.get('mood') if user_mood else 'None'}")
            print(f"   Partner mood: {partner_mood.get('mood') if partner_mood else 'None'}")
        
        # Test getting mood history
        success, response = self.run_test(
            "Get mood history",
            "GET",
            "mood/history?days=30",
            200,
            token=self.user1_token
        )
        
        if success:
            history = response if isinstance(response, list) else []
            print(f"   Found {len(history)} mood entries")

    def test_error_cases(self):
        """Test various error cases"""
        print("\n=== ERROR HANDLING TESTS ===")
        
        # Test questions without pairing (create new user)
        timestamp = int(time.time())
        unpaired_email = f"unpaired_{timestamp}@test.com"
        
        success, response = self.run_test(
            "Register unpaired user",
            "POST",
            "auth/register",
            200,
            data={
                "email": unpaired_email,
                "password": "testpass789",
                "name": "Unpaired User"
            }
        )
        
        if success:
            unpaired_token = response.get('access_token')
            
            # Test getting question without partner
            self.run_test(
                "Get question without partner",
                "GET",
                "questions/today",
                400,
                token=unpaired_token
            )
            
            # Test getting streaks without partner (should still work)
            self.run_test(
                "Get streaks without partner",
                "GET",
                "streaks",
                200,
                token=unpaired_token
            )
            
            # Test new features without partner
            self.run_test(
                "Get trivia without partner",
                "GET",
                "trivia/question",
                400,
                token=unpaired_token
            )
            
            self.run_test(
                "Send note without partner",
                "POST",
                "notes",
                400,
                data={"message": "Test note"},
                token=unpaired_token
            )
            
            self.run_test(
                "Generate date without partner",
                "POST",
                "dates/generate",
                400,
                data={"budget": "medium", "mood": "romantic"},
                token=unpaired_token
            )

def main():
    print("🚀 Starting Candle API Tests")
    print("=" * 50)
    
    tester = CandleAPITester()
    
    # Run all test suites
    tester.test_health_check()
    tester.test_user_registration()
    tester.test_user_login()
    tester.test_auth_me()
    tester.test_pairing_system()
    tester.test_questions_system()
    tester.test_streaks_system()
    
    # Test new features
    tester.test_trivia_system()
    tester.test_love_notes_system()
    tester.test_date_ideas_system()
    tester.test_memories_system()
    tester.test_mood_system()
    
    tester.test_error_cases()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend tests mostly successful!")
        return 0
    else:
        print("⚠️  Backend has significant issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())