"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Demo, DemoRun, Material } from "@prisma/client";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_STATUS_COLORS } from "@/lib/constants";

type RunnerProps = {
  demo: Demo;
  materials: Material[];
  recentRuns: DemoRun[];
};

type UploadResponse = {
  fileName: string;
  extractedText: string;
  source: "pdf" | "image" | "text";
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type SavedPrompt = {
  id: string;
  name: string;
  text: string;
};

type PromptPayload = {
  systemPrompt: string;
  selectedPromptId: string;
  prompts: SavedPrompt[];
};

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant.";

export function DemoRunner({ demo, materials, recentRuns }: RunnerProps) {
  const [rawText, setRawText] = useState("");
  const [source, setSource] = useState<"text" | "pdf" | "image">("text");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [jobName, setJobName] = useState("");
  const [estimatedMaterial, setEstimatedMaterial] = useState("");
  const [actualMaterial, setActualMaterial] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [command, setCommand] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [promptName, setPromptName] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [promptsLoaded, setPromptsLoaded] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptStatus, setPromptStatus] = useState<string | null>(null);

  const isChatbotDemo = demo.slug === "chatbot";
  const title = useMemo(() => demo.title.replace(/^Demo\s[^:]+:\s*/i, ""), [demo.title]);

  const loadPromptPayload = useCallback(async () => {
    const response = await fetch(`/api/demos/${demo.slug}/prompts`, { method: "GET" });
    if (!response.ok) throw new Error("Could not load prompts");
    return (await response.json()) as PromptPayload;
  }, [demo.slug]);

  const savePromptState = useCallback(async (payload: { systemPrompt?: string; selectedPromptId?: string | null }) => {
    const response = await fetch(`/api/demos/${demo.slug}/prompts`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Could not save prompt state");
    return (await response.json()) as PromptPayload;
  }, [demo.slug]);

  const applyPromptPayload = useCallback((payload: PromptPayload) => {
    setSavedPrompts(payload.prompts);
    setSelectedPromptId(payload.selectedPromptId);
    setSystemPrompt(payload.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    const selectedPrompt = payload.prompts.find((entry) => entry.id === payload.selectedPromptId);
    setPromptName(selectedPrompt?.name ?? "");
  }, []);

  useEffect(() => {
    if (!isChatbotDemo) return;
    let cancelled = false;

    loadPromptPayload()
      .then((payload) => {
        if (cancelled) return;
        applyPromptPayload(payload);
        setPromptsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPromptStatus("Could not load saved prompts.");
        setPromptsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [applyPromptPayload, isChatbotDemo, loadPromptPayload]);

  useEffect(() => {
    if (!isChatbotDemo || !promptsLoaded) return;

    const handle = window.setTimeout(() => {
      savePromptState({ systemPrompt })
        .then(() => setPromptStatus("Prompt auto-saved."))
        .catch(() => setPromptStatus("Could not save prompt."));
    }, 250);

    return () => window.clearTimeout(handle);
  }, [isChatbotDemo, promptsLoaded, savePromptState, systemPrompt]);

  const run = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/demos/${demo.slug}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setResult(data);
      if (isChatbotDemo && typeof data?.assistantMessage === "string") {
        setChatHistory((previous) => [
          ...previous,
          { role: "user", text: String(payload.message ?? "") },
          { role: "assistant", text: data.assistantMessage },
        ]);
        setChatInput("");
      }
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!result) return;
    setAccepting(true);

    try {
      const response = await fetch(`/api/demos/${demo.slug}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { jobName, estimatedMaterial, actualMaterial, estimatedHours, actualHours, materialCost, laborRate }, result }),
      });

      const data = await response.json();
      setMessage(data.message || "Saved.");
    } finally {
      setAccepting(false);
    }
  };

  const onUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.querySelector("input[type='file']") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);

    setBusy(true);
    const response = await fetch("/api/upload", { method: "POST", body: data });
    const parsed = (await response.json()) as UploadResponse;
    setBusy(false);

    setRawText(parsed.extractedText);
    setSource(parsed.source);
    setMessage(`Uploaded ${parsed.fileName}.`);
  };

  const saveNamedPrompt = async () => {
    if (!isChatbotDemo) return;

    const normalizedName = promptName.trim();
    if (!normalizedName) {
      setPromptStatus("Enter a prompt name first.");
      return;
    }

    setPromptBusy(true);
    try {
      const response = await fetch(`/api/demos/${demo.slug}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          text: systemPrompt,
          select: true,
        }),
      });

      if (!response.ok) {
        setPromptStatus("Could not save prompt.");
        return;
      }

      const payload = (await response.json()) as PromptPayload;
      applyPromptPayload(payload);
      setPromptStatus(`Saved "${normalizedName}".`);
    } catch {
      setPromptStatus("Could not save prompt.");
    } finally {
      setPromptBusy(false);
    }
  };

  const selectNamedPrompt = async (id: string) => {
    setSelectedPromptId(id);
    const selected = savedPrompts.find((entry) => entry.id === id);
    if (selected) {
      setSystemPrompt(selected.text);
      setPromptName(selected.name);
    } else {
      setPromptName("");
    }

    try {
      const payload = await savePromptState({
        selectedPromptId: id || null,
        systemPrompt: selected?.text ?? systemPrompt,
      });
      applyPromptPayload(payload);
      if (selected) {
        setPromptStatus(`Loaded "${selected.name}".`);
      } else {
        setPromptStatus("Selection cleared.");
      }
    } catch {
      setPromptStatus("Could not update prompt selection.");
    }
  };

  const deleteSelectedPrompt = async () => {
    if (!selectedPromptId) return;

    const selected = savedPrompts.find((entry) => entry.id === selectedPromptId);
    setPromptBusy(true);
    try {
      const response = await fetch(`/api/demos/${demo.slug}/prompts/${selectedPromptId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setPromptStatus("Could not delete prompt.");
        return;
      }

      const payload = await loadPromptPayload();
      applyPromptPayload(payload);
      setPromptStatus(selected ? `Deleted "${selected.name}".` : "Deleted prompt.");
    } catch {
      setPromptStatus("Could not delete prompt.");
    } finally {
      setPromptBusy(false);
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || busy) return;
    run({
      systemPrompt,
      message: chatInput,
      history: chatHistory,
    });
  };

  const onChatInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1 max-w-3xl">{demo.description}</CardDescription>
          </div>
          <Badge className={DEMO_STATUS_COLORS[demo.status]}>{demo.status}</Badge>
        </div>
      </Card>

      {isChatbotDemo ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="flex min-h-[560px] flex-col space-y-4">
            <CardTitle>Chat</CardTitle>
            <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              {chatHistory.length ? (
                <div className="h-full space-y-3 overflow-auto pr-1 text-sm">
                  {chatHistory.map((entry, index) => (
                    <div key={`${entry.role}-${index}`} className={entry.role === "user" ? "text-right" : "text-left"}>
                      <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">{entry.role === "user" ? "You" : "Assistant"}</p>
                      <p className="inline-block max-w-[85%] whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-zinc-200">
                        {entry.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Send a message to start the chat.</p>
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={onChatInputKeyDown}
                placeholder="Write a message for the chatbot"
                className="min-h-28"
              />
              <Button onClick={sendChatMessage} disabled={busy || !chatInput.trim()} className="w-full">
                {busy ? "Sending..." : "Send Message"}
              </Button>
              {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="space-y-4">
              <CardTitle>Custom Prompt</CardTitle>
              <Textarea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="Set the assistant behavior"
                className="min-h-44"
                disabled={promptBusy}
              />
              <p className="text-xs text-zinc-500">Auto-saves as you type. Press Enter to send. Use Shift+Enter for a new line.</p>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Named Prompts</p>
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input value={promptName} onChange={(event) => setPromptName(event.target.value)} placeholder="Prompt name" />
                  <Button onClick={saveNamedPrompt} variant="outline" className="md:w-48" disabled={promptBusy || !systemPrompt.trim()}>
                    {promptBusy ? "Saving..." : "Save Named Prompt"}
                  </Button>
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <select
                    value={selectedPromptId}
                    onChange={(event) => selectNamedPrompt(event.target.value)}
                    disabled={promptBusy}
                    className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 md:flex-1"
                  >
                    <option value="">Select saved prompt</option>
                    {savedPrompts.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                  <Button onClick={deleteSelectedPrompt} variant="outline" className="md:w-32" disabled={!selectedPromptId || promptBusy}>
                    {promptBusy ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>

              {promptStatus ? <p className="text-xs text-zinc-400">{promptStatus}</p> : null}
            </Card>

            <Card className="space-y-4">
              <CardTitle>Raw Output</CardTitle>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <pre className="max-h-80 overflow-auto text-xs text-zinc-300">
                  {result ? JSON.stringify(result, null, 2) : "Send a message to see the raw API response."}
                </pre>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {!isChatbotDemo ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="space-y-4">
            <CardTitle>Input</CardTitle>

            {demo.slug === "email-or-pdf-to-order-draft" || demo.slug === "invoice-to-inventory-update" ? (
              <>
                <Textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Paste email text or extracted document text"
                  className="min-h-56"
                />
                <form onSubmit={onUpload} className="flex items-center gap-2">
                  <Input type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" className="h-10" />
                  <Button type="submit" variant="outline" disabled={busy}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </form>
                <Button
                  onClick={() => run({ rawText, source, sourceDoc: source })}
                  disabled={busy || !rawText.trim()}
                  className="w-full"
                >
                  {busy ? "Running..." : "Run Extraction"}
                </Button>
              </>
            ) : null}

            {demo.slug === "stock-warning-and-reorder" ? (
              <>
                <Textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Material name: quantity"
                  className="min-h-56"
                />
                <Button onClick={() => run({ consumptionText: rawText })} disabled={busy || !rawText.trim()} className="w-full">
                  {busy ? "Running..." : "Check Warnings"}
                </Button>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
                  Current materials:
                  <div className="mt-2 grid gap-1">
                    {materials.map((material) => (
                      <p key={material.id}>
                        {material.name}: {material.stockQty} {material.unit} (min {material.minStock})
                      </p>
                    ))}
                    {!materials.length ? <p>No materials configured yet.</p> : null}
                  </div>
                </div>
              </>
            ) : null}

            {demo.slug === "job-cost-sanity-check" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input value={jobName} onChange={(event) => setJobName(event.target.value)} placeholder="Job name" className="md:col-span-2" />
                <Input value={estimatedMaterial} onChange={(event) => setEstimatedMaterial(event.target.value)} placeholder="Estimated material" type="number" />
                <Input value={actualMaterial} onChange={(event) => setActualMaterial(event.target.value)} placeholder="Actual material" type="number" />
                <Input value={estimatedHours} onChange={(event) => setEstimatedHours(event.target.value)} placeholder="Estimated hours" type="number" />
                <Input value={actualHours} onChange={(event) => setActualHours(event.target.value)} placeholder="Actual hours" type="number" />
                <Input value={materialCost} onChange={(event) => setMaterialCost(event.target.value)} placeholder="Material cost" type="number" />
                <Input value={laborRate} onChange={(event) => setLaborRate(event.target.value)} placeholder="Labor rate" type="number" />
                <Button
                  onClick={() =>
                    run({
                      jobName,
                      estimatedMaterial: Number(estimatedMaterial),
                      actualMaterial: Number(actualMaterial),
                      estimatedHours: Number(estimatedHours),
                      actualHours: Number(actualHours),
                      materialCost: Number(materialCost),
                      laborRate: Number(laborRate),
                    })
                  }
                  className="md:col-span-2"
                >
                  {busy ? "Running..." : "Run Sanity Check"}
                </Button>
              </div>
            ) : null}

            {demo.slug === "natural-language-actions" ? (
              <>
                <Textarea value={command} onChange={(event) => setCommand(event.target.value)} className="min-h-40" />
                <Button onClick={() => run({ command })} disabled={busy || !command.trim()} className="w-full">
                  {busy ? "Running..." : "Execute Safe Action"}
                </Button>
              </>
            ) : null}

            <p className="text-xs text-zinc-500">Use your own data or uploads for each run.</p>
          </Card>

          <Card className="space-y-4">
            <CardTitle>Output Preview</CardTitle>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
              <pre className="max-h-96 overflow-auto text-xs text-zinc-300">
                {result ? JSON.stringify(result, null, 2) : "Run the demo to see structured output."}
              </pre>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={accept} disabled={!result || accepting}>
                {accepting ? "Saving..." : "Accept and Create Record"}
              </Button>
              {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Recent Runs</p>
              {recentRuns.length ? (
                <div className="space-y-2 text-xs text-zinc-300">
                  {recentRuns.map((run) => (
                    <p key={run.id}>
                      {new Date(run.createdAt).toLocaleString()} - {run.accepted ? "Accepted" : "Pending"}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No recent runs yet.</p>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
