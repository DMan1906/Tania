# Candle - Couples/Friends Connection App

## Original Problem Statement
Build a full-featured couples/friends connection app like Candle that helps couples and friends grow closer by answering curated relationship-building questions together.

## Architecture
- **Frontend**: React 19 with TailwindCSS, Framer Motion, Shadcn UI
- **Backend**: FastAPI with Firebase Admin SDK
- **Database**: Google Firebase Firestore
- **AI Integration**: Google Gemini API (native)

## Setup Documentation
- See `/app/SETUP_GUIDE.md` for complete setup instructions
- Firebase credentials: `/app/backend/firebase-credentials.json` (you provide)
- Gemini API key: Set in `/app/backend/.env`

## User Personas
1. **Couples** - Romantic partners wanting to deepen their connection
2. **Close Friends** - Best friends exploring meaningful conversations
3. **Long-distance relationships** - Staying connected through daily rituals

## Core Requirements (Static)
- User registration/login with JWT authentication
- Partner pairing with 6-character codes
- Daily AI-generated questions
- Answer submission hidden until both answer
- Streak tracking and gamification
- Question history

## What's Been Implemented (January 2026)

### Phase 1 - Core Features (Complete)
- ✅ User registration/login with JWT
- ✅ Pairing code generation (6 chars, 24hr expiry)
- ✅ Partner connection
- ✅ Today's question (Gemini AI integration)
- ✅ Answer submission with reveal system
- ✅ Reaction system (heart, laugh, surprised, cry, fire)
- ✅ Question history
- ✅ Streak tracking with milestones (7, 14, 30, 60, 100, 365 days)

### Phase 2 - 5 New Couple Features (Complete)
- ✅ **Trivia Game** - "How well do you know me?" quiz
  - AI-generated questions about preferences, memories, favorites
  - Score tracking between partners
  - 6 categories: favorites, memories, preferences, dreams, habits, personality
  
- ✅ **Love Notes** - Send sweet messages
  - Text notes with emoji reactions
  - Received/Sent tabs
  - Unread notification badge
  
- ✅ **Date Ideas Generator** - AI-powered suggestions
  - Budget selector (low/medium/high)
  - Mood selector (romantic/adventurous/relaxed/fun)
  - Location type (indoor/outdoor/any)
  - Favorite and mark complete functionality
  
- ✅ **Memory Timeline** - Capture special moments
  - Add memories with title, date, description, photo URL
  - Timeline view grouped by year
  - Delete own memories
  
- ✅ **Mood Check-in** - Daily mood tracker
  - 5 mood options: happy, content, neutral, stressed, sad
  - Optional notes
  - See partner's mood
  - Mood history tracking

### Frontend Pages
- ✅ Landing page with Candle branding
- ✅ Registration/Login pages
- ✅ Pairing page (generate/enter code)
- ✅ Home page with streak + feature cards
- ✅ Today's Question page
- ✅ Trivia Game page
- ✅ Love Notes page
- ✅ Date Ideas page
- ✅ Memories timeline page
- ✅ Mood Check-in page
- ✅ History page
- ✅ Profile page with stats
- ✅ Slide-out navigation menu
- ✅ Bottom navigation bar

## Prioritized Backlog

### P0 - Critical (Complete)
- [x] User authentication
- [x] Partner pairing
- [x] Daily questions
- [x] All 5 couple features

### P1 - Important (Future)
- [ ] Real-time WebSocket updates
- [ ] Push notifications
- [ ] Dark mode toggle
- [ ] Photo upload for memories

### P2 - Nice to Have
- [ ] Custom question packs
- [ ] Voice note answers
- [ ] Streak recovery option
- [ ] Share achievements
- [ ] Anniversary reminders

## Next Tasks
1. Add real-time WebSocket for instant notifications
2. Implement photo upload for memories (currently URL-based)
3. Add push notifications for daily reminders
4. Implement dark mode toggle
5. Add achievement badges system
