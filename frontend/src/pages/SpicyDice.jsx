import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRealtime } from "../contexts/RealtimeContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Loader2, Flame } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DiceFace = ({ number, rotating }) => (
  <motion.div
    animate={rotating ? { rotateX: 360, rotateY: 360 } : {}}
    transition={{ duration: 0.6, repeat: rotating ? Infinity : 0 }}
    className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-4xl font-bold shadow-lg"
  >
    {number}
  </motion.div>
);

export const SpicyDice = () => {
  const { user } = useAuth();
  const { spicy_dice: realtimeRoll, lastUpdate, isConnected } = useRealtime();
  const [currentRoll, setCurrentRoll] = useState(null);
  const [history, setHistory] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pollingTimeout, setPollingTimeout] = useState(null);
  const [partnerRoll, setPartnerRoll] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/spicy-dice/history`);
      setHistory(response.data.rolls);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    setLoading(false);
  }, [fetchHistory]);

  // Real-time update when partner rolls
  useEffect(() => {
    if (realtimeRoll && lastUpdate) {
      if (
        realtimeRoll.event === "dice_rolled" &&
        realtimeRoll.user_id !== user?.id
      ) {
        // Partner rolled
        setPartnerRoll(realtimeRoll);
        toast.success(
          `🎲 ${realtimeRoll.user_name} rolled: ${realtimeRoll.activity}`,
          { icon: "🔥" }
        );
        fetchHistory();
      }
    }
  }, [realtimeRoll, lastUpdate, user?.id, fetchHistory]);

  // Polling fallback when RTDB is not connected
  useEffect(() => {
    if (isConnected) {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
        setPollingTimeout(null);
      }
      return;
    }

    const timeout = setTimeout(() => {
      fetchHistory();
    }, 10000);

    setPollingTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isConnected, pollingTimeout, fetchHistory]);

  const rollDice = async () => {
    setRolling(true);
    setDice1(Math.floor(Math.random() * 6) + 1);
    setDice2(Math.floor(Math.random() * 6) + 1);

    try {
      const response = await axios.post(`${API_URL}/spicy-dice/roll`);
      setCurrentRoll(response.data);
      toast.success(`🎲 ${response.data.activity}`, { icon: "🔥" });

      // Refresh history after a short delay
      setTimeout(() => {
        fetchHistory();
      }, 500);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to roll dice");
    } finally {
      setRolling(false);
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
    <div className="space-y-6" data-testid="spicy-dice-page">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🎲</span>
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Spicy Dice
        </h1>
        <p className="text-muted-foreground">
          Let fate decide your next adventure
        </p>
      </div>

      {/* Current Roll Display */}
      <Card className="border-border/50 shadow-soft bg-gradient-to-br from-primary/10 to-secondary/10">
        <CardContent className="p-8">
          <div className="flex justify-center gap-4 mb-6">
            <DiceFace number={dice1} rotating={rolling} />
            <DiceFace number={dice2} rotating={rolling} />
          </div>

          <Button
            onClick={rollDice}
            disabled={rolling}
            className="w-full rounded-full py-6 font-bold text-lg shadow-soft hover:shadow-hover btn-glow"
            data-testid="roll-dice-btn"
          >
            {rolling ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Rolling...
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 mr-2" />
                Roll the Dice
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Activity */}
      <AnimatePresence>
        {currentRoll && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-border/50 shadow-soft border-l-4 border-l-primary">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Your Activity
                </p>
                <p className="text-xl font-semibold text-foreground mb-3">
                  {currentRoll.activity}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dice: {currentRoll.dice1} + {currentRoll.dice2} ={" "}
                  {currentRoll.activity_num}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partner's Last Roll */}
      <AnimatePresence>
        {partnerRoll && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-border/50 shadow-soft border-l-4 border-l-secondary">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">
                  {partnerRoll.user_name}'s Activity
                </p>
                <p className="text-xl font-semibold text-foreground mb-3">
                  {partnerRoll.activity}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dice: {partnerRoll.dice1} + {partnerRoll.dice2} ={" "}
                  {partnerRoll.activity_num}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roll History */}
      {history.length > 0 && (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Rolls</h3>
            <ScrollArea className="h-80">
              <div className="space-y-3 pr-4">
                {history.map((roll, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border border-border/30 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-foreground text-sm">
                        {roll.user_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {roll.dice1} + {roll.dice2}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {roll.activity}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(roll.created_at).toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-border/50 shadow-soft border-l-4 border-l-accent">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 Roll together and explore activities that might spark some fun!
            Each combination (1-36) has a unique suggestion to keep things
            exciting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
