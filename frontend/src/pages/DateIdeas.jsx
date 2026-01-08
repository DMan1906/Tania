import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Calendar, MapPin, DollarSign, Sparkles, Heart, Check, Loader2, Lightbulb, Star, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BUDGET_OPTIONS = [
    { value: 'low', label: 'Budget Friendly ($0-20)', icon: '💰' },
    { value: 'medium', label: 'Moderate ($20-100)', icon: '💵' },
    { value: 'high', label: 'Splurge ($100+)', icon: '💎' }
];

const MOOD_OPTIONS = [
    { value: 'romantic', label: 'Romantic', icon: '💕' },
    { value: 'adventurous', label: 'Adventurous', icon: '🎢' },
    { value: 'relaxed', label: 'Relaxed', icon: '🧘' },
    { value: 'fun', label: 'Fun & Playful', icon: '🎉' }
];

const LOCATION_OPTIONS = [
    { value: 'any', label: 'Any Location', icon: '🌍' },
    { value: 'indoor', label: 'Indoor', icon: '🏠' },
    { value: 'outdoor', label: 'Outdoor', icon: '🌳' }
];

const DateIdeaCard = ({ idea, onToggleFavorite, onToggleComplete }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            <Card className={`border-border/50 shadow-soft transition-all ${idea.is_completed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                    {MOOD_OPTIONS.find(m => m.value === idea.mood)?.icon} {idea.mood}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    {BUDGET_OPTIONS.find(b => b.value === idea.budget)?.icon} {idea.budget}
                                </Badge>
                            </div>
                            <h3 className="font-serif text-lg font-bold text-foreground">{idea.title}</h3>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onToggleFavorite(idea.id)}
                                className={`p-2 rounded-full transition-colors ${
                                    idea.is_favorite ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'
                                }`}
                                data-testid={`favorite-${idea.id}`}
                            >
                                <Star className={`w-5 h-5 ${idea.is_favorite ? 'fill-current' : ''}`} />
                            </button>
                            <button
                                onClick={() => onToggleComplete(idea.id)}
                                className={`p-2 rounded-full transition-colors ${
                                    idea.is_completed ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:text-accent'
                                }`}
                                data-testid={`complete-${idea.id}`}
                            >
                                <Check className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4">{idea.description}</p>

                    {idea.tips && idea.tips.length > 0 && (
                        <div className="bg-muted/30 rounded-xl p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" /> Tips
                            </p>
                            <ul className="space-y-1">
                                {idea.tips.map((tip, index) => (
                                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {idea.is_completed && (
                        <div className="mt-3 flex items-center gap-2 text-accent text-sm">
                            <Check className="w-4 h-4" />
                            <span>Completed!</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export const DateIdeas = () => {
    const { user } = useAuth();
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [budget, setBudget] = useState('medium');
    const [mood, setMood] = useState('romantic');
    const [locationType, setLocationType] = useState('any');

    const fetchIdeas = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/dates`);
            setIdeas(response.data);
        } catch (err) {
            console.error('Failed to fetch date ideas:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIdeas();
    }, [fetchIdeas]);

    const generateIdea = async () => {
        setGenerating(true);
        try {
            const response = await axios.post(`${API_URL}/dates/generate`, {
                budget,
                mood,
                location_type: locationType
            });
            setIdeas([response.data, ...ideas]);
            toast.success('New date idea generated!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to generate idea');
        } finally {
            setGenerating(false);
        }
    };

    const toggleFavorite = async (ideaId) => {
        try {
            const response = await axios.post(`${API_URL}/dates/${ideaId}/favorite`);
            setIdeas(ideas.map(idea => 
                idea.id === ideaId ? { ...idea, is_favorite: response.data.is_favorite } : idea
            ));
        } catch (err) {
            toast.error('Failed to update favorite');
        }
    };

    const toggleComplete = async (ideaId) => {
        try {
            const response = await axios.post(`${API_URL}/dates/${ideaId}/complete`);
            setIdeas(ideas.map(idea => 
                idea.id === ideaId ? { ...idea, is_completed: response.data.is_completed } : idea
            ));
            if (response.data.is_completed) {
                toast.success('Date marked as completed! 🎉');
            }
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const favoriteIdeas = ideas.filter(i => i.is_favorite && !i.is_completed);
    const otherIdeas = ideas.filter(i => !i.is_favorite && !i.is_completed);
    const completedIdeas = ideas.filter(i => i.is_completed);

    return (
        <div className="space-y-6" data-testid="date-ideas-page">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                    Date Ideas
                </h1>
                <p className="text-muted-foreground">
                    AI-powered date suggestions for you & {user?.partner_name?.split(' ')[0]}
                </p>
            </div>

            {/* Generator */}
            <Card className="border-border/50 shadow-card">
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Budget</label>
                            <Select value={budget} onValueChange={setBudget}>
                                <SelectTrigger className="rounded-xl" data-testid="budget-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BUDGET_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.icon} {opt.value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Mood</label>
                            <Select value={mood} onValueChange={setMood}>
                                <SelectTrigger className="rounded-xl" data-testid="mood-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MOOD_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.icon} {opt.value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                            <Select value={locationType} onValueChange={setLocationType}>
                                <SelectTrigger className="rounded-xl" data-testid="location-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LOCATION_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.icon} {opt.value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button
                        onClick={generateIdea}
                        disabled={generating}
                        className="w-full rounded-full py-5 font-bold shadow-soft hover:shadow-hover btn-glow"
                        data-testid="generate-date-btn"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Date Idea
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Ideas List */}
            <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="space-y-6 pr-4">
                    {/* Favorites */}
                    {favoriteIdeas.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <Star className="w-4 h-4 text-primary fill-current" />
                                Favorites
                            </h3>
                            <div className="space-y-3">
                                <AnimatePresence>
                                    {favoriteIdeas.map((idea) => (
                                        <DateIdeaCard
                                            key={idea.id}
                                            idea={idea}
                                            onToggleFavorite={toggleFavorite}
                                            onToggleComplete={toggleComplete}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Other Ideas */}
                    {otherIdeas.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                Ideas
                            </h3>
                            <div className="space-y-3">
                                <AnimatePresence>
                                    {otherIdeas.map((idea) => (
                                        <DateIdeaCard
                                            key={idea.id}
                                            idea={idea}
                                            onToggleFavorite={toggleFavorite}
                                            onToggleComplete={toggleComplete}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Completed */}
                    {completedIdeas.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <Check className="w-4 h-4 text-accent" />
                                Completed ({completedIdeas.length})
                            </h3>
                            <div className="space-y-3">
                                <AnimatePresence>
                                    {completedIdeas.map((idea) => (
                                        <DateIdeaCard
                                            key={idea.id}
                                            idea={idea}
                                            onToggleFavorite={toggleFavorite}
                                            onToggleComplete={toggleComplete}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {ideas.length === 0 && (
                        <Card className="border-border/50">
                            <CardContent className="p-8 text-center">
                                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No date ideas yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Generate your first date idea above!
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
