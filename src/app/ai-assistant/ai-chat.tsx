"use client";

import { useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import type { ScoringFormatPreset } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface AIResponse {
  recommendation: string;
  reasoning: string;
  alternatives: string[];
  risk: string;
  confidence: number;
  providerUsed: string;
  conversationId: string;
}

interface ChatTurn {
  question: string;
  response: AIResponse;
}

const SUGGESTED_PROMPTS = [
  "I pick 10th in a 12-team PPR league. Give me a draft strategy.",
  "Who are the best rookie WRs?",
  "Who are the best late-round RBs?",
  "Should I take a quarterback in round 5?",
  "Which rookies have the best landing spots?",
];

export function AIChat({ season, scoringFormat }: { season: number; scoringFormat: ScoringFormatPreset }) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, season, scoringFormat, conversationId }),
      });
      const data: AIResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reach the AI assistant");
      setConversationId(data.conversationId);
      setTurns((t) => [...t, { question: q, response: data }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the AI assistant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {turns.length === 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {turns.map((turn, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-3.5 w-3.5" />
              </div>
              <p className="mt-1 text-sm">{turn.question}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <Card className="flex-1 border-border/70">
                <CardContent className="space-y-2 p-3">
                  <p className="text-sm font-semibold">{turn.response.recommendation}</p>
                  <p className="text-xs text-muted-foreground">{turn.response.reasoning}</p>
                  {turn.response.alternatives.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Alternatives: </span>
                      {turn.response.alternatives.join(", ")}
                    </p>
                  ) : null}
                  <p className="text-xs text-amber-400">{turn.response.risk}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {turn.response.providerUsed}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Confidence {Math.round(turn.response.confidence * 100)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex items-center gap-2 pl-8 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <div className="mt-4 flex items-end gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
          placeholder="Ask about a matchup, a strategy, or a specific player..."
          className="min-h-[44px] resize-none"
          rows={1}
        />
        <Button onClick={() => ask(question)} disabled={loading || !question.trim()} size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3" /> Grounded in this app&apos;s player, ranking, projection, and ADP data -- never invents stats.
      </p>
    </div>
  );
}
