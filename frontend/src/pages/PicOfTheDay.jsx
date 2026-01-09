import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRealtime } from "../contexts/RealtimeContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Loader2, Camera, Upload, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PicOfTheDay = () => {
  const { user } = useAuth();
  const { realtimeUpdates } = useRealtime();
  const [pic, setPic] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cloudinaryWidget, setCloudinaryWidget] = useState(null);

  const fetchPicOfDay = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/pic-of-day`);
      setPic(res.data);
    } catch (err) {
      console.error("Failed to fetch pic of day:", err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/pic-of-day/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch pic history:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPicOfDay(), fetchHistory()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPicOfDay, fetchHistory]);

  // Listen for realtime updates
  useEffect(() => {
    if (realtimeUpdates.pic_of_day) {
      fetchPicOfDay();
      toast.info("Partner uploaded today's pic! 📸");
    }
  }, [realtimeUpdates.pic_of_day, fetchPicOfDay]);

  // Initialize Cloudinary widget
  useEffect(() => {
    if (window.cloudinary) {
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
          folder: "candle/pic-of-day",
          multiple: false,
          maxFiles: 1,
          resourceType: "image",
          clientAllowedFormats: ["jpg", "jpeg", "png", "gif", "webp"],
        },
        (error, result) => {
          if (!error && result && result.event === "success") {
            const imageUrl = result.info.secure_url;
            uploadPic(imageUrl);
          }
        }
      );
      setCloudinaryWidget(widget);
    }
  }, []);

  const uploadPic = async (imageUrl) => {
    setUploading(true);
    try {
      await axios.post(`${API_URL}/pic-of-day`, { image_url: imageUrl });
      toast.success("Your pic is up! 📸");
      fetchPicOfDay();
    } catch (err) {
      toast.error("Failed to upload pic");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const openUploadWidget = () => {
    if (cloudinaryWidget) {
      cloudinaryWidget.open();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pic-of-day-page">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Pic of the Day
        </h1>
        <p className="text-muted-foreground">
          Share a photo! Exchange daily snapshots with{" "}
          {user?.partner_name?.split(" ")[0]}
        </p>
      </div>

      {/* Today's Pic Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-border/50 shadow-soft overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>Today's Exchange</span>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pic?.status === "no_pic" ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No pics shared yet. Start the exchange!
                </p>
                <Button
                  onClick={openUploadWidget}
                  disabled={uploading}
                  className="rounded-full py-5 font-bold shadow-soft hover:shadow-hover"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Your Pic
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Partner's Photo */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {user?.partner_name?.split(" ")[0]}'s Photo
                  </p>
                  <div className="relative rounded-lg overflow-hidden bg-muted aspect-square">
                    {pic?.should_blur ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <EyeOff className="w-8 h-8 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground text-center px-4">
                          Your photo will unlock theirs!
                        </p>
                      </div>
                    ) : (
                      <img
                        src={pic?.partner_image}
                        alt="Partner's pic"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Your Photo Upload / Status */}
                {!pic?.my_uploaded ? (
                  <Button
                    onClick={openUploadWidget}
                    disabled={uploading}
                    className="w-full rounded-full py-5 font-bold shadow-soft hover:shadow-hover"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Your Pic to Unlock
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-500/10 rounded-lg p-3">
                    <Eye className="w-4 h-4" />
                    You've unlocked their photo!
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* History Section */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Past Pics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {history.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-lg overflow-hidden bg-muted aspect-square"
                  >
                    <img
                      src={item.image_url}
                      alt={item.date}
                      className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Info Card */}
      <Card className="border-border/50 shadow-soft border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 Privacy first! Your photos are only visible to your partner.
            Photos are automatically saved to your Memories.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
