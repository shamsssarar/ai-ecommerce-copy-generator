import { useState } from "react";

export default function useCopyGen(baseUrl = "http://localhost:8000") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateCopy(payload) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/ai/generate-copy/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data.description;
    } catch (e) {
      setError(e.message || "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { generateCopy, loading, error };
}
