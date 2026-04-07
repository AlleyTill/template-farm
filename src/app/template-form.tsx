"use client";

import { useState } from "react";
import type { Recipe } from "./types";

export function TemplateForm() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || loading) return;
    setLoading(true);
    setError(null);
    setRecipe(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = (await res.json()) as Recipe;
      setRecipe(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label htmlFor="desc">What are you trying to build?</label>
        <textarea
          id="desc"
          className="nes-textarea"
          rows={5}
          placeholder="e.g. A simple REST API for tracking houseplants, with a web dashboard..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className={`nes-btn ${loading ? "is-disabled" : "is-success"}`}
          disabled={loading}
        >
          {loading ? "Growing..." : "Plant seed 🌱"}
        </button>
      </form>

      {error && (
        <div className="nes-container is-rounded is-error">
          <p>{error}</p>
        </div>
      )}

      {recipe && <RecipeCard recipe={recipe} />}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="flex flex-col gap-4">
      <div className="nes-container with-title is-rounded">
        <p className="title">{recipe.name}</p>
        <p>
          <strong>Stack:</strong> {recipe.stack.join(", ")}
        </p>
        <p className="mt-2">{recipe.rationale}</p>
      </div>

      <div className="nes-container with-title is-rounded">
        <p className="title">Scaffold</p>
        <pre className="recipe">{recipe.scaffoldCommands.join("\n")}</pre>
      </div>

      <div className="nes-container with-title is-rounded">
        <p className="title">Build &amp; run</p>
        <pre className="recipe">{recipe.compileSteps.join("\n")}</pre>
      </div>
    </article>
  );
}
