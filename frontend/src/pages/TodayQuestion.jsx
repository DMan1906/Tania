import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Heart, Laugh, Zap, Droplets, Flame, Send, Loader2, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REACTIONS = [
    { id: 'heart', icon: Heart, label: 'Love' },
    { id: 'laugh', icon: Laugh, label: 'Haha' },
    { id: 'surprised', icon: Zap, label: 'Wow' },
    { id: 'cry', icon: Droplets, label: 'Aww' },
    { id: 'fire', icon: Flame, label: 'Fire' },
];

const getCategoryClass = (category) => {
    return `category-${category}`;
};

export const TodayQuestion = () => {
    const { user } = useAuth();
    const { questions: realtimeQuestions, lastUpdate } = useRealtime();
    const [question, setQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState(null);

    const fetchQuestion = useCallback(async (signal) => {
        try {
            const response = await axios.get(`${API_URL}/questions/today`, { signal });
            setQuestion(response.data);
            if (response.data.user_reaction) {
                setSelectedReaction(response.data.user_reaction);
            }
        } catch (err) {
            if (err.name !== 'CanceledError') {
                toast.error(err.response?.data?.detail || 'Failed to load question');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const abortController = new AbortController();
        fetchQuestion(abortController.signal);
        return () => abortController.abort();
    }, [fetchQuestion]);

    // Real-time update when partner answers or reacts
    useEffect(() => {
        if (realtimeQuestions && lastUpdate) {
            // Partner answered or reacted - refetch to get latest data
            const abortController = new AbortController();
            fetchQuestion(abortController.signal);
            if (realtimeQuestions.event === 'answer_submitted' && realtimeQuestions.user_id !== user?.id) {
                toast.success(`${realtimeQuestions.user_name} just answered!`);
            }
            return () => abortController.abort();
        }
    }, [realtimeQuestions, lastUpdate, fetchQuestion, user?.id]);

    // Fallback polling for partner's answer - only poll if waiting for their answer
    // Use 60s interval instead of 30s to reduce unnecessary requests and let cache work
    useEffect(() => {
        if (question?.user_answer && !question?.both_answered) {
            const abortController = new AbortController();
            const interval = setInterval(() => fetchQuestion(abortController.signal), 60000);
            return () => {
                clearInterval(interval);
                abortController.abort();
            };
        }
    }, [question, fetchQuestion]);

    const handleSubmit = async () => {
        if (!answer.trim()) {
            toast.error('Please write an answer');
            return;
        }

        if (answer.length > 500) {
            toast.error('Answer must be 500 characters or less');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post(`${API_URL}/questions/answer`, {
                question_id: question.id,
                answer_text: answer.trim()
            });
            setQuestion(response.data);
            setAnswer('');
            
            if (response.data.both_answered) {
                toast.success('Both answered! Check out your responses!');
            } else {
                toast.success('Answer submitted! Waiting for your partner...');
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to submit answer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReaction = async (reactionId) => {
        try {
            await axios.post(`${API_URL}/questions/react`, {
                question_id: question.id,
                reaction: reactionId
            });
            setSelectedReaction(reactionId);
            setQuestion(prev => ({ ...prev, user_reaction: reactionId }));
            toast.success('Reaction added!');
        } catch (err) {
            toast.error('Failed to add reaction');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Flame className="w-12 h-12 text-primary animate-pulse-soft" />
                    <p className="text-muted-foreground">Loading today's question...</p>
                </div>
            </div>
        );
    }

    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <p className="text-muted-foreground mb-4">No question available</p>
                <Button onClick={fetchQuestion} variant="outline" className="rounded-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <Badge className={`${getCategoryClass(question.category)} px-3 py-1 mb-2`}>
                    {question.category}
                </Badge>
                <h1 className="font-serif text-2xl font-bold text-foreground">
                    Today's Question
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {new Date(question.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>

            {/* Question Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="border-border/50 shadow-card question-card">
                    <CardContent className="p-6 relative z-10">
                        <p className="font-serif text-xl md:text-2xl text-foreground leading-relaxed" data-testid="question-text">
                            {question.text}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Answer Section */}
            <AnimatePresence mode="wait">
                {!question.user_answer ? (
                    /* Input Section */
                    <motion.div
                        key="input"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <Card className="border-border/50">
                            <CardContent className="p-4">
                                <Textarea
                                    placeholder="Share your thoughts..."
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    className="min-h-[120px] border-0 focus-visible:ring-0 resize-none text-base"
                                    maxLength={500}
                                    data-testid="answer-input"
                                />
                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                    <span>{answer.length}/500 characters</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !answer.trim()}
                            className="w-full rounded-full py-6 font-bold shadow-soft hover:shadow-hover transition-all btn-glow"
                            data-testid="submit-answer-btn"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Answer
                                </>
                            )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Your answer will be hidden until {user?.partner_name?.split(' ')[0]} answers too
                        </p>
                    </motion.div>
                ) : !question.both_answered ? (
                    /* Waiting State */
                    <motion.div
                        key="waiting"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                    >
                        <Card className="border-border/50 bg-secondary/10">
                            <CardContent className="p-6">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8 text-accent" />
                                    </div>
                                    <h3 className="font-serif text-lg font-bold text-foreground mb-2">
                                        You've answered!
                                    </h3>
                                    <div className="waiting-dots flex justify-center gap-1 mb-2">
                                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                                    </div>
                                    <p className="text-muted-foreground">
                                        Waiting for {user?.partner_name?.split(' ')[0]} to answer...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50">
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground mb-2">Your answer:</p>
                                <p className="text-foreground" data-testid="user-answer-preview">{question.user_answer}</p>
                            </CardContent>
                        </Card>

                        <Button
                            variant="outline"
                            onClick={fetchQuestion}
                            className="w-full rounded-full"
                            data-testid="refresh-btn"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Check for partner's answer
                        </Button>
                    </motion.div>
                ) : (
                    /* Reveal State */
                    <motion.div
                        key="reveal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4"
                            >
                                <Heart className="w-8 h-8 text-accent fill-current" />
                            </motion.div>
                            <h3 className="font-serif text-xl font-bold text-foreground">
                                Your Answers
                            </h3>
                        </div>

                        {/* User's Answer */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="border-border/50 border-l-4 border-l-primary">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                            <span className="text-sm font-bold text-primary">
                                                {user?.name?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="font-medium text-foreground">{user?.name}</span>
                                    </div>
                                    <p className="text-foreground pl-10" data-testid="user-answer">
                                        {question.user_answer}
                                    </p>
                                    {question.partner_reaction && (
                                        <div className="pl-10 mt-2">
                                            <span className="text-xs text-muted-foreground">
                                                {user?.partner_name?.split(' ')[0]} reacted: {question.partner_reaction}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Partner's Answer */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="border-border/50 border-l-4 border-l-secondary">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center">
                                            <span className="text-sm font-bold text-secondary-foreground">
                                                {user?.partner_name?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="font-medium text-foreground">{user?.partner_name}</span>
                                    </div>
                                    <p className="text-foreground pl-10" data-testid="partner-answer">
                                        {question.partner_answer}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Reactions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="space-y-2"
                        >
                            <p className="text-sm text-muted-foreground text-center">
                                React to {user?.partner_name?.split(' ')[0]}'s answer
                            </p>
                            <div className="flex justify-center gap-2">
                                {REACTIONS.map((reaction) => {
                                    const Icon = reaction.icon;
                                    const isSelected = selectedReaction === reaction.id;
                                    return (
                                        <button
                                            key={reaction.id}
                                            onClick={() => handleReaction(reaction.id)}
                                            className={`p-3 rounded-full transition-all ${
                                                isSelected 
                                                    ? 'bg-primary text-primary-foreground scale-110' 
                                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                            }`}
                                            data-testid={`reaction-${reaction.id}`}
                                            title={reaction.label}
                                        >
                                            <Icon className={`w-5 h-5 ${isSelected ? 'fill-current' : ''}`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
