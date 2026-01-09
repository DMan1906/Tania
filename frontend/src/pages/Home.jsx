import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRealtime } from "../contexts/RealtimeContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Flame,
  MessageCircle,
  Heart,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Brain,
  Calendar,
  Camera,
  Sun,
} from "lucide-react";
import { motion } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FeatureCard = ({ icon: Icon, title, description, to, color, delay }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={() => navigate(to)}
      className="cursor-pointer"
    >
      <Card className="border-border/50 shadow-soft hover:shadow-card transition-all hover:scale-[1.02] active:scale-[0.98]">
        <CardContent className="p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${color} flex items-center justify-center flex-shrink-0`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {description}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MilestoneItem = ({ emoji, label, days }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      <span>{emoji}</span>
      {label}
    </span>
    <span className="text-sm font-semibold text-foreground">
      {days !== null ? `${days} days` : "Not set"}
    </span>
  </div>
);

export const Home = () => {
  const navigate = useNavigate();
  const { user, isPaired, forceRefresh } = useAuth();
  const {
    questions: realtimeQuestions,
    moods: realtimeMoods,
    notes: realtimeNotes,
    milestones: realtimeMilestones,
    lastUpdate,
  } = useRealtime();
  const [streak, setStreak] = useState({
    current_streak: 0,
    longest_streak: 0,
    milestones: [],
  });
  const [todayQuestion, setTodayQuestion] = useState(null);
  const [todayMood, setTodayMood] = useState({
    user_mood: null,
    partner_mood: null,
  });
  const [unreadNotes, setUnreadNotes] = useState(0);
  const [relationshipMilestones, setRelationshipMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isPaired) {
      setLoading(false);
      return;
    }

    try {
      const [streakRes, questionRes, moodRes, notesRes, milestonesRes] =
        await Promise.all([
          axios.get(`${API_URL}/streaks`),
          axios.get(`${API_URL}/questions/today`),
          axios.get(`${API_URL}/mood/today`),
          axios.get(`${API_URL}/notes/unread-count`),
          axios.get(`${API_URL}/milestones`),
        ]);
      setStreak(streakRes.data);
      setTodayQuestion(questionRes.data);
      setTodayMood(moodRes.data);
      setUnreadNotes(notesRes.data.count);
      setRelationshipMilestones(milestonesRes.data);
    } catch (err) {
      console.error("Failed to fetch home data:", err);
    } finally {
      setLoading(false);
    }
  }, [isPaired]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Soft reload every 1 second
  useEffect(() => {
    if (forceRefresh > 0) {
      fetchData();
    }
  }, [forceRefresh, fetchData]);

  // Re-fetch data when real-time updates arrive
  useEffect(() => {
    if (lastUpdate && !loading) {
      // Silently refresh data in background
      const refreshData = async () => {
        try {
          const [questionRes, moodRes, notesRes, milestonesRes] =
            await Promise.all([
              axios.get(`${API_URL}/questions/today`),
              axios.get(`${API_URL}/mood/today`),
              axios.get(`${API_URL}/notes/unread-count`),
              axios.get(`${API_URL}/milestones`),
            ]);
          setTodayQuestion(questionRes.data);
          setTodayMood(moodRes.data);
          setUnreadNotes(notesRes.data.count);
          setRelationshipMilestones(milestonesRes.data);
        } catch (err) {
          console.error("Failed to refresh data:", err);
        }
      };
      refreshData();
    }
  }, [lastUpdate, loading]);

  useEffect(() => {
    if (!loading && !isPaired) {
      navigate("/pairing");
    }
  }, [loading, isPaired, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Flame className="w-12 h-12 text-primary animate-pulse-soft" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getQuestionStatus = () => {
    if (!todayQuestion) return "no_question";
    if (todayQuestion.both_answered) return "both_answered";
    if (todayQuestion.user_answer) return "waiting_partner";
    return "unanswered";
  };

  const status = getQuestionStatus();
  const greeting =
    new Date().getHours() < 12
      ? "Morning"
      : new Date().getHours() < 18
      ? "Afternoon"
      : "Evening";

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
          Good {greeting}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          You & {user?.partner_name?.split(" ")[0]} are on a journey together
        </p>
      </motion.div>

      {/* Streak Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-border/50 shadow-card overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Current Streak
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl font-bold text-foreground"
                    data-testid="streak-count"
                  >
                    {streak.current_streak}
                  </span>
                  <span className="text-lg text-muted-foreground">days</span>
                </div>
                {streak.longest_streak > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Best: {streak.longest_streak} days
                  </p>
                )}
              </div>
              <div className="relative">
                <Flame className="w-16 h-16 text-primary streak-flame" />
                {streak.current_streak > 0 && (
                  <Sparkles className="w-6 h-6 text-secondary absolute -top-1 -right-1 animate-pulse" />
                )}
              </div>
            </div>

            {streak.milestones && streak.milestones.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-2">
                  Milestones reached
                </p>
                <div className="flex gap-2 flex-wrap">
                  {streak.milestones.map((m) => (
                    <span
                      key={m}
                      className="px-3 py-1 bg-accent/20 text-accent text-xs font-medium rounded-full"
                    >
                      {m} days
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Question Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 shadow-card question-card">
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-lg font-bold text-foreground">
                Today's Question
              </h2>
            </div>

            {status === "both_answered" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-accent">
                  <Heart className="w-5 h-5 fill-current" />
                  <span className="font-medium">You both answered!</span>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  "{todayQuestion?.text}"
                </p>
                <Button
                  onClick={() => navigate("/question")}
                  className="w-full rounded-full py-5 font-bold shadow-soft hover:shadow-hover transition-all"
                  data-testid="view-answers-btn"
                >
                  View Both Answers
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {status === "waiting_partner" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-secondary-foreground">
                  <div className="waiting-dots flex gap-1">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                  </div>
                  <span className="font-medium">
                    Waiting for {user?.partner_name?.split(" ")[0]}...
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  You've answered! Once your partner answers, you'll both see
                  each other's responses.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/question")}
                  className="w-full rounded-full py-5"
                  data-testid="view-question-btn"
                >
                  View Question
                </Button>
              </div>
            )}

            {status === "unanswered" && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm line-clamp-2">
                  "{todayQuestion?.text}"
                </p>
                <Button
                  onClick={() => navigate("/question")}
                  className="w-full rounded-full py-5 font-bold shadow-soft hover:shadow-hover transition-all btn-glow"
                  data-testid="answer-question-btn"
                >
                  Answer Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Partner Mood Widget */}
      {todayMood.partner_mood && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/50 shadow-soft bg-secondary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {todayMood.partner_mood.mood === "happy" && "😊"}
                  {todayMood.partner_mood.mood === "content" && "🙂"}
                  {todayMood.partner_mood.mood === "neutral" && "😐"}
                  {todayMood.partner_mood.mood === "stressed" && "😰"}
                  {todayMood.partner_mood.mood === "sad" && "😢"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {user?.partner_name?.split(" ")[0]} is feeling{" "}
                    {todayMood.partner_mood.mood}
                  </p>
                  {todayMood.partner_mood.note && (
                    <p className="text-xs text-muted-foreground truncate">
                      {todayMood.partner_mood.note}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/mood")}
                  className="rounded-full"
                >
                  <Sun className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Relationship Milestones Card */}
      {relationshipMilestones.some((m) => m.days_since !== null) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
        >
          <Card className="border-border/50 shadow-soft bg-gradient-to-br from-pink-500/5 to-rose-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                Loving You For...
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/30">
                {relationshipMilestones.map((milestone) => {
                  if (milestone.days_since === null) return null;
                  const emojiMap = {
                    started_talking: "💬",
                    first_met: "👋",
                    became_official: "💕",
                    first_intimate: "💋",
                    first_sex: "🔥",
                  };
                  return (
                    <MilestoneItem
                      key={milestone.name}
                      emoji={emojiMap[milestone.name] || "❤️"}
                      label={milestone.label}
                      days={milestone.days_since}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Explore Together
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <FeatureCard
            icon={Brain}
            title="Trivia Game"
            description="Test how well you know each other"
            to="/trivia"
            color="bg-purple-500/20 text-purple-500"
            delay={0.35}
          />
          <FeatureCard
            icon={Heart}
            title="Love Notes"
            description={
              unreadNotes > 0
                ? `${unreadNotes} unread note${unreadNotes > 1 ? "s" : ""}`
                : "Send sweet messages"
            }
            to="/notes"
            color="bg-pink-500/20 text-pink-500"
            delay={0.4}
          />
          <FeatureCard
            icon={Calendar}
            title="Date Ideas"
            description="AI-powered date suggestions"
            to="/dates"
            color="bg-blue-500/20 text-blue-500"
            delay={0.45}
          />
          <FeatureCard
            icon={Camera}
            title="Memories"
            description="Capture your special moments"
            to="/memories"
            color="bg-amber-500/20 text-amber-500"
            delay={0.5}
          />
          <FeatureCard
            icon={Sun}
            title="Mood Check-in"
            description={
              !todayMood.user_mood
                ? "How are you feeling today?"
                : "Update your mood"
            }
            to="/mood"
            color="bg-green-500/20 text-green-500"
            delay={0.55}
          />
        </div>
      </motion.div>

      {/* Partner info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center py-4"
      >
        <p className="text-sm text-muted-foreground">
          Connected with{" "}
          <span className="font-medium text-foreground">
            {user?.partner_name}
          </span>
        </p>
      </motion.div>
    </div>
  );
};
