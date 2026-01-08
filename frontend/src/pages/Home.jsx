import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Flame, MessageCircle, Heart, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Home = () => {
    const navigate = useNavigate();
    const { user, isPaired } = useAuth();
    const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, milestones: [] });
    const [todayQuestion, setTodayQuestion] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!isPaired) {
            setLoading(false);
            return;
        }
        
        try {
            const [streakRes, questionRes] = await Promise.all([
                axios.get(`${API_URL}/streaks`),
                axios.get(`${API_URL}/questions/today`)
            ]);
            setStreak(streakRes.data);
            setTodayQuestion(questionRes.data);
        } catch (err) {
            console.error('Failed to fetch home data:', err);
        } finally {
            setLoading(false);
        }
    }, [isPaired]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Redirect to pairing if not paired
    useEffect(() => {
        if (!loading && !isPaired) {
            navigate('/pairing');
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
        if (!todayQuestion) return 'no_question';
        if (todayQuestion.both_answered) return 'both_answered';
        if (todayQuestion.user_answer) return 'waiting_partner';
        return 'unanswered';
    };

    const status = getQuestionStatus();

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}
                </h1>
                <p className="text-muted-foreground">
                    You & {user?.partner_name?.split(' ')[0]} are on a journey together
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
                                <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold text-foreground" data-testid="streak-count">
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

                        {/* Milestones */}
                        {streak.milestones && streak.milestones.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border/30">
                                <p className="text-xs text-muted-foreground mb-2">Milestones reached</p>
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
                            <h2 className="font-serif text-lg font-bold text-foreground">Today's Question</h2>
                        </div>

                        {status === 'both_answered' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-accent">
                                    <Heart className="w-5 h-5 fill-current" />
                                    <span className="font-medium">You both answered!</span>
                                </div>
                                <p className="text-muted-foreground text-sm line-clamp-2">
                                    "{todayQuestion?.text}"
                                </p>
                                <Button
                                    onClick={() => navigate('/question')}
                                    className="w-full rounded-full py-5 font-bold shadow-soft hover:shadow-hover transition-all"
                                    data-testid="view-answers-btn"
                                >
                                    View Both Answers
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}

                        {status === 'waiting_partner' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-secondary-foreground">
                                    <div className="waiting-dots flex gap-1">
                                        <span className="w-2 h-2 bg-secondary rounded-full"></span>
                                        <span className="w-2 h-2 bg-secondary rounded-full"></span>
                                        <span className="w-2 h-2 bg-secondary rounded-full"></span>
                                    </div>
                                    <span className="font-medium">Waiting for {user?.partner_name?.split(' ')[0]}...</span>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    You've answered! Once your partner answers, you'll both see each other's responses.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/question')}
                                    className="w-full rounded-full py-5"
                                    data-testid="view-question-btn"
                                >
                                    View Question
                                </Button>
                            </div>
                        )}

                        {status === 'unanswered' && (
                            <div className="space-y-4">
                                <p className="text-muted-foreground text-sm line-clamp-2">
                                    "{todayQuestion?.text}"
                                </p>
                                <Button
                                    onClick={() => navigate('/question')}
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

            {/* Partner info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center py-4"
            >
                <p className="text-sm text-muted-foreground">
                    Connected with <span className="font-medium text-foreground">{user?.partner_name}</span>
                </p>
            </motion.div>
        </div>
    );
};
