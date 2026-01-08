import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Users, Flame, TrendingUp, Calendar, Award, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Profile = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, milestones: [] });
    const [questionCount, setQuestionCount] = useState(0);
    const [loading, setLoading] = useState(true);

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

    const handleLogout = () => {
        logout();
        navigate('/');
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

            {/* Milestones */}
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
                                Milestones Reached
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
