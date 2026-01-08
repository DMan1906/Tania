import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Heart, Sparkles, Flame, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.8 }}
                    className="mb-8"
                >
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                        <Flame className="w-12 h-12 text-primary streak-flame" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4"
                >
                    Candle
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted-foreground mb-8 max-w-sm"
                >
                    Grow closer, one question at a time
                </motion.p>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col gap-4 mb-12 w-full max-w-xs"
                >
                    <div className="flex items-center gap-3 bg-card p-4 rounded-2xl shadow-soft">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-sm text-left text-foreground">Daily questions designed for deeper connections</p>
                    </div>

                    <div className="flex items-center gap-3 bg-card p-4 rounded-2xl shadow-soft">
                        <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <p className="text-sm text-left text-foreground">Answer together, reveal simultaneously</p>
                    </div>

                    <div className="flex items-center gap-3 bg-card p-4 rounded-2xl shadow-soft">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                            <Flame className="w-5 h-5 text-accent" />
                        </div>
                        <p className="text-sm text-left text-foreground">Build streaks & celebrate milestones</p>
                    </div>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col gap-3 w-full max-w-xs"
                >
                    <Button
                        onClick={() => navigate('/register')}
                        className="w-full rounded-full py-6 text-base font-bold shadow-soft hover:shadow-hover transition-all btn-glow"
                        data-testid="get-started-btn"
                    >
                        Get Started
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => navigate('/login')}
                        className="w-full rounded-full py-6 text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        data-testid="login-btn"
                    >
                        I have an account
                    </Button>
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-muted-foreground">
                Made with <Heart className="w-4 h-4 inline text-primary" /> for couples & friends
            </footer>
        </div>
    );
};
