import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Flame, Copy, Check, Link2, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Pairing = () => {
    const navigate = useNavigate();
    const { user, refreshUser, isPaired } = useAuth();
    const [pairingCode, setPairingCode] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [partnerCode, setPartnerCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);

    useEffect(() => {
        if (isPaired) {
            navigate('/');
        }
    }, [isPaired, navigate]);

    const generateCode = async () => {
        setGeneratingCode(true);
        try {
            const response = await axios.post(`${API_URL}/pairing/generate`);
            setPairingCode(response.data.code);
            setExpiresAt(response.data.expires_at);
            toast.success('Pairing code generated!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to generate code');
        } finally {
            setGeneratingCode(false);
        }
    };

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(pairingCode);
            setCopied(true);
            toast.success('Code copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy code');
        }
    };

    const connectWithPartner = async () => {
        if (!partnerCode.trim()) {
            toast.error('Please enter a pairing code');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/pairing/connect`, { code: partnerCode });
            await refreshUser();
            toast.success('Successfully paired! Welcome aboard!');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to connect');
        } finally {
            setLoading(false);
        }
    };

    const formatExpiry = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Flame className="w-5 h-5 text-primary streak-flame" />
                    </div>
                    <span className="font-serif text-2xl font-bold text-foreground">Candle</span>
                </div>

                {/* Welcome message */}
                <div className="text-center mb-8">
                    <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
                        Welcome, {user?.name?.split(' ')[0]}!
                    </h1>
                    <p className="text-muted-foreground">
                        Now let's connect you with your partner
                    </p>
                </div>

                <Card className="border-border/50 shadow-card">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="font-serif text-xl flex items-center justify-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Pair Up
                        </CardTitle>
                        <CardDescription>
                            Share your code or enter your partner's code
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="share" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="share" data-testid="tab-share">Share Code</TabsTrigger>
                                <TabsTrigger value="enter" data-testid="tab-enter">Enter Code</TabsTrigger>
                            </TabsList>

                            <TabsContent value="share" className="space-y-4">
                                {pairingCode ? (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="space-y-4"
                                    >
                                        <div className="bg-muted/50 rounded-2xl p-6 text-center">
                                            <p className="text-sm text-muted-foreground mb-2">Your pairing code</p>
                                            <p className="font-mono text-3xl font-bold tracking-widest text-foreground" data-testid="pairing-code">
                                                {pairingCode}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Expires at {formatExpiry(expiresAt)}
                                            </p>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full rounded-full py-5"
                                            onClick={copyCode}
                                            data-testid="copy-code-btn"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-4 h-4 mr-2 text-accent" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy Code
                                                </>
                                            )}
                                        </Button>

                                        <p className="text-center text-sm text-muted-foreground">
                                            Share this code with your partner so they can connect with you!
                                        </p>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-muted/30 rounded-2xl p-8 text-center">
                                            <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                            <p className="text-sm text-muted-foreground">
                                                Generate a code to share with your partner
                                            </p>
                                        </div>

                                        <Button
                                            className="w-full rounded-full py-6 font-bold shadow-soft hover:shadow-hover transition-all btn-glow"
                                            onClick={generateCode}
                                            disabled={generatingCode}
                                            data-testid="generate-code-btn"
                                        >
                                            {generatingCode ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                'Generate Pairing Code'
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="enter" className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter 6-character code"
                                        value={partnerCode}
                                        onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                                        maxLength={6}
                                        className="text-center font-mono text-2xl tracking-widest rounded-xl py-6 uppercase"
                                        data-testid="partner-code-input"
                                    />
                                </div>

                                <Button
                                    className="w-full rounded-full py-6 font-bold shadow-soft hover:shadow-hover transition-all btn-glow"
                                    onClick={connectWithPartner}
                                    disabled={loading || partnerCode.length !== 6}
                                    data-testid="connect-btn"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        'Connect with Partner'
                                    )}
                                </Button>

                                <p className="text-center text-sm text-muted-foreground">
                                    Ask your partner for their pairing code
                                </p>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};
