import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Flame, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.email.trim() || !formData.password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        const result = await login(formData.email, formData.password);
        setLoading(false);

        if (result.success) {
            toast.success('Welcome back!');
            navigate('/');
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                {/* Back button */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
                    data-testid="back-btn"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Flame className="w-5 h-5 text-primary streak-flame" />
                    </div>
                    <span className="font-serif text-2xl font-bold text-foreground">Candle</span>
                </div>

                <Card className="border-border/50 shadow-card">
                    <CardHeader className="text-center">
                        <CardTitle className="font-serif text-2xl">Welcome Back</CardTitle>
                        <CardDescription>Sign in to continue your journey</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="pl-10 rounded-xl"
                                        data-testid="email-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pl-10 rounded-xl"
                                        data-testid="password-input"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full rounded-full py-6 font-bold shadow-soft hover:shadow-hover transition-all btn-glow"
                                disabled={loading}
                                data-testid="login-submit-btn"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Don't have an account?{' '}
                            <Link 
                                to="/register" 
                                className="text-primary hover:underline font-medium"
                                data-testid="register-link"
                            >
                                Create one
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};
