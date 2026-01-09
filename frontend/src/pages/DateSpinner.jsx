import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DateSpinner = () => {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("mixed");
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/date-spinner/categories`);
        setCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load spinner categories", err);
      }
    };
    load();
  }, []);

  const spin = async () => {
    setSpinning(true);
    setResult(null);
    try {
      const res = await axios.get(`${API_URL}/date-spinner/spin`, {
        params: { category: category === "mixed" ? undefined : category },
      });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to spin the wheel");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Date Spinner
        </h1>
        <p className="text-muted-foreground">
          Let fate pick a date idea for you
        </p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={spin} disabled={spinning} className="rounded-full">
              {spinning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                "Spin"
              )}
            </Button>
          </div>

          {result && (
            <div className="mt-6 text-center">
              <h2 className="font-semibold text-lg">Result</h2>
              <p className="mt-2 text-foreground text-xl">{result.result}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Category: {result.category}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DateSpinner;
