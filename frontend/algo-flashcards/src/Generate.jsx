import { useState } from "react";
import { generateCard } from "./api";
import { useNavigate } from "react-router-dom";

export default function Generate() {
  const [input, setInput] = useState("");
  const [card, setCard]   = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setCard(null);
    setLoading(true);
    try {
      const data = await generateCard(input);
      setCard(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <button onClick={() => nav(-1)}>← Back</button>
      <h1>Generate a New Flashcard</h1>

      <form onSubmit={handleSubmit}>
        <textarea
          rows={6}
          style={{ width: "100%" }}
          placeholder="Enter a problem name or full description…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {card && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Generated Fields</h2>
          <pre>{JSON.stringify(card, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
