import { useEffect, useMemo, useState } from "react";
import useCopyGen from "./hooks/useCopyGen";

function Label({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {children}
    </label>
  );
}

export default function App() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [features, setFeatures] = useState("");
  const [tone, setTone] = useState("friendly");
  const [audience, setAudience] = useState("general shoppers");
  const [bullets, setBullets] = useState(0);
  const [length, setLength] = useState("medium"); // short | medium | long

  const [result, setResult] = useState("");
  const { generateCopy, loading, error } = useCopyGen();

  // simple history in localStorage
  const storageKey = "copygen_history_v1";
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 25)));
  }, [history]);

  const canGenerate = useMemo(
    () => name.trim().length > 0 && !loading,
    [name, loading]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setResult("");

    // append length guidance to features/tone for better control
    const lengthHint =
      length === "short"
        ? "30–60 words"
        : length === "long"
        ? "120–180 words"
        : "60–120 words";

    const payload = {
      name,
      price,
      features: `${features}\n\nPreferred length: ${lengthHint}`,
      tone,
      audience,
      bullets,
    };

    const text = await generateCopy(payload);
    if (text) {
      setResult(text);
      setHistory((h) => [
        {
          id: Date.now(),
          name,
          price,
          tone,
          audience,
          bullets,
          length,
          features,
          output: text,
        },
        ...h,
      ]);
    }
  }

  function onCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
  }

  function onClear() {
    setResult("");
  }

  function loadFromHistory(item) {
    setName(item.name);
    setPrice(item.price);
    setFeatures(item.features);
    setTone(item.tone);
    setAudience(item.audience);
    setBullets(item.bullets);
    setLength(item.length);
    setResult(item.output);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            E-commerce Copy Generator
          </h1>
          <span className="text-xs text-gray-500">
            Local AI via <code className="font-mono">Ollama</code>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: form */}
        <section className="lg:col-span-2">
          <div className="bg-white shadow-sm border rounded-2xl p-6">
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-1">
                <Label htmlFor="name">Product name *</Label>
                <input
                  id="name"
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring focus:ring-gray-200"
                  placeholder="Red Sprint Sneakers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-1">
                <Label htmlFor="price">Price (optional)</Label>
                <input
                  id="price"
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring focus:ring-gray-200"
                  placeholder="49.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="features">
                  Key features (comma or new lines)
                </Label>
                <textarea
                  id="features"
                  className="w-full h-28 rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring focus:ring-gray-200 resize-y"
                  placeholder="breathable mesh, cushioned sole, non-slip grip, lightweight design"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="tone">Tone</Label>
                <select
                  id="tone"
                  className="w-full rounded-xl border border-gray-200 p-3"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="playful">Playful</option>
                  <option value="bold">Bold</option>
                </select>
              </div>

              <div>
                <Label htmlFor="aud">Audience</Label>
                <input
                  id="aud"
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring focus:ring-gray-200"
                  placeholder="students and runners"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="bullets">Bullet points</Label>
                <input
                  id="bullets"
                  type="number"
                  min="0"
                  max="6"
                  className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring focus:ring-gray-200"
                  value={bullets}
                  onChange={(e) => setBullets(Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="length">Length</Label>
                <select
                  id="length"
                  className="w-full rounded-xl border border-gray-200 p-3"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button
                  disabled={!canGenerate}
                  className="rounded-xl px-4 py-3 font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate copy"}
                </button>

                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-xl px-4 py-3 font-medium border border-gray-200"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={onCopy}
                  disabled={!result}
                  className="rounded-xl px-4 py-3 font-medium border border-gray-200 disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            </form>
          </div>

          {/* Result */}
          <div className="mt-6 bg-white shadow-sm border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3">Result</h2>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 rounded-xl p-3 mb-3">
                {error}
              </div>
            )}
            {result ? (
              <article className="prose prose-gray max-w-none whitespace-pre-wrap">
                {result}
              </article>
            ) : (
              <p className="text-sm text-gray-500">
                Your generated description will appear here.
              </p>
            )}
          </div>
        </section>

        {/* Right: history */}
        <aside className="lg:col-span-1">
          <div className="bg-white shadow-sm border rounded-2xl p-6">
            <h3 className="font-semibold mb-3">History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No items yet.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => loadFromHistory(item)}
                      className="w-full text-left rounded-xl border border-gray-200 p-3 hover:bg-gray-50 transition"
                    >
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.tone} · {item.length} · bullets: {item.bullets}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-gray-500">
        Powered by your local Ollama model — change model in
        <code className="mx-1">backend/.env</code> (<code>OLLAMA_MODEL</code>).
      </footer>
    </div>
  );
}
