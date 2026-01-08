import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Smile, Meh, Frown, Sun, Cloud, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MOOD_OPTIONS = [
    { value: 'happy', label: 'Happy', icon: '😊', color: 'text-green-500', bgColor: 'bg-green-500/20' },
    { value: 'content', label: 'Content', icon: '🙂', color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
    { value: 'neutral', label: 'Neutral', icon: '😐', color: 'text-gray-500', bgColor: 'bg-gray-500/20' },
    { value: 'stressed', label: 'Stressed', icon: '😰', color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
    { value: 'sad', label: 'Sad', icon: '😢', color: 'text-purple-500', bgColor: 'bg-purple-500/20' }
];

const getMoodConfig = (mood) => {
    return MOOD_OPTIONS.find(m => m.value === mood) || MOOD_OPTIONS[2];
};

const MoodButton = ({ mood, isSelected, onClick }) => {
    const config = getMoodConfig(mood.value);
    
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                isSelected 
                    ? `${config.bgColor} ring-2 ring-primary scale-105` 
                    : 'bg-muted/30 hover:bg-muted/50'
            }`}
            data-testid={`mood-${mood.value}`}
        >
            <span className="text-3xl">{mood.icon}</span>
            <span className="text-xs font-medium text-foreground">{mood.label}</span>
        </button>
    );
};

const MoodCard = ({ mood, isPartner }) => {
    const config = getMoodConfig(mood.mood);
    
    return (
        <Card className={`border-border/50 shadow-soft ${isPartner ? 'border-l-4 border-l-secondary' : 'border-l-4 border-l-primary'}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <span className="text-2xl">{config.icon}</span>
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-foreground">{mood.user_name}</p>
                        <p className={`text-sm ${config.color}`}>{config.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{mood.date}</p>
                </div>
                {mood.note && (
                    <p className="text-sm text-muted-foreground mt-3 pl-15">{mood.note}</p>
                )}
            </CardContent>
        </Card>
    );
};

export const MoodCheckin = () => {
    const { user } = useAuth();
    const [todayMood, setTodayMood] = useState({ user_mood: null, partner_mood: null });
    const [moodHistory, setMoodHistory] = useState([]);
    const [selectedMood, setSelectedMood] = useState(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [todayRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/mood/today`),
                axios.get(`${API_URL}/mood/history?days=30`)
            ]);
            setTodayMood(todayRes.data);
            setMoodHistory(historyRes.data);
            
            if (todayRes.data.user_mood) {
                setSelectedMood(todayRes.data.user_mood.mood);
                setNote(todayRes.data.user_mood.note || '');
            }
        } catch (err) {
            console.error('Failed to fetch mood data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const submitMood = async () => {
        if (!selectedMood) {
            toast.error('Please select your mood');
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/mood`, {
                mood: selectedMood,
                note: note.trim() || null
            });
            toast.success('Mood saved! 💝');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save mood');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const userHistory = moodHistory.filter(m => m.user_id === user?.id);
    const partnerHistory = moodHistory.filter(m => m.user_id !== user?.id);

    return (
        <div className="space-y-6" data-testid="mood-checkin-page">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Sun className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                    Mood Check-in
                </h1>
                <p className="text-muted-foreground">
                    How are you feeling today?
                </p>
            </div>

            {/* Today's Check-in */}
            <Card className="border-border/50 shadow-card">
                <CardContent className="p-6">
                    <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Today's Mood
                    </h3>
                    
                    {/* Mood Buttons */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                        {MOOD_OPTIONS.map((mood) => (
                            <MoodButton
                                key={mood.value}
                                mood={mood}
                                isSelected={selectedMood === mood.value}
                                onClick={() => setSelectedMood(mood.value)}
                            />
                        ))}
                    </div>

                    {/* Note */}
                    <AnimatePresence>
                        {selectedMood && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3"
                            >
                                <Textarea
                                    placeholder="Add a note about how you're feeling (optional)"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="rounded-xl resize-none"
                                    rows={2}
                                    data-testid="mood-note-input"
                                />
                                <Button
                                    onClick={submitMood}
                                    disabled={submitting}
                                    className="w-full rounded-full py-5 font-bold shadow-soft hover:shadow-hover btn-glow"
                                    data-testid="save-mood-btn"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : todayMood.user_mood ? (
                                        'Update Mood'
                                    ) : (
                                        'Save Mood'
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* Partner's Mood */}
            {todayMood.partner_mood && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        {user?.partner_name?.split(' ')[0]}'s Mood Today
                    </h3>
                    <MoodCard mood={todayMood.partner_mood} isPartner={true} />
                </motion.div>
            )}

            {/* Mood History */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Recent Moods
                </h3>
                
                <ScrollArea className="h-[300px]">
                    {moodHistory.length === 0 ? (
                        <Card className="border-border/50">
                            <CardContent className="p-6 text-center">
                                <Meh className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No mood history yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Start tracking your moods to see patterns!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3 pr-4">
                            {moodHistory.slice(0, 20).map((mood) => (
                                <MoodCard
                                    key={mood.id}
                                    mood={mood}
                                    isPartner={mood.user_id !== user?.id}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
};
