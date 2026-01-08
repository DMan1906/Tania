import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ListTodo, Plus, Check, Trash2, Loader2, Plane, Utensils, Heart, Target, Sparkles, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_CONFIG = {
    travel: { icon: Plane, color: 'text-blue-500', bg: 'bg-blue-500/20', label: 'Travel' },
    experiences: { icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/20', label: 'Experiences' },
    food: { icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-500/20', label: 'Food' },
    goals: { icon: Target, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Goals' },
    romance: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/20', label: 'Romance' },
    general: { icon: ListTodo, color: 'text-gray-500', bg: 'bg-gray-500/20', label: 'General' }
};

const BucketItem = ({ item, onToggle, onDelete }) => {
    const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
    const Icon = config.icon;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            layout
        >
            <Card className={`border-border/50 shadow-soft transition-all ${
                item.is_completed ? 'opacity-60' : 'hover:shadow-card'
            }`}>
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <button
                            onClick={() => onToggle(item.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                item.is_completed 
                                    ? 'border-primary bg-primary text-primary-foreground' 
                                    : 'border-muted-foreground/50 hover:border-primary'
                            }`}
                        >
                            {item.is_completed && <Check className="w-4 h-4" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bg}`}>
                                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                </div>
                                <span className={`text-xs ${config.color}`}>{config.label}</span>
                            </div>
                            <h3 className={`font-medium text-foreground ${item.is_completed ? 'line-through' : ''}`}>
                                {item.title}
                            </h3>
                            {item.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                                Added by {item.created_by_name}
                            </p>
                        </div>
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export const BucketList = () => {
    const { user } = useAuth();
    const { lastUpdate } = useRealtime();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [newItem, setNewItem] = useState({ title: '', category: 'general', notes: '' });

    const fetchData = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/bucket-list`);
            setItems(response.data);
        } catch (err) {
            console.error('Failed to fetch bucket list:', err);
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

    const createItem = async () => {
        if (!newItem.title.trim()) return;
        
        setCreating(true);
        try {
            await axios.post(`${API_URL}/bucket-list`, {
                title: newItem.title,
                category: newItem.category,
                notes: newItem.notes || null
            });
            toast.success('Added to bucket list! 🎯');
            setNewItem({ title: '', category: 'general', notes: '' });
            setDialogOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add item');
        } finally {
            setCreating(false);
        }
    };

    const toggleItem = async (itemId) => {
        try {
            const response = await axios.post(`${API_URL}/bucket-list/${itemId}/complete`);
            if (response.data.is_completed) {
                toast.success('Goal achieved! 🎉');
            }
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update item');
        }
    };

    const deleteItem = async (itemId) => {
        try {
            await axios.delete(`${API_URL}/bucket-list/${itemId}`);
            toast.success('Item removed');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete item');
        }
    };

    const filteredItems = selectedCategory === 'all' 
        ? items 
        : items.filter(item => item.category === selectedCategory);

    const pendingItems = filteredItems.filter(item => !item.is_completed);
    const completedItems = filteredItems.filter(item => item.is_completed);

    const stats = {
        total: items.length,
        completed: items.filter(i => i.is_completed).length,
        pending: items.filter(i => !i.is_completed).length
    };

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
                    <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                    Our Bucket List
                </h1>
                <p className="text-muted-foreground">
                    Dreams to chase together
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-primary">{stats.pending}</p>
                        <p className="text-xs text-muted-foreground">To Do</p>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                        <p className="text-xs text-muted-foreground">Done</p>
                    </CardContent>
                </Card>
            </div>

            {/* Add Button */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full rounded-full py-6 font-bold shadow-soft">
                        <Plus className="w-5 h-5 mr-2" />
                        Add to Bucket List
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add a Dream</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label className="text-sm font-medium">What do you want to do?</label>
                            <Input
                                value={newItem.title}
                                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                placeholder="e.g., Visit Paris together"
                                className="mt-1"
                            />
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium">Category</label>
                            <Select
                                value={newItem.category}
                                onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                            <span className="flex items-center gap-2">
                                                <config.icon className={`w-4 h-4 ${config.color}`} />
                                                {config.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium">Notes (optional)</label>
                            <Textarea
                                value={newItem.notes}
                                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                                placeholder="Any details or ideas..."
                                className="mt-1"
                                rows={2}
                            />
                        </div>
                        
                        <Button
                            onClick={createItem}
                            disabled={!newItem.title.trim() || creating}
                            className="w-full rounded-full"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Add to List
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full flex-shrink-0"
                    onClick={() => setSelectedCategory('all')}
                >
                    All
                </Button>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <Button
                        key={key}
                        variant={selectedCategory === key ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-full flex-shrink-0"
                        onClick={() => setSelectedCategory(key)}
                    >
                        <config.icon className={`w-4 h-4 mr-1 ${selectedCategory === key ? '' : config.color}`} />
                        {config.label}
                    </Button>
                ))}
            </div>

            {/* Items List */}
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">
                        To Do ({pendingItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed ({completedItems.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-3 mt-4">
                    {pendingItems.length === 0 ? (
                        <Card className="border-border/50">
                            <CardContent className="p-8 text-center">
                                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    No items yet. Start dreaming together!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <AnimatePresence>
                            {pendingItems.map((item) => (
                                <BucketItem
                                    key={item.id}
                                    item={item}
                                    onToggle={toggleItem}
                                    onDelete={deleteItem}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-3 mt-4">
                    {completedItems.length === 0 ? (
                        <Card className="border-border/50">
                            <CardContent className="p-8 text-center">
                                <Check className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    No completed items yet. Keep dreaming!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <AnimatePresence>
                            {completedItems.map((item) => (
                                <BucketItem
                                    key={item.id}
                                    item={item}
                                    onToggle={toggleItem}
                                    onDelete={deleteItem}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};
