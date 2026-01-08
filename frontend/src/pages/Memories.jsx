import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Camera, Plus, Calendar, Trash2, Loader2, Heart, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MemoryCard = ({ memory, onDelete, currentUserId }) => {
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric',
            month: 'long', 
            day: 'numeric' 
        });
    };

    const canDelete = memory.created_by === currentUserId;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            layout
        >
            <Card className="border-border/50 shadow-soft overflow-hidden">
                {memory.photo_url && (
                    <div className="aspect-video bg-muted relative overflow-hidden">
                        <img 
                            src={memory.photo_url} 
                            alt={memory.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="absolute inset-0 hidden items-center justify-center bg-muted">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                    </div>
                )}
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h3 className="font-serif text-lg font-bold text-foreground">{memory.title}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(memory.date)}
                            </p>
                        </div>
                        {canDelete && (
                            <button
                                onClick={() => onDelete(memory.id)}
                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                data-testid={`delete-memory-${memory.id}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {memory.description && (
                        <p className="text-sm text-muted-foreground mb-2">{memory.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Added by {memory.created_by_name}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export const Memories = () => {
    const { user } = useAuth();
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        photo_url: ''
    });

    const fetchMemories = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/memories`);
            setMemories(response.data);
        } catch (err) {
            console.error('Failed to fetch memories:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMemories();
    }, [fetchMemories]);

    const createMemory = async () => {
        if (!formData.title.trim()) {
            toast.error('Please enter a title');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post(`${API_URL}/memories`, {
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                date: formData.date,
                photo_url: formData.photo_url.trim() || null
            });
            setMemories([response.data, ...memories]);
            toast.success('Memory saved! 💝');
            setDialogOpen(false);
            setFormData({
                title: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                photo_url: ''
            });
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save memory');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteMemory = async (memoryId) => {
        try {
            await axios.delete(`${API_URL}/memories/${memoryId}`);
            setMemories(memories.filter(m => m.id !== memoryId));
            toast.success('Memory deleted');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete memory');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    // Group memories by year
    const groupedMemories = memories.reduce((acc, memory) => {
        const year = new Date(memory.date).getFullYear();
        if (!acc[year]) acc[year] = [];
        acc[year].push(memory);
        return acc;
    }, {});

    const years = Object.keys(groupedMemories).sort((a, b) => b - a);

    return (
        <div className="space-y-6" data-testid="memories-page">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                    Our Memories
                </h1>
                <p className="text-muted-foreground">
                    Capture special moments with {user?.partner_name?.split(' ')[0]}
                </p>
            </div>

            {/* Add Memory Button */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                    <Button 
                        className="w-full rounded-full py-5 font-bold shadow-soft hover:shadow-hover btn-glow"
                        data-testid="add-memory-btn"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Memory
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-serif">Add a Memory</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="Our first date, Anniversary dinner..."
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="rounded-xl"
                                data-testid="memory-title-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="rounded-xl"
                                data-testid="memory-date-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="What made this moment special?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="rounded-xl resize-none"
                                rows={3}
                                data-testid="memory-description-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="photo">Photo URL (optional)</Label>
                            <Input
                                id="photo"
                                placeholder="https://example.com/photo.jpg"
                                value={formData.photo_url}
                                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                                className="rounded-xl"
                                data-testid="memory-photo-input"
                            />
                        </div>
                        <Button
                            onClick={createMemory}
                            disabled={submitting || !formData.title.trim()}
                            className="w-full rounded-full"
                            data-testid="save-memory-btn"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Heart className="w-4 h-4 mr-2" />
                                    Save Memory
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Memories Timeline */}
            <ScrollArea className="h-[calc(100vh-350px)]">
                {memories.length === 0 ? (
                    <Card className="border-border/50">
                        <CardContent className="p-8 text-center">
                            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No memories yet</p>
                            <p className="text-sm text-muted-foreground">
                                Start capturing your special moments together!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8 pr-4">
                        {years.map((year) => (
                            <div key={year}>
                                <h3 className="font-serif text-xl font-bold text-foreground mb-4 sticky top-0 bg-background py-2">
                                    {year}
                                </h3>
                                <div className="space-y-4 relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/50" />
                                    
                                    <AnimatePresence>
                                        {groupedMemories[year].map((memory) => (
                                            <div key={memory.id} className="pl-10 relative">
                                                {/* Timeline dot */}
                                                <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-primary" />
                                                <MemoryCard
                                                    memory={memory}
                                                    onDelete={deleteMemory}
                                                    currentUserId={user?.id}
                                                />
                                            </div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};
