# Candle - Couples/Friends Connection App

## Original Problem Statement
Build a full-featured couples/friends connection app like Candle that helps couples and friends grow closer by answering curated relationship-building questions together.

## Architecture
- **Frontend**: React 19 with TailwindCSS, Framer Motion, Shadcn UI
- **Backend**: FastAPI with Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI Integration**: Google Gemini via Emergent LLM Key

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

## What's Been Implemented (December 2025)
### Backend
- ✅ User registration/login with JWT
- ✅ Pairing code generation (6 chars, 24hr expiry)
- ✅ Partner connection
- ✅ Today's question (Gemini AI integration)
- ✅ Answer submission
- ✅ Reaction system (heart, laugh, surprised, cry, fire)
- ✅ Question history
- ✅ Streak tracking with milestones

### Frontend
- ✅ Landing page with Candle branding
- ✅ Registration/Login pages
- ✅ Pairing page (generate/enter code)
- ✅ Home page with streak display
- ✅ Today's Question page with answer flow
- ✅ History page with expandable cards
- ✅ Profile page with stats
- ✅ Bottom navigation
- ✅ Warm, cozy design (Playfair Display + Nunito fonts)

## Prioritized Backlog

### P0 - Critical (Complete)
- [x] User authentication
- [x] Partner pairing
- [x] Daily questions
- [x] Answer submission/reveal

### P1 - Important (Future)
- [ ] Real-time WebSocket updates (partner answered notification)
- [ ] Push notifications
- [ ] Dark mode toggle
- [ ] Email verification

### P2 - Nice to Have
- [ ] Custom question packs
- [ ] Photo sharing on answers
- [ ] Voice note answers
- [ ] Streak recovery option
- [ ] Share achievements

## Next Tasks
1. Add real-time WebSocket for instant partner answer notifications
2. Implement push notifications for daily reminders
3. Add dark mode toggle in settings
4. Create more question categories
5. Add onboarding tutorial for new users
