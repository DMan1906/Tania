import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import {
  Home,
  MessageCircle,
  Brain,
  Heart,
  Calendar,
  Camera,
  Sun,
  User,
  LogOut,
  Flame,
  Menu,
  Ticket,
  ListTodo,
  RefreshCw,
  Handshake,
  Sparkles,
  Dice5,
  Palette,
  Lock,
} from "lucide-react";
import { Toaster } from "./ui/sonner";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NavItem = ({ to, icon: Icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center gap-1 p-2 transition-all relative ${
        isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
      }`
    }
    data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
  >
    {({ isActive }) => (
      <>
        <div
          className={`p-2 rounded-xl transition-all ${
            isActive ? "bg-primary/20 shadow-glow" : ""
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium">{label}</span>
        {badge > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center font-bold shadow-glow">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const SideNavItem = ({ to, icon: Icon, label, badge, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive
          ? "bg-primary/20 text-primary border border-primary/30"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`
    }
    data-testid={`sidenav-${label.toLowerCase().replace(/\s+/g, "-")}`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
    {badge > 0 && (
      <span className="ml-auto w-6 h-6 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center font-bold">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </NavLink>
);

export const Layout = ({ children }) => {
  const { isAuthenticated, isPaired, user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadNotes, setUnreadNotes] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (isAuthenticated && isPaired) {
        try {
          const response = await axios.get(`${API_URL}/notes/unread-count`);
          setUnreadNotes(response.data.count);
        } catch (err) {
          console.error("Failed to fetch unread count");
        }
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isPaired]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  const primaryNavItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/question", icon: MessageCircle, label: "Today" },
    { to: "/trivia", icon: Brain, label: "Trivia" },
    { to: "/notes", icon: Heart, label: "Notes", badge: unreadNotes },
  ];

  const allNavItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/question", icon: MessageCircle, label: "Today's Question" },
    { to: "/trivia", icon: Brain, label: "Trivia Game" },
    { to: "/notes", icon: Heart, label: "Love Notes", badge: unreadNotes },
    { to: "/coupons", icon: Ticket, label: "Love Coupons" },
    { to: "/bucket-list", icon: ListTodo, label: "Bucket List" },
    { to: "/date-spinner", icon: RefreshCw, label: "Date Spinner" },
    { to: "/dates", icon: Calendar, label: "Date Ideas" },
    { to: "/pic-of-day", icon: Camera, label: "Pic of the Day" },
    { to: "/memories", icon: Camera, label: "Memories" },
    { to: "/mood", icon: Sun, label: "Mood Check-in" },
    { to: "/thumb-kiss", icon: Handshake, label: "Thumb Kiss" },
    { to: "/fantasy-matcher", icon: Sparkles, label: "Fantasy Matcher" },
    { to: "/spicy-dice", icon: Dice5, label: "Spicy Dice" },
    { to: "/shared-canvas", icon: Palette, label: "Shared Canvas" },
    { to: "/privacy", icon: Lock, label: "Privacy Settings" },
    { to: "/history", icon: MessageCircle, label: "Question History" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background bg-pattern">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header */}
      {isAuthenticated && (
        <header className="sticky top-0 z-40 glass border-b border-border/50">
          <div className="max-w-md mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shadow-glow"
              >
                <Flame className="w-5 h-5 text-primary streak-flame" />
              </motion.div>
              <span className="font-serif text-xl font-bold gradient-text">
                TwinFlames
              </span>
            </div>

            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Hi, {user.name?.split(" ")[0]}
                </span>
              )}

              {isPaired && (
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <button
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      data-testid="menu-btn"
                      aria-label="Menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-72 bg-card border-border"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-6 pt-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shadow-glow">
                          <Flame className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {user?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            with {user?.partner_name}
                          </p>
                        </div>
                      </div>

                      <nav className="flex-1 space-y-1">
                        {allNavItems.map((item) => (
                          <SideNavItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            badge={item.badge}
                            onClick={closeMenu}
                          />
                        ))}
                      </nav>

                      <button
                        onClick={() => {
                          closeMenu();
                          handleLogout();
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all mt-4"
                        data-testid="sidenav-logout"
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {!isPaired && (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  data-testid="logout-btn"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={`max-w-md mx-auto px-6 py-8 ${
          isAuthenticated && isPaired ? "pb-28" : ""
        }`}
      >
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      {isAuthenticated && isPaired && (
        <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border/50 pb-safe pt-2 px-6 z-50">
          <div className="max-w-md mx-auto flex justify-around items-center">
            {primaryNavItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
              />
            ))}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`
              }
              data-testid="nav-profile"
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-2 rounded-xl transition-all ${
                      isActive ? "bg-primary/20 shadow-glow" : ""
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">Profile</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  );
};
