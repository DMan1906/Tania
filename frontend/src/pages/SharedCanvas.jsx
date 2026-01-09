import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRealtime } from "../contexts/RealtimeContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Loader2,
  Trash2,
  Save,
  Download,
  RotateCcw,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BRUSH_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

const BRUSH_SIZES = [2, 5, 10, 15, 20];

export const SharedCanvas = () => {
  const { user } = useAuth();
  const { canvas: realtimeCanvas, lastUpdate, isConnected } = useRealtime();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#FF6B6B");
  const [brushSize, setBrushSize] = useState(5);
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partnerDrawing, setPartnerDrawing] = useState(null);
  const [pollingTimeout, setPollingTimeout] = useState(null);

  const fetchDrawings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/canvas`);
      setDrawings(response.data.drawings);
    } catch (err) {
      console.error("Failed to fetch drawings:", err);
    }
  }, []);

  useEffect(() => {
    fetchDrawings();
    setLoading(false);
  }, [fetchDrawings]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Real-time updates when partner saves/deletes drawing
  useEffect(() => {
    if (realtimeCanvas && lastUpdate) {
      if (realtimeCanvas.event === "drawing_saved") {
        setPartnerDrawing(realtimeCanvas);
        toast.success(
          `💎 ${realtimeCanvas.creator_name} saved: "${realtimeCanvas.title}"`
        );
        fetchDrawings();
      } else if (realtimeCanvas.event === "drawing_deleted") {
        toast.info("A drawing was deleted");
        fetchDrawings();
      }
    }
  }, [realtimeCanvas, lastUpdate, fetchDrawings]);

  // Polling fallback
  useEffect(() => {
    if (isConnected) {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
        setPollingTimeout(null);
      }
      return;
    }

    const timeout = setTimeout(() => {
      fetchDrawings();
    }, 15000);

    setPollingTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isConnected, pollingTimeout, fetchDrawings]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    toast.success("Canvas cleared");
  };

  const saveDrawing = async () => {
    if (!drawingTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL("image/png");

      await axios.post(`${API_URL}/canvas/save`, {
        title: drawingTitle,
        image_data: imageData,
      });

      toast.success("Drawing saved! 🎨");
      setDrawingTitle("");
      setDialogOpen(false);
      clearCanvas();
      fetchDrawings();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save drawing");
    } finally {
      setSaving(false);
    }
  };

  const deleteDrawing = async (drawingId) => {
    try {
      await axios.delete(`${API_URL}/canvas/${drawingId}`);
      toast.success("Drawing deleted");
      fetchDrawings();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete drawing");
    }
  };

  const downloadDrawing = (drawingId) => {
    const link = document.createElement("a");
    link.href = drawings.find((d) => d.drawing_id === drawingId)?.image_data;
    link.download = `drawing-${drawingId}.png`;
    link.click();
  };

  const viewDrawing = async (drawingId) => {
    try {
      const response = await axios.get(`${API_URL}/canvas/${drawingId}`);
      const img = new Image();
      img.src = response.data.image_data;
      const w = window.open("");
      w.document.write(img.outerHTML);
    } catch (err) {
      toast.error("Failed to load drawing");
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
    <div className="space-y-6" data-testid="shared-canvas-page">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Palette className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Shared Canvas
        </h1>
        <p className="text-muted-foreground">Create art together</p>
      </div>

      {/* Drawing Tools */}
      <Card className="border-border/50 shadow-soft">
        <CardContent className="p-4 space-y-4">
          {/* Color Picker */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Brush Color
            </Label>
            <div className="flex gap-2">
              {BRUSH_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ring-2 ${
                    color === c ? "ring-primary scale-110" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  data-testid={`color-${c}`}
                />
              ))}
            </div>
          </div>

          {/* Brush Size */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Brush Size: {brushSize}px
            </Label>
            <input
              type="range"
              min="2"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-full"
              data-testid="brush-size-slider"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={clearCanvas}
              variant="outline"
              className="flex-1 rounded-lg"
              data-testid="clear-canvas-btn"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="flex-1 rounded-lg bg-primary hover:bg-primary/90"
                  data-testid="save-drawing-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Save Your Drawing</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Drawing Title</Label>
                    <Input
                      id="title"
                      placeholder="My beautiful drawing..."
                      value={drawingTitle}
                      onChange={(e) => setDrawingTitle(e.target.value)}
                      className="rounded-lg mt-2"
                      data-testid="drawing-title-input"
                    />
                  </div>
                  <Button
                    onClick={saveDrawing}
                    disabled={saving}
                    className="w-full rounded-lg"
                    data-testid="confirm-save-btn"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Drawing
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card className="border-border/50 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full border border-border/30 cursor-crosshair bg-white"
            data-testid="drawing-canvas"
          />
        </CardContent>
      </Card>

      {/* Partner's Last Drawing */}
      <AnimatePresence>
        {partnerDrawing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-border/50 shadow-soft border-l-4 border-l-secondary">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {partnerDrawing.creator_name} just created:
                </p>
                <p className="font-medium text-foreground">
                  {partnerDrawing.title}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Drawings */}
      {drawings.length > 0 && (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Saved Drawings ({drawings.length})
            </h3>
            <div className="space-y-3">
              {drawings.map((drawing) => (
                <motion.div
                  key={drawing.drawing_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border border-border/30 rounded-lg p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {drawing.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {drawing.creator_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(drawing.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewDrawing(drawing.drawing_id)}
                      data-testid={`view-drawing-${drawing.drawing_id}`}
                    >
                      View
                    </Button>
                    {drawing.creator_name === user?.name && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteDrawing(drawing.drawing_id)}
                        data-testid={`delete-drawing-${drawing.drawing_id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-border/50 shadow-soft border-l-4 border-l-accent">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 Draw together! Each partner can create and save their own canvas
            drawings. View partner's drawings and build your art collection
            together.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
