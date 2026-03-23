import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { system, prompt, useWebSearch } = await req.json();

    if (!system || !prompt) {
      return NextResponse.json({ error: "Missing system or prompt" }, { status: 400 });
    }

    let text = "";

    if (useWebSearch) {
      // Use web search tool — cast to any to bypass SDK version type constraints
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      };
      const message = await anthropic.messages.create(params);
      text = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

    } else {
      // Standard mode: no web search
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      text = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
    }

    return NextResponse.json({ text });

  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
