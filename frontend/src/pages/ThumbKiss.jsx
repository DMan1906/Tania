import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRealtime } from "../contexts/RealtimeContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ThumbKiss = () => {
  const { user } = useAuth();
  const {
    thumbKiss: realtimeThumbKiss,
    lastUpdate,
    isConnected,
  } = useRealtime();
  const [kissCount, setKissCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastKissTime, setLastKissTime] = useState(null);
  const [receivedKiss, setReceivedKiss] = useState(false);
  const [pollingTimeout, setPollingTimeout] = useState(null);

  const fetchKissCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/thumb-kiss/count`);
      setKissCount(response.data.count);
    } catch (err) {
      console.error("Failed to fetch kiss count:", err);
    }
  }, []);

  useEffect(() => {
    fetchKissCount();
    setLoading(false);
  }, [fetchKissCount]);

  // Real-time update when partner sends thumb kiss
  useEffect(() => {
    if (realtimeThumbKiss && lastUpdate) {
      if (realtimeThumbKiss.from_user_id !== user?.id) {
        // We received a kiss from partner
        setReceivedKiss(true);
        setKissCount((prev) => prev + 1);
        toast.success(
          `💋 ${user?.partner_name?.split(" ")[0]} sent you a thumb kiss!`,
          {
            icon: "👆",
          }
        );

        // Reset animation after 2 seconds
        setTimeout(() => setReceivedKiss(false), 2000);
      }
    }
  }, [realtimeThumbKiss, lastUpdate, user?.id, user?.partner_name]);

  // Polling fallback when RTDB is not connected
  useEffect(() => {
    if (isConnected) {
      // Clear polling if RTDB is connected
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
        setPollingTimeout(null);
      }
      return;
    }

    // Poll kiss count every 10 seconds when RTDB not connected
    const timeout = setTimeout(() => {
      fetchKissCount();
    }, 10000);

    setPollingTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isConnected, pollingTimeout, fetchKissCount]);

  const sendThumbKiss = async () => {
    setSending(true);
    try {
      await axios.post(`${API_URL}/thumb-kiss`);
      setLastKissTime(new Date());
      toast.success("Thumb kiss sent! 👆💋", {
        icon: "💕",
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send thumb kiss");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="thumb-kiss-page">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">👆</span>
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Thumb Kiss
        </h1>
        <p className="text-muted-foreground">
          A sweet way to show affection in real-time
        </p>
      </div>

      {/* Stats Card */}
      <Card className="border-border/50 shadow-soft bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Today's Kisses
              </p>
              <p
                className="text-4xl font-bold text-primary"
                data-testid="kiss-count"
              >
                {kissCount}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-sm text-muted-foreground mb-2">Last Kiss</p>
              <p className="text-lg font-medium text-foreground">
                {lastKissTime
                  ? lastKissTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Touch Area */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <Button
            onClick={sendThumbKiss}
            disabled={sending}
            className="w-full h-64 rounded-3xl bg-gradient-to-br from-primary to-secondary hover:shadow-glow shadow-soft text-white font-bold text-2xl flex flex-col items-center justify-center gap-4 transition-all disabled:opacity-50"
            data-testid="send-kiss-btn"
          >
            {!sending && (
              <>
                <span className="text-6xl animate-bounce">👆</span>
                <span>Press to Send Thumb Kiss</span>
              </>
            )}
            {sending && (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>Sending...</span>
              </>
            )}
          </Button>

          {/* Received Kiss Animation */}
          {receivedKiss && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                animate={{ y: [-20, 20, -20] }}
                transition={{ duration: 0.6 }}
                className="text-6xl"
              >
                💋
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="border-border/50 shadow-soft border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  Instant Connection
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your partner receives your thumb kiss in real-time with a
                  special notification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-soft border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-secondary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  Small But Meaningful
                </h3>
                <p className="text-sm text-muted-foreground">
                  A simple gesture that says "I'm thinking of you" even when
                  apart.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <Card className="border-border/50 shadow-soft">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Partner: {user?.partner_name}
          </p>
          <p className="text-xs text-muted-foreground">
            Total kisses sent and received are tracked for today
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
