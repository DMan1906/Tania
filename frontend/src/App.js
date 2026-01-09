import "@/index.css";
import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import { Layout } from "./components/Layout";
import { Flame } from "lucide-react";

// Lazy load pages for code splitting with proper named export handling
const Landing = lazy(() => import("./pages/Landing").then(m => ({ default: m.Landing })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const Pairing = lazy(() => import("./pages/Pairing").then(m => ({ default: m.Pairing })));
const Home = lazy(() => import("./pages/Home").then(m => ({ default: m.Home })));
const TodayQuestion = lazy(() => import("./pages/TodayQuestion").then(m => ({ default: m.TodayQuestion })));
const History = lazy(() => import("./pages/History").then(m => ({ default: m.History })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Trivia = lazy(() => import("./pages/Trivia").then(m => ({ default: m.Trivia })));
const LoveNotes = lazy(() => import("./pages/LoveNotes").then(m => ({ default: m.LoveNotes })));
const DateIdeas = lazy(() => import("./pages/DateIdeas").then(m => ({ default: m.DateIdeas })));
const DateSpinner = lazy(() => import("./pages/DateSpinner").then(m => ({ default: m.DateSpinner })));
const Memories = lazy(() => import("./pages/Memories").then(m => ({ default: m.Memories })));
const MoodCheckin = lazy(() => import("./pages/MoodCheckin").then(m => ({ default: m.MoodCheckin })));
const LoveCoupons = lazy(() => import("./pages/LoveCoupons").then(m => ({ default: m.LoveCoupons })));
const BucketList = lazy(() => import("./pages/BucketList").then(m => ({ default: m.BucketList })));
const ThumbKiss = lazy(() => import("./pages/ThumbKiss").then(m => ({ default: m.ThumbKiss })));
const FantasyMatcher = lazy(() => import("./pages/FantasyMatcher").then(m => ({ default: m.FantasyMatcher })));
const SpicyDice = lazy(() => import("./pages/SpicyDice").then(m => ({ default: m.SpicyDice })));
const SharedCanvas = lazy(() => import("./pages/SharedCanvas").then(m => ({ default: m.SharedCanvas })));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings").then(m => ({ default: m.PrivacySettings })));
const PicOfTheDay = lazy(() => import("./pages/PicOfTheDay").then(m => ({ default: m.PicOfTheDay })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <Flame className="w-12 h-12 text-primary animate-pulse" />
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

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

// Paired route - requires being paired with a partner
const PairedRoute = ({ children }) => {
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

  return children;
};

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/landing"
          element={
            <PublicOnlyRoute>
              <Landing />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />

        {/* Protected routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomeRoute />} />
          <Route path="/pairing" element={<PairedRoute><Pairing /></PairedRoute>} />
          <Route path="/question" element={<PairedRoute><TodayQuestion /></PairedRoute>} />
          <Route path="/history" element={<PairedRoute><History /></PairedRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/trivia" element={<PairedRoute><Trivia /></PairedRoute>} />
          <Route path="/notes" element={<PairedRoute><LoveNotes /></PairedRoute>} />
          <Route path="/dates" element={<PairedRoute><DateIdeas /></PairedRoute>} />
          <Route path="/date-spinner" element={<PairedRoute><DateSpinner /></PairedRoute>} />
          <Route path="/memories" element={<PairedRoute><Memories /></PairedRoute>} />
          <Route path="/mood" element={<PairedRoute><MoodCheckin /></PairedRoute>} />
          <Route path="/coupons" element={<PairedRoute><LoveCoupons /></PairedRoute>} />
          <Route path="/bucket-list" element={<PairedRoute><BucketList /></PairedRoute>} />
          <Route path="/thumb-kiss" element={<PairedRoute><ThumbKiss /></PairedRoute>} />
          <Route path="/fantasy-matcher" element={<PairedRoute><FantasyMatcher /></PairedRoute>} />
          <Route path="/spicy-dice" element={<PairedRoute><SpicyDice /></PairedRoute>} />
          <Route path="/shared-canvas" element={<PairedRoute><SharedCanvas /></PairedRoute>} />
          <Route path="/privacy" element={<PrivacySettings />} />
          <Route path="/pic-of-day" element={<PairedRoute><PicOfTheDay /></PairedRoute>} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <AppRoutes />
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
