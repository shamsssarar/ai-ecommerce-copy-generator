import { useState } from "react";

export default function useAi(baseUrl = "http://localhost:8000") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate(prompt) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/ai/generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data.text;
    } catch (e) {
      setError(e.message || "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { generate, loading, error };
}
