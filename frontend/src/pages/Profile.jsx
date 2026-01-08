import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Users, Flame, TrendingUp, Calendar, Award, LogOut, Heart, Edit2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MilestoneInput = ({ label, value, onChange, icon }) => (
    <div className="space-y-2">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
            {icon}
            {label}
        </Label>
        <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="bg-background"
        />
    </div>
);

export const Profile = () => {
    const navigate = useNavigate();
    const { user, logout, refreshUser } = useAuth();
    const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, milestones: [] });
    const [questionCount, setQuestionCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editingMilestones, setEditingMilestones] = useState(false);
    const [savingMilestones, setSavingMilestones] = useState(false);
    const [milestoneForm, setMilestoneForm] = useState({
        started_talking: '',
        first_met: '',
        became_official: '',
        first_intimate: '',
        first_sex: ''
    });

    const fetchData = useCallback(async () => {
        try {
            const [streakRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/streaks`),
                axios.get(`${API_URL}/questions/history`)
            ]);
            setStreak(streakRes.data);
            setQuestionCount(historyRes.data.filter(q => q.both_answered).length);
        } catch (err) {
            console.error('Failed to fetch profile data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (user?.milestones) {
            setMilestoneForm({
                started_talking: user.milestones.started_talking || '',
                first_met: user.milestones.first_met || '',
                became_official: user.milestones.became_official || '',
                first_intimate: user.milestones.first_intimate || '',
                first_sex: user.milestones.first_sex || ''
            });
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleSaveMilestones = async () => {
        setSavingMilestones(true);
        try {
            await axios.put(`${API_URL}/milestones`, milestoneForm);
            await refreshUser();
            setEditingMilestones(false);
        } catch (err) {
            console.error('Failed to save milestones:', err);
        } finally {
            setSavingMilestones(false);
        }
    };

    const handleCancelEdit = () => {
        if (user?.milestones) {
            setMilestoneForm({
                started_talking: user.milestones.started_talking || '',
                first_met: user.milestones.first_met || '',
                became_official: user.milestones.became_official || '',
                first_intimate: user.milestones.first_intimate || '',
                first_sex: user.milestones.first_sex || ''
            });
        }
        setEditingMilestones(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Flame className="w-12 h-12 text-primary animate-pulse-soft" />
                    <p className="text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="profile-page">
            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-bold text-primary">
                        {user?.name?.charAt(0).toUpperCase()}
                    </span>
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground">
                    {user?.name}
                </h1>
                <p className="text-muted-foreground">{user?.email}</p>
            </motion.div>

            {/* Partner Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="border-border/50 shadow-soft">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Connected With
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center">
                                <span className="text-lg font-bold text-secondary-foreground">
                                    {user?.partner_name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="font-medium text-foreground" data-testid="partner-name">
                                    {user?.partner_name}
                                </p>
                                <p className="text-sm text-muted-foreground">Your partner</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Relationship Milestones Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <Card className="border-border/50 shadow-soft">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Heart className="w-4 h-4 text-pink-500" />
                                Relationship Milestones
                            </CardTitle>
                            {!editingMilestones ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingMilestones(true)}
                                    className="h-8 px-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        className="h-8 px-2"
                                        disabled={savingMilestones}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSaveMilestones}
                                        className="h-8 px-2 text-primary"
                                        disabled={savingMilestones}
                                    >
                                        <Save className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <AnimatePresence mode="wait">
                            {editingMilestones ? (
                                <motion.div
                                    key="editing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4"
                                >
                                    <MilestoneInput
                                        label="Date we started talking"
                                        value={milestoneForm.started_talking}
                                        onChange={(v) => setMilestoneForm(prev => ({ ...prev, started_talking: v }))}
                                        icon={<span>💬</span>}
                                    />
                                    <MilestoneInput
                                        label="Date we actually met"
                                        value={milestoneForm.first_met}
                                        onChange={(v) => setMilestoneForm(prev => ({ ...prev, first_met: v }))}
                                        icon={<span>👋</span>}
                                    />
                                    <MilestoneInput
                                        label="Date we became official"
                                        value={milestoneForm.became_official}
                                        onChange={(v) => setMilestoneForm(prev => ({ ...prev, became_official: v }))}
                                        icon={<span>💕</span>}
                                    />
                                    <MilestoneInput
                                        label="First intimate moment"
                                        value={milestoneForm.first_intimate}
                                        onChange={(v) => setMilestoneForm(prev => ({ ...prev, first_intimate: v }))}
                                        icon={<span>💋</span>}
                                    />
                                    <MilestoneInput
                                        label="First time together"
                                        value={milestoneForm.first_sex}
                                        onChange={(v) => setMilestoneForm(prev => ({ ...prev, first_sex: v }))}
                                        icon={<span>🔥</span>}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="viewing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-3"
                                >
                                    {[
                                        { key: 'started_talking', label: 'Started Talking', emoji: '💬' },
                                        { key: 'first_met', label: 'First Met', emoji: '👋' },
                                        { key: 'became_official', label: 'Became Official', emoji: '💕' },
                                        { key: 'first_intimate', label: 'First Intimate', emoji: '💋' },
                                        { key: 'first_sex', label: 'First Time', emoji: '🔥' },
                                    ].map((item) => {
                                        const date = user?.milestones?.[item.key];
                                        return (
                                            <div key={item.key} className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground flex items-center gap-2">
                                                    <span>{item.emoji}</span>
                                                    {item.label}
                                                </span>
                                                <span className="text-foreground">
                                                    {date ? formatDate(date) : 'Not set'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {!user?.milestones && (
                                        <p className="text-center text-muted-foreground text-sm py-2">
                                            Tap the edit button to add your milestones
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
            >
                <Card className="border-border/50 shadow-soft">
                    <CardContent className="p-4 text-center">
                        <Flame className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground" data-testid="current-streak">
                            {streak.current_streak}
                        </p>
                        <p className="text-xs text-muted-foreground">Current Streak</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-soft">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground" data-testid="longest-streak">
                            {streak.longest_streak}
                        </p>
                        <p className="text-xs text-muted-foreground">Best Streak</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-soft">
                    <CardContent className="p-4 text-center">
                        <Calendar className="w-8 h-8 text-secondary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground" data-testid="question-count">
                            {questionCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Questions Answered</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-soft">
                    <CardContent className="p-4 text-center">
                        <Award className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground" data-testid="milestone-count">
                            {streak.milestones?.length || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Milestones</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Streak Milestones */}
            {streak.milestones && streak.milestones.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-border/50 shadow-soft">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                Streak Milestones Reached
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {streak.milestones.map((m) => (
                                    <span 
                                        key={m}
                                        className="px-4 py-2 bg-gradient-to-r from-primary/20 to-secondary/20 text-foreground font-medium rounded-full text-sm"
                                    >
                                        {m} Days
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Account Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Card className="border-border/50 shadow-soft">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Account
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Member since</span>
                            <span className="text-foreground">{formatDate(user?.created_at)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Last answered</span>
                            <span className="text-foreground">{formatDate(streak.last_answered_date)}</span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Logout Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full rounded-full py-5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    data-testid="logout-profile-btn"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </motion.div>
        </div>
    );
};
