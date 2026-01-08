import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, MessageCircle, History, User, LogOut, Flame } from 'lucide-react';
import { Toaster } from './ui/sonner';
import { motion } from 'framer-motion';

const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-primary'
            }`
        }
        data-testid={`nav-${label.toLowerCase()}`}
    >
        <Icon className="w-5 h-5" />
        <span className="text-xs font-medium">{label}</span>
    </NavLink>
);

export const Layout = ({ children }) => {
    const { isAuthenticated, isPaired, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background">
            <Toaster position="top-center" richColors />
            
            {/* Header - only show when authenticated */}
            {isAuthenticated && (
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
                    <div className="max-w-md mx-auto px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
                            >
                                <Flame className="w-4 h-4 text-primary streak-flame" />
                            </motion.div>
                            <span className="font-serif text-xl font-bold text-foreground">Candle</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {user && (
                                <span className="text-sm text-muted-foreground hidden sm:block">
                                    Hi, {user.name?.split(' ')[0]}
                                </span>
                            )}
                            <button
                                onClick={handleLogout}
                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                data-testid="logout-btn"
                                aria-label="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className={`max-w-md mx-auto px-6 py-8 ${isAuthenticated && isPaired ? 'pb-24' : ''}`}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {children}
                </motion.div>
            </main>

            {/* Bottom Navigation - only show when authenticated and paired */}
            {isAuthenticated && isPaired && (
                <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border/50 pb-safe pt-2 px-6 z-50">
                    <div className="max-w-md mx-auto flex justify-around items-center">
                        <NavItem to="/" icon={Home} label="Home" />
                        <NavItem to="/question" icon={MessageCircle} label="Today" />
                        <NavItem to="/history" icon={History} label="History" />
                        <NavItem to="/profile" icon={User} label="Profile" />
                    </div>
                </nav>
            )}
        </div>
    );
};
