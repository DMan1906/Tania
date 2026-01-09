import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { useAuth } from "./AuthContext";

const RealtimeContext = createContext(null);

// Firebase config will be loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase only if config is available
let app = null;
let database = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
  }
} catch (error) {
  console.warn("Firebase initialization failed:", error);
}

export const RealtimeProvider = ({ children }) => {
  const { user, isPaired, forceRefresh } = useAuth();
  const [realtimeData, setRealtimeData] = useState({
    questions: null,
    notes: null,
    trivia: null,
    moods: null,
    milestones: null,
    canvas: null,
    thumbKiss: null,
    coupons: null,
    bucket_list: null,
    privacy_settings: null,
    pic_of_day: null,
    lastUpdate: null,
  });
  const [listeners, setListeners] = useState([]);

  // Get pair key for the couple
  const getPairKey = useCallback(() => {
    if (!user?.id || !user?.partner_id) return null;
    const ids = [user.id, user.partner_id].sort();
    return `${ids[0]}_${ids[1]}`;
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!database || !isPaired || !user?.id) return;

    const pairKey = getPairKey();
    if (!pairKey) return;

    const activeListeners = [];

    // Listen to questions updates
    const questionsRef = ref(database, `pairs/${pairKey}/questions`);
    onValue(questionsRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        questions: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: questionsRef });

    // Listen to notes updates
    const notesRef = ref(database, `users/${user.id}/notes`);
    onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        notes: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: notesRef });

    // Listen to trivia updates
    const triviaRef = ref(database, `pairs/${pairKey}/trivia`);
    onValue(triviaRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        trivia: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: triviaRef });

    // Listen to mood updates
    const moodsRef = ref(database, `pairs/${pairKey}/moods`);
    onValue(moodsRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        moods: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: moodsRef });

    // Listen to milestones updates
    const milestonesRef = ref(database, `pairs/${pairKey}/milestones`);
    onValue(milestonesRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        milestones: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: milestonesRef });

    // Listen to canvas updates (for shared drawing)
    const canvasRef = ref(database, `pairs/${pairKey}/canvas`);
    onValue(canvasRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        canvas: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: canvasRef });

    // Listen to coupons updates
    const couponsRef = ref(database, `pairs/${pairKey}/coupons`);
    onValue(couponsRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        coupons: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: couponsRef });

    // Listen to bucket list updates
    const bucketRef = ref(database, `pairs/${pairKey}/bucket_list`);
    onValue(bucketRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        bucket_list: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: bucketRef });

    // Listen to thumb kiss events
    const thumbKissRef = ref(database, `pairs/${pairKey}/thumbKiss`);
    onValue(thumbKissRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        thumbKiss: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: thumbKissRef });

    // Listen to privacy settings updates
    const privacyRef = ref(database, `users/${user.id}/privacy_settings`);
    onValue(privacyRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        privacy_settings: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: privacyRef });

    // Listen to pic of day updates
    const picRef = ref(database, `pairs/${pairKey}/pic_of_day`);
    onValue(picRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData((prev) => ({
        ...prev,
        pic_of_day: data,
        lastUpdate: Date.now(),
      }));
    });
    activeListeners.push({ ref: picRef });

    setListeners(activeListeners);

    // Cleanup function
    return () => {
      activeListeners.forEach(({ ref: listenerRef }) => {
        off(listenerRef);
      });
    };
  }, [database, isPaired, user, getPairKey, forceRefresh]);

  const value = {
    ...realtimeData,
    pairKey: getPairKey(),
    isConnected: !!database && isPaired,
    database,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};

// Custom hook for subscribing to specific path
export const useRealtimeValue = (path) => {
  const [value, setValue] = useState(null);
  const { pairKey, isConnected } = useRealtime();

  useEffect(() => {
    if (!database || !isConnected || !path) return;

    const fullPath = path.startsWith("pairs/")
      ? path
      : `pairs/${pairKey}/${path}`;
    const valueRef = ref(database, fullPath);

    const unsubscribe = onValue(valueRef, (snapshot) => {
      setValue(snapshot.val());
    });

    return () => off(valueRef);
  }, [path, pairKey, isConnected]);

  return value;
};
