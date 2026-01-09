import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Heart, Loader2, Sparkles, Flame } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FANTASY_PREFERENCES = {
  setting: ["Beach", "Mountains", "City", "Home", "Hotel", "Adventure"],
  vibe: [
    "Romantic",
    "Playful",
    "Adventurous",
    "Relaxing",
    "Passionate",
    "Spontaneous",
  ],
  mood: ["Tender", "Flirty", "Bold", "Sensual", "Giggly", "Intense"],
  timing: [
    "Morning",
    "Afternoon",
    "Evening",
    "Night",
    "Anytime",
    "Surprise me",
  ],
};

const CATEGORY_ICONS = {
  setting: "🏖️",
  vibe: "✨",
  mood: "🔥",
  timing: "⏰",
};

const PreferenceButton = ({ category, option, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
      selected
        ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`}
    data-testid={`pref-${category}-${option}`}
  >
    {option}
  </button>
);

export const FantasyMatcher = () => {
  const { user } = useAuth();
  const [stage, setStage] = useState("survey"); // 'survey' or 'result'
  const [preferences, setPreferences] = useState({
    setting: "",
    vibe: "",
    mood: "",
    timing: "",
  });
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/fantasy/profile`);
      if (
        response.data.preferences &&
        Object.keys(response.data.preferences).length > 0
      ) {
        setPreferences(response.data.preferences);
        setSaved(true);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const savePreferences = async () => {
    if (!Object.values(preferences).every((v) => v)) {
      toast.error("Please select all preferences");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/fantasy/profile`, preferences);
      setSaved(true);
      toast.success("Fantasy profile saved! 💕");

      // Try to get match
      setTimeout(() => {
        getMatch();
      }, 500);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const getMatch = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/fantasy/match`);
      setMatch(response.data);
      setStage("result");
    } catch (err) {
      if (err.response?.data?.detail?.includes("must complete")) {
        toast.info("Your partner needs to complete their profile first");
      } else {
        toast.error(err.response?.data?.detail || "Failed to get match");
      }
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-yellow-500";
    return "text-orange-500";
  };

  if (loading && stage === "survey") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="fantasy-matcher-page">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Flame className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Fantasy Matcher
        </h1>
        <p className="text-muted-foreground">
          Discover your romantic compatibility
        </p>
      </div>

      <AnimatePresence mode="wait">
        {stage === "survey" && (
          <motion.div
            key="survey"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {Object.entries(FANTASY_PREFERENCES).map(([category, options]) => (
              <Card key={category} className="border-border/50 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
                    <h3 className="font-semibold text-foreground capitalize">
                      {category}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => (
                      <PreferenceButton
                        key={option}
                        category={category}
                        option={option}
                        selected={preferences[category] === option}
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            [category]: option,
                          })
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={savePreferences}
              disabled={!Object.values(preferences).every((v) => v)}
              className="w-full rounded-full py-6 font-bold shadow-soft hover:shadow-hover btn-glow"
              data-testid="save-fantasy-btn"
            >
              {saved ? "Update & Check Compatibility" : "Save My Preferences"}
            </Button>

            {saved && (
              <Button
                onClick={getMatch}
                variant="secondary"
                className="w-full rounded-full py-6 font-bold"
                disabled={loading}
                data-testid="check-match-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Check Compatibility
                  </>
                )}
              </Button>
            )}
          </motion.div>
        )}

        {stage === "result" && match && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-6"
          >
            {/* Compatibility Score */}
            <Card className="border-border/50 shadow-soft bg-gradient-to-br from-primary/20 to-secondary/20">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Heart className="w-16 h-16 text-primary fill-primary" />
                  </motion.div>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  Compatibility Score
                </p>
                <p
                  className={`text-5xl font-bold mb-4 ${getCompatibilityColor(
                    match.compatibility
                  )}`}
                >
                  {match.compatibility}%
                </p>
                <p className="text-lg text-foreground font-medium">
                  {match.matches} of {match.total} preferences match!
                </p>
              </CardContent>
            </Card>

            {/* Preference Comparison */}
            <Card className="border-border/50 shadow-soft">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Your Preferences
                </h3>
                <div className="space-y-3">
                  {Object.entries(FANTASY_PREFERENCES).map(([category]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {CATEGORY_ICONS[category]}
                        </span>
                        <span className="capitalize text-muted-foreground">
                          {category}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">
                        {match.your_preferences[category]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-soft border-l-4 border-l-secondary">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  {user?.partner_name?.split(" ")[0]}'s Preferences
                </h3>
                <div className="space-y-3">
                  {Object.entries(FANTASY_PREFERENCES).map(([category]) => {
                    const matches =
                      match.your_preferences[category] ===
                      match.partner_preferences[category];
                    return (
                      <div
                        key={category}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {CATEGORY_ICONS[category]}
                          </span>
                          <span className="capitalize text-muted-foreground">
                            {category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              matches ? "text-green-500" : "text-foreground"
                            }`}
                          >
                            {match.partner_preferences[category]}
                          </span>
                          {matches && (
                            <Sparkles className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => {
                setStage("survey");
              }}
              variant="secondary"
              className="w-full rounded-full py-6 font-bold"
            >
              Update Preferences
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      {stage === "survey" && (
        <Card className="border-border/50 shadow-soft border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  Private & Personal
                </h4>
                <p className="text-sm text-muted-foreground">
                  Your fantasy preferences are only shared with your partner to
                  calculate compatibility. Be honest for the best results!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
