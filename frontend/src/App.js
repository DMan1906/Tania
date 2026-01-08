import "@/index.css";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Pairing } from "./pages/Pairing";
import { Home } from "./pages/Home";
import { TodayQuestion } from "./pages/TodayQuestion";
import { History } from "./pages/History";
import { Profile } from "./pages/Profile";
import { Flame } from "lucide-react";

// Protected route component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Flame className="w-12 h-12 text-primary animate-pulse" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Public only route (redirect if authenticated)
const PublicOnlyRoute = ({ children }) => {
    const { isAuthenticated, isPaired, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Flame className="w-12 h-12 text-primary animate-pulse" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        // Redirect to appropriate page based on pairing status
        return <Navigate to={isPaired ? "/" : "/pairing"} replace />;
    }

    return children;
};

// Main route component that handles home redirect logic
const HomeRoute = () => {
    const { isPaired, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Flame className="w-12 h-12 text-primary animate-pulse" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isPaired) {
        return <Navigate to="/pairing" replace />;
    }

    return <Home />;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/landing" element={
                <PublicOnlyRoute>
                    <Landing />
                </PublicOnlyRoute>
            } />
            <Route path="/login" element={
                <PublicOnlyRoute>
                    <Login />
                </PublicOnlyRoute>
            } />
            <Route path="/register" element={
                <PublicOnlyRoute>
                    <Register />
                </PublicOnlyRoute>
            } />

            {/* Protected routes */}
            <Route path="/pairing" element={
                <ProtectedRoute>
                    <Pairing />
                </ProtectedRoute>
            } />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout>
                        <HomeRoute />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/question" element={
                <ProtectedRoute>
                    <Layout>
                        <TodayQuestion />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/history" element={
                <ProtectedRoute>
                    <Layout>
                        <History />
                    </Layout>
                </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
                <ProtectedRoute>
                    <Layout>
                        <Profile />
                    </Layout>
                </ProtectedRoute>
            } />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
