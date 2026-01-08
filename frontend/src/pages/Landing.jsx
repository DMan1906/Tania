import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Heart, Sparkles, Flame, ArrowRight, Stars } from 'lucide-react';
import { motion } from 'framer-motion';

export const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background bg-pattern flex flex-col relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-40 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl" />
            </div>

            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center relative z-10">
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.8 }}
                    className="mb-8 relative"
                >
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shadow-glow animate-pulse-glow">
                        <Flame className="w-14 h-14 text-primary streak-flame" />
                    </div>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-4"
                    >
                        <Stars className="w-6 h-6 text-accent/50 absolute top-0 left-1/2" />
                    </motion.div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="font-serif text-5xl md:text-6xl font-bold mb-4 gradient-text"
                >
                    Candle
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted-foreground mb-10 max-w-sm"
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
                    <div className="flex items-center gap-4 glass p-4 rounded-2xl border border-border/50 card-hover">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-glow">
                            <Heart className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm text-left text-foreground">Daily questions designed for deeper connections</p>
                    </div>

                    <div className="flex items-center gap-4 glass p-4 rounded-2xl border border-border/50 card-hover">
                        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-6 h-6 text-secondary" />
                        </div>
                        <p className="text-sm text-left text-foreground">Answer together, reveal simultaneously</p>
                    </div>

                    <div className="flex items-center gap-4 glass p-4 rounded-2xl border border-border/50 card-hover">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                            <Flame className="w-6 h-6 text-accent" />
                        </div>
                        <p className="text-sm text-left text-foreground">Build streaks & celebrate milestones</p>
                    </div>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col gap-4 w-full max-w-xs"
                >
                    <Button
                        onClick={() => navigate('/register')}
                        className="w-full rounded-full py-6 text-base font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-glow transition-all btn-glow"
                        data-testid="get-started-btn"
                    >
                        Get Started
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => navigate('/login')}
                        className="w-full rounded-full py-6 text-base font-bold border-2 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all"
                        data-testid="login-btn"
                    >
                        I have an account
                    </Button>
                </motion.div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-muted-foreground relative z-10">
                Made with <Heart className="w-4 h-4 inline text-primary fill-primary" /> for couples & friends
            </footer>
        </div>
    );
};
