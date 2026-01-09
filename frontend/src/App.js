import "@/index.css";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Pairing } from "./pages/Pairing";
import { Home } from "./pages/Home";
import { TodayQuestion } from "./pages/TodayQuestion";
import { History } from "./pages/History";
import { Profile } from "./pages/Profile";
import { Trivia } from "./pages/Trivia";
import { LoveNotes } from "./pages/LoveNotes";
import { DateIdeas } from "./pages/DateIdeas";
import { DateSpinner } from "./pages/DateSpinner";
import { Memories } from "./pages/Memories";
import { MoodCheckin } from "./pages/MoodCheckin";
import { Flame } from "lucide-react";
import { LoveCoupons } from "./pages/LoveCoupons";
import { BucketList } from "./pages/BucketList";
import { ThumbKiss } from "./pages/ThumbKiss";
import { FantasyMatcher } from "./pages/FantasyMatcher";
import { SpicyDice } from "./pages/SpicyDice";
import { SharedCanvas } from "./pages/SharedCanvas";
import { PrivacySettings } from "./pages/PrivacySettings";
import { PicOfTheDay } from "./pages/PicOfTheDay";

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

      {/* Protected routes */}
      <Route
        path="/pairing"
        element={
          <ProtectedRoute>
            <Pairing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <HomeRoute />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/question"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <TodayQuestion />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <History />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* New Feature Routes */}
      <Route
        path="/trivia"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <Trivia />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <LoveNotes />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dates"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <DateIdeas />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/date-spinner"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <DateSpinner />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/memories"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <Memories />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mood"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <MoodCheckin />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coupons"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <LoveCoupons />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/bucket-list"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <BucketList />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/thumb-kiss"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <ThumbKiss />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/fantasy-matcher"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <FantasyMatcher />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/spicy-dice"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <SpicyDice />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shared-canvas"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <SharedCanvas />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/privacy"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <PrivacySettings />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pic-of-day"
        element={
          <ProtectedRoute>
            <Layout>
              <PairedRoute>
                <PicOfTheDay />
              </PairedRoute>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
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
