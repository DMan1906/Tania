import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, Brain, CheckCircle, XCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Trivia = () => {
    const { user } = useAuth();
    const [question, setQuestion] = useState(null);
    const [scores, setScores] = useState({ user_score: 0, partner_score: 0, user_correct: 0, partner_correct: 0, total_questions: 0 });
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [result, setResult] = useState(null);
    const [waitingForAnswer, setWaitingForAnswer] = useState(false);
    const [settingAnswer, setSettingAnswer] = useState(null);

    const fetchScores = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/trivia/scores`);
            setScores(response.data);
        } catch (err) {
            console.error('Failed to fetch scores:', err);
        }
    }, []);

    useEffect(() => {
        fetchScores();
    }, [fetchScores]);

    const getNewQuestion = async () => {
        setLoading(true);
        setResult(null);
        setSelectedOption(null);
        setWaitingForAnswer(false);
        setSettingAnswer(null);

        try {
            const response = await axios.get(`${API_URL}/trivia/question`);
            setQuestion(response.data);
            
            // Check if this question is about the current user
            if (response.data.about_user === user?.name) {
                setSettingAnswer(response.data);
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to get question');
        } finally {
            setLoading(false);
        }
    };

    const setCorrectAnswer = async (answer) => {
        try {
            await axios.post(`${API_URL}/trivia/set-answer?trivia_id=${question.id}&answer=${encodeURIComponent(answer)}`);
            toast.success('Answer set! Now your partner can guess.');
            setSettingAnswer(null);
            setWaitingForAnswer(true);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to set answer');
        }
    };

    const submitGuess = async (option) => {
        setSelectedOption(option);
        
        try {
            const response = await axios.post(`${API_URL}/trivia/guess`, {
                trivia_id: question.id,
                selected_option: option
            });
            setResult(response.data);
            fetchScores();
        } catch (err) {
            if (err.response?.data?.detail?.includes('Waiting for partner')) {
                toast.info('Your partner needs to set the correct answer first!');
                setWaitingForAnswer(true);
            } else {
                toast.error(err.response?.data?.detail || 'Failed to submit guess');
            }
            setSelectedOption(null);
        }
    };

    return (
        <div className="space-y-6" data-testid="trivia-page">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                    How Well Do You Know Me?
                </h1>
                <p className="text-muted-foreground">
                    Test your knowledge about each other
                </p>
            </div>

            {/* Scores */}
            <Card className="border-border/50 shadow-soft bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                            <p className="text-xs text-muted-foreground mb-1">You</p>
                            <p className="text-2xl font-bold text-foreground" data-testid="user-score">{scores.user_score}</p>
                            <p className="text-xs text-muted-foreground">{scores.user_correct} correct</p>
                        </div>
                        <div className="flex flex-col items-center px-4">
                            <Trophy className="w-6 h-6 text-secondary mb-1" />
                            <p className="text-xs text-muted-foreground">{scores.total_questions} played</p>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-xs text-muted-foreground mb-1">{user?.partner_name?.split(' ')[0]}</p>
                            <p className="text-2xl font-bold text-foreground" data-testid="partner-score">{scores.partner_score}</p>
                            <p className="text-xs text-muted-foreground">{scores.partner_correct} correct</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Question Area */}
            <AnimatePresence mode="wait">
                {!question && !loading && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="border-border/50 shadow-card">
                            <CardContent className="p-8 text-center">
                                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-6">
                                    Ready to test how well you know your partner?
                                </p>
                                <Button
                                    onClick={getNewQuestion}
                                    className="rounded-full px-8 py-6 font-bold shadow-soft hover:shadow-hover btn-glow"
                                    data-testid="start-trivia-btn"
                                >
                                    Start Playing
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {loading && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center py-12"
                    >
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </motion.div>
                )}

                {question && settingAnswer && (
                    <motion.div
                        key="setting"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <Card className="border-border/50 shadow-card border-l-4 border-l-secondary">
                            <CardContent className="p-6">
                                <Badge className="mb-3 bg-secondary/20 text-secondary-foreground">About You</Badge>
                                <p className="font-serif text-xl text-foreground mb-2">
                                    {question.question}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Select YOUR actual answer so your partner can guess:
                                </p>
                            </CardContent>
                        </Card>

                        <div className="space-y-3">
                            {question.options.map((option, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className="w-full justify-start text-left py-4 px-4 rounded-xl hover:bg-secondary/20 hover:border-secondary"
                                    onClick={() => setCorrectAnswer(option)}
                                    data-testid={`set-answer-${index}`}
                                >
                                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-sm font-bold">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    {option}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {question && !settingAnswer && waitingForAnswer && !result && (
                    <motion.div
                        key="waiting"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="border-border/50 shadow-card">
                            <CardContent className="p-8 text-center">
                                <div className="waiting-dots flex justify-center gap-1 mb-4">
                                    <span className="w-3 h-3 bg-primary rounded-full"></span>
                                    <span className="w-3 h-3 bg-primary rounded-full"></span>
                                    <span className="w-3 h-3 bg-primary rounded-full"></span>
                                </div>
                                <p className="text-foreground font-medium mb-2">
                                    Waiting for {user?.partner_name?.split(' ')[0]}...
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    They need to set the correct answer first
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {question && !settingAnswer && !waitingForAnswer && !result && (
                    <motion.div
                        key="question"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <Card className="border-border/50 shadow-card">
                            <CardContent className="p-6">
                                <Badge className="mb-3 category-{question.category}">{question.category}</Badge>
                                <p className="text-sm text-muted-foreground mb-2">About {question.about_user}</p>
                                <p className="font-serif text-xl text-foreground" data-testid="trivia-question">
                                    {question.question}
                                </p>
                            </CardContent>
                        </Card>

                        <div className="space-y-3">
                            {question.options.map((option, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className={`w-full justify-start text-left py-4 px-4 rounded-xl transition-all ${
                                        selectedOption === option ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                                    }`}
                                    onClick={() => submitGuess(option)}
                                    disabled={selectedOption !== null}
                                    data-testid={`option-${index}`}
                                >
                                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-sm font-bold">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    {option}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {result && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="space-y-4"
                    >
                        <Card className={`border-border/50 shadow-card ${result.is_correct ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                            <CardContent className="p-6 text-center">
                                {result.is_correct ? (
                                    <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
                                ) : (
                                    <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                                )}
                                <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                                    {result.is_correct ? 'Correct!' : 'Not quite!'}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    {result.is_correct 
                                        ? `+${result.points_earned} points! You know your partner well!` 
                                        : `The answer was: ${result.correct_answer}`}
                                </p>

                                <div className="bg-muted/50 rounded-xl p-4 mb-4">
                                    <p className="text-sm text-muted-foreground mb-1">Your guess</p>
                                    <p className="font-medium text-foreground">{result.your_guess}</p>
                                </div>

                                <Button
                                    onClick={getNewQuestion}
                                    className="rounded-full px-8 py-5 font-bold shadow-soft hover:shadow-hover btn-glow"
                                    data-testid="next-question-btn"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Next Question
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
