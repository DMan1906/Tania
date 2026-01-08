import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Flame, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        
        if (!formData.email.trim()) {
            toast.error('Please enter your email');
            return;
        }
        
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        const result = await register(formData.email, formData.password, formData.name);
        setLoading(false);

        if (result.success) {
            toast.success('Account created! Now pair with your partner.');
            navigate('/pairing');
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
                        <CardTitle className="font-serif text-2xl">Create Account</CardTitle>
                        <CardDescription>Start your journey of connection</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Your Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        placeholder="Enter your name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10 rounded-xl"
                                        data-testid="name-input"
                                    />
                                </div>
                            </div>

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
                                        placeholder="Create a password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pl-10 rounded-xl"
                                        data-testid="password-input"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="pl-10 rounded-xl"
                                        data-testid="confirm-password-input"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full rounded-full py-6 font-bold shadow-soft hover:shadow-hover transition-all btn-glow"
                                disabled={loading}
                                data-testid="register-submit-btn"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </Button>
                        </form>

                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Already have an account?{' '}
                            <Link 
                                to="/login" 
                                className="text-primary hover:underline font-medium"
                                data-testid="login-link"
                            >
                                Sign in
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};
