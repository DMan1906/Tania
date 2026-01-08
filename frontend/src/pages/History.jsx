import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Flame, Calendar, ChevronDown, ChevronUp, Clock, Heart, Laugh, Zap, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getCategoryClass = (category) => {
    return `category-${category}`;
};

const getReactionIcon = (reaction) => {
    const icons = {
        heart: Heart,
        laugh: Laugh,
        surprised: Zap,
        cry: Droplets,
        fire: Flame,
    };
    return icons[reaction] || Heart;
};

const QuestionCard = ({ question, user }) => {
    const [expanded, setExpanded] = useState(false);
    const Icon = ChevronDown;

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric' 
        });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            <Card 
                className={`border-border/50 shadow-soft cursor-pointer transition-all hover:shadow-card ${
                    !question.both_answered ? 'opacity-60' : ''
                }`}
                onClick={() => question.both_answered && setExpanded(!expanded)}
                data-testid={`question-card-${question.id}`}
            >
                <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${getCategoryClass(question.category)} text-xs`}>
                                    {question.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(question.date)}
                                </span>
                            </div>
                            <p className="text-sm text-foreground line-clamp-2">
                                {question.text}
                            </p>
                        </div>
                        {question.both_answered && (
                            <motion.div
                                animate={{ rotate: expanded ? 180 : 0 }}
                                className="text-muted-foreground"
                            >
                                <Icon className="w-5 h-5" />
                            </motion.div>
                        )}
                    </div>

                    {/* Status indicator */}
                    {!question.both_answered && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1 inline-flex items-center">
                            {question.user_answer ? 'Waiting for partner' : 'Not answered'}
                        </div>
                    )}

                    {/* Expanded answers */}
                    <AnimatePresence>
                        {expanded && question.both_answered && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-4 mt-4 border-t border-border/50 space-y-4">
                                    {/* User's answer */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                <span className="text-xs font-bold text-primary">
                                                    {user?.name?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium text-foreground">You</span>
                                            {question.user_answered_at && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(question.user_answered_at)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground pl-8">
                                            {question.user_answer}
                                        </p>
                                        {question.partner_reaction && (
                                            <div className="pl-8 flex items-center gap-1">
                                                {(() => {
                                                    const ReactionIcon = getReactionIcon(question.partner_reaction);
                                                    return <ReactionIcon className="w-4 h-4 text-primary" />;
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Partner's answer */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-secondary/30 flex items-center justify-center">
                                                <span className="text-xs font-bold text-secondary-foreground">
                                                    {user?.partner_name?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium text-foreground">
                                                {user?.partner_name?.split(' ')[0]}
                                            </span>
                                            {question.partner_answered_at && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(question.partner_answered_at)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground pl-8">
                                            {question.partner_answer}
                                        </p>
                                        {question.user_reaction && (
                                            <div className="pl-8 flex items-center gap-1">
                                                {(() => {
                                                    const ReactionIcon = getReactionIcon(question.user_reaction);
                                                    return <ReactionIcon className="w-4 h-4 text-primary" />;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export const History = () => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/questions/history`);
            setQuestions(response.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Flame className="w-12 h-12 text-primary animate-pulse-soft" />
                    <p className="text-muted-foreground">Loading history...</p>
                </div>
            </div>
        );
    }

    const answeredCount = questions.filter(q => q.both_answered).length;

    return (
        <div className="space-y-6" data-testid="history-page">
            {/* Header */}
            <div className="text-center">
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                    Question History
                </h1>
                <p className="text-muted-foreground">
                    {answeredCount} {answeredCount === 1 ? 'question' : 'questions'} answered together
                </p>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            No questions yet. Start by answering today's question!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <ScrollArea className="h-[calc(100vh-250px)]">
                    <div className="space-y-4 pr-4">
                        {questions.map((question) => (
                            <QuestionCard 
                                key={question.id} 
                                question={question} 
                                user={user}
                            />
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
};
