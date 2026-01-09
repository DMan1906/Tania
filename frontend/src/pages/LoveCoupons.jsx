import { useState, useEffect, useCallback } from "react";
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
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Ticket, Plus, Gift, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EMOJI_OPTIONS = [
  "🎟️",
  "💆",
  "🍳",
  "🎬",
  "✨",
  "🤗",
  "👨‍🍳",
  "💅",
  "🎁",
  "💝",
  "🌹",
  "🍫",
];

const CouponCard = ({ coupon, isMyGift, onRedeem }) => {
  const isRedeemable = !coupon.is_redeemed && !isMyGift;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card
        className={`border-border/50 shadow-soft transition-all ${
          coupon.is_redeemed
            ? "opacity-60"
            : isRedeemable
            ? "hover:shadow-card hover:scale-[1.02]"
            : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">{coupon.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">{coupon.title}</h3>
              {coupon.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {coupon.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {isMyGift ? "You gave this" : `From ${coupon.created_by_name}`}
              </p>
            </div>
            {coupon.is_redeemed ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Check className="w-4 h-4" />
                <span className="text-xs">Redeemed</span>
              </div>
            ) : isRedeemable ? (
              <Button
                size="sm"
                onClick={() => onRedeem(coupon.id)}
                className="rounded-full"
              >
                Redeem
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const LoveCoupons = () => {
  const { user } = useAuth();
  const { lastUpdate, isConnected } = useRealtime();
  const [coupons, setCoupons] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    title: "",
    description: "",
    emoji: "🎟️",
  });

  const fetchData = useCallback(async () => {
    try {
      const [couponsRes, templatesRes] = await Promise.all([
        axios.get(`${API_URL}/coupons`),
        axios.get(`${API_URL}/coupons/templates`),
      ]);
      setCoupons(couponsRes.data);
      setTemplates(templatesRes.data);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (lastUpdate) {
      fetchData();
    }
  }, [lastUpdate, fetchData]);

  // Poll fallback when RTDB not connected
  useEffect(() => {
    if (isConnected) return;
    const iv = setInterval(() => fetchData(), 15000);
    return () => clearInterval(iv);
  }, [isConnected, fetchData]);

  const createCoupon = async (title, description, emoji) => {
    setCreating(true);
    try {
      await axios.post(`${API_URL}/coupons`, {
        title,
        description: description || null,
        emoji: emoji || "🎟️",
      });
      toast.success(`Coupon created for ${user?.partner_name}! 🎁`);
      setNewCoupon({ title: "", description: "", emoji: "🎟️" });
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  const redeemCoupon = async (couponId) => {
    try {
      await axios.post(`${API_URL}/coupons/${couponId}/redeem`);
      toast.success("Coupon redeemed! 🎉");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to redeem coupon");
    }
  };

  const myCoupons = coupons.filter(
    (c) => c.created_by !== user?.id && !c.is_redeemed
  );
  const givenCoupons = coupons.filter((c) => c.created_by === user?.id);
  const redeemedCoupons = coupons.filter((c) => c.is_redeemed);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Love Coupons
        </h1>
        <p className="text-muted-foreground">Give & redeem special treats</p>
      </div>

      {/* Create Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full rounded-full py-6 font-bold shadow-soft">
            <Plus className="w-5 h-5 mr-2" />
            Create Coupon for {user?.partner_name?.split(" ")[0]}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Love Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Quick Templates */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Quick templates:
              </p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      setNewCoupon({
                        ...newCoupon,
                        title: t.title,
                        emoji: t.emoji,
                      })
                    }
                  >
                    {t.emoji} {t.title}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newCoupon.title}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, title: e.target.value })
                }
                placeholder="e.g., 10-Minute Massage"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                value={newCoupon.description}
                onChange={(e) =>
                  setNewCoupon({ ...newCoupon, description: e.target.value })
                }
                placeholder="Add any special conditions..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Emoji</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewCoupon({ ...newCoupon, emoji })}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      newCoupon.emoji === emoji
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() =>
                createCoupon(
                  newCoupon.title,
                  newCoupon.description,
                  newCoupon.emoji
                )
              }
              disabled={!newCoupon.title.trim() || creating}
              className="w-full rounded-full"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              Create Coupon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mine">
            My Coupons ({myCoupons.length})
          </TabsTrigger>
          <TabsTrigger value="given">Given ({givenCoupons.length})</TabsTrigger>
          <TabsTrigger value="redeemed">
            Redeemed ({redeemedCoupons.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-3 mt-4">
          {myCoupons.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No coupons yet! Ask {user?.partner_name?.split(" ")[0]} for
                  some treats 💝
                </p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {myCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  isMyGift={false}
                  onRedeem={redeemCoupon}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="given" className="space-y-3 mt-4">
          {givenCoupons.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  You haven't given any coupons yet. Create one above!
                </p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {givenCoupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} isMyGift={true} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="redeemed" className="space-y-3 mt-4">
          {redeemedCoupons.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Check className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No redeemed coupons yet</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {redeemedCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  isMyGift={coupon.created_by === user?.id}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
