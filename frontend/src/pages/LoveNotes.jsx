import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRealtime } from "../contexts/RealtimeContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Heart,
  Send,
  Inbox,
  SendHorizontal,
  Loader2,
  Mail,
  MailOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EMOJI_OPTIONS = ["❤️", "😘", "🥰", "💕", "✨", "🌹", "💝", "🦋"];

const NoteCard = ({ note, isReceived, onMarkRead }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card
        className={`border-border/50 shadow-soft transition-all ${
          isReceived && !note.is_read
            ? "bg-primary/5 border-l-4 border-l-primary"
            : ""
        }`}
        onClick={() => isReceived && !note.is_read && onMarkRead(note.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {isReceived ? (
                note.is_read ? (
                  <MailOpen className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Mail className="w-4 h-4 text-primary" />
                )
              ) : (
                <SendHorizontal className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isReceived ? `From ${note.from_user_name}` : "Sent"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(note.created_at)}
            </span>
          </div>
          <p className="text-foreground">{note.message}</p>
          {note.emoji && (
            <span className="text-2xl mt-2 block">{note.emoji}</span>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const LoveNotes = () => {
  const { user } = useAuth();
  const { notes: realtimeNotes, lastUpdate, isConnected } = useRealtime();
  const [receivedNotes, setReceivedNotes] = useState([]);
  const [sentNotes, setSentNotes] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotes = useCallback(async () => {
    try {
      const [receivedRes, sentRes, unreadRes] = await Promise.all([
        axios.get(`${API_URL}/notes`),
        axios.get(`${API_URL}/notes/sent`),
        axios.get(`${API_URL}/notes/unread-count`),
      ]);
      setReceivedNotes(receivedRes.data);
      setSentNotes(sentRes.data);
      setUnreadCount(unreadRes.data.count);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Poll as a fallback when Realtime Database isn't connected
  useEffect(() => {
    if (isConnected) return;
    const iv = setInterval(() => {
      fetchNotes();
    }, 15000);
    return () => clearInterval(iv);
  }, [isConnected, fetchNotes]);

  // Real-time update when partner sends a note
  useEffect(() => {
    if (realtimeNotes && lastUpdate) {
      // New note received - refetch and show notification
      fetchNotes();
      if (realtimeNotes.event === "new_note") {
        toast.success(`💌 New note from ${realtimeNotes.from_user_name}!`, {
          description: realtimeNotes.preview,
        });
      }
    }
  }, [realtimeNotes, lastUpdate, fetchNotes]);

  const sendNote = async () => {
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API_URL}/notes`, {
        message: message.trim(),
        emoji: selectedEmoji,
      });
      toast.success(`Note sent to ${user?.partner_name}! 💝`);
      setMessage("");
      setSelectedEmoji(null);
      fetchNotes();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send note");
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (noteId) => {
    try {
      await axios.post(`${API_URL}/notes/${noteId}/read`);
      fetchNotes();
    } catch (err) {
      console.error("Failed to mark as read:", err);
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
    <div className="space-y-6" data-testid="love-notes-page">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-primary fill-current" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Love Notes
        </h1>
        <p className="text-muted-foreground">
          Send sweet messages to {user?.partner_name?.split(" ")[0]}
        </p>
      </div>

      {/* Compose Note */}
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-4 space-y-4">
          <Textarea
            placeholder={`Write something sweet for ${
              user?.partner_name?.split(" ")[0]
            }...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0"
            maxLength={500}
            data-testid="note-input"
          />

          {/* Emoji selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Add emoji:</span>
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() =>
                  setSelectedEmoji(selectedEmoji === emoji ? null : emoji)
                }
                className={`text-2xl p-1 rounded-lg transition-all ${
                  selectedEmoji === emoji
                    ? "bg-primary/20 scale-110"
                    : "hover:bg-muted"
                }`}
                data-testid={`emoji-${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {message.length}/500
            </span>
            <Button
              onClick={sendNote}
              disabled={sending || !message.trim()}
              className="rounded-full px-6 shadow-soft hover:shadow-hover btn-glow"
              data-testid="send-note-btn"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Tabs */}
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger
            value="received"
            className="relative"
            data-testid="tab-received"
          >
            Received
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" data-testid="tab-sent">
            Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <ScrollArea className="h-[400px]">
            {receivedNotes.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Notes from {user?.partner_name?.split(" ")[0]} will appear
                    here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 pr-4">
                <AnimatePresence>
                  {receivedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isReceived={true}
                      onMarkRead={markAsRead}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sent">
          <ScrollArea className="h-[400px]">
            {sentNotes.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No sent notes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Send your first love note above!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 pr-4">
                <AnimatePresence>
                  {sentNotes.map((note) => (
                    <NoteCard key={note.id} note={note} isReceived={false} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
