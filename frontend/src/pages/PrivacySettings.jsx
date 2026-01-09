import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRealtime } from "../contexts/RealtimeContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIVACY_OPTIONS = [
  {
    key: "share_moods",
    label: "Share Moods",
    description: "Let your partner see your daily mood check-ins",
    icon: "😊",
  },
  {
    key: "share_memories",
    label: "Share Memories",
    description: "Let your partner see your saved memories and photos",
    icon: "📸",
  },
  {
    key: "share_bucket_list",
    label: "Share Bucket List",
    description: "Let your partner see your bucket list items",
    icon: "✅",
  },
  {
    key: "share_coupons",
    label: "Share Coupons",
    description: "Let your partner see your love coupons",
    icon: "🎟️",
  },
  {
    key: "share_trivia_scores",
    label: "Share Trivia Scores",
    description: "Let your partner see your trivia game scores",
    icon: "🏆",
  },
  {
    key: "share_date_history",
    label: "Share Date History",
    description: "Let your partner see your completed dates",
    icon: "📅",
  },
  {
    key: "share_love_notes",
    label: "Share Love Notes",
    description: "Let your partner see notes between you",
    icon: "💌",
  },
  {
    key: "show_full_history",
    label: "Show Full History",
    description: "Let your partner see your complete history",
    icon: "📚",
  },
];

const PrivacyToggle = ({ option, value, onChange, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="border border-border/30 rounded-lg p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
  >
    <span className="text-2xl mt-1">{option.icon}</span>
    <div className="flex-1">
      <Label className="text-foreground font-medium block mb-1">
        {option.label}
      </Label>
      <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
    </div>
    <button
      onClick={() => onChange(!value)}
      disabled={loading}
      className={`flex-shrink-0 mt-1 p-2 rounded-lg transition-all ${
        value
          ? "bg-primary/20 text-primary hover:bg-primary/30"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
      data-testid={`privacy-toggle-${option.key}`}
    >
      {value ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
    </button>
  </motion.div>
);

export const PrivacySettings = () => {
  const { user } = useAuth();
  const { realtimeUpdates } = useRealtime();
  const [settings, setSettings] = useState(null);
  const [partnerPrivacy, setPartnerPrivacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const [mySettings, partnerSettings] = await Promise.all([
        axios.get(`${API_URL}/privacy/settings`),
        axios.get(`${API_URL}/partner/privacy`),
      ]);
      setSettings(mySettings.data);
      setPartnerPrivacy(partnerSettings.data);
    } catch (err) {
      console.error("Failed to fetch privacy settings:", err);
      toast.error("Failed to load privacy settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Listen for realtime privacy setting updates
  useEffect(() => {
    if (realtimeUpdates.privacy_settings) {
      setPartnerPrivacy(realtimeUpdates.privacy_settings);
      toast.info("Partner privacy settings updated");
    }
  }, [realtimeUpdates.privacy_settings]);

  // Polling fallback for offline/realtime issues (15s interval)
  useEffect(() => {
    const interval = setInterval(fetchSettings, 15000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  const toggleSetting = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/privacy/settings`, settings);
      toast.success("Privacy settings updated! 🔒");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save settings");
      // Revert changes
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="privacy-settings-page">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Privacy Settings
        </h1>
        <p className="text-muted-foreground">
          Control what you share with {user?.partner_name?.split(" ")[0]}
        </p>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        {PRIVACY_OPTIONS.map((option) => (
          <PrivacyToggle
            key={option.key}
            option={option}
            value={settings[option.key]}
            onChange={() => toggleSetting(option.key)}
            loading={saving}
          />
        ))}
      </div>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={saving}
        className="w-full rounded-full py-6 font-bold shadow-soft hover:shadow-hover btn-glow"
        data-testid="save-privacy-btn"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Save Privacy Settings
          </>
        )}
      </Button>

      {/* Partner's Privacy Info */}
      <Card className="border-border/50 shadow-soft bg-gradient-to-r from-secondary/10 to-accent/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-secondary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-3">
                What {user?.partner_name?.split(" ")[0]} Shares With You
              </h3>
              <div className="space-y-2">
                {PRIVACY_OPTIONS.map((option) => {
                  const isShared = partnerPrivacy?.[option.key];
                  return (
                    <div
                      key={option.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={
                          isShared ? "text-green-500" : "text-muted-foreground"
                        }
                      >
                        {isShared ? "✓" : "✗"}
                      </span>
                      <span
                        className={
                          isShared ? "text-foreground" : "text-muted-foreground"
                        }
                      >
                        {option.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-border/50 shadow-soft border-l-4 border-l-primary">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 Your privacy settings control what your partner can see. You can
            change these anytime. Your partner will always be able to see
            messages and direct interactions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
