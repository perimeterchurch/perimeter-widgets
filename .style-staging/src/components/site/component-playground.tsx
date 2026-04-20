"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const WIDTH_PRESETS = [
  { label: "Mobile", width: 375 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: 1280 },
  { label: "Full", width: null },
] as const;

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/lib/theme-context";
import { PlaygroundControls } from "./playground-controls";
import { CodeBlock } from "./code-block";
import { buildSnippet } from "@/lib/build-snippet";
import { demoImports } from "@/lib/demo-imports";
import { highlightClient } from "@/lib/highlight-client";

import type { ControlsConfig } from "@/lib/demo-types";

interface ComponentPlaygroundProps {
  slug: string;
  controls: ControlsConfig;
  componentName: string;
  defaultCodeHtml: string;
  defaultCodeRaw: string;
}

function buildDefaults(controls: ControlsConfig): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [name, descriptor] of Object.entries(controls)) {
    defaults[name] = descriptor.default;
  }
  return defaults;
}

export function ComponentPlayground({
  slug,
  controls,
  componentName,
  defaultCodeHtml,
  defaultCodeRaw,
}: ComponentPlaygroundProps) {
  const { availableThemes } = useTheme();
  const defaults = useMemo(() => buildDefaults(controls), [controls]);
  const [values, setValues] = useState<Record<string, unknown>>(defaults);
  const [Playground, setPlayground] = useState<React.ComponentType<
    Record<string, unknown>
  > | null>(null);
  const [codeHtml, setCodeHtml] = useState(defaultCodeHtml);
  const [codeRaw, setCodeRaw] = useState(defaultCodeRaw);
  const [activeTab, setActiveTab] = useState("preview");
  const [importError, setImportError] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const importFn = demoImports[slug];
    const load = importFn
      ? importFn()
      : Promise.reject(new Error(`No demo found for "${slug}"`));

    load
      .then((mod) => {
        setPlayground(
          () => mod.Playground as React.ComponentType<Record<string, unknown>>,
        );
      })
      .catch((err: unknown) => {
        setImportError(
          err instanceof Error ? err.message : "Failed to load component demo",
        );
      });
  }, [slug]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  const updateCodeHighlight = useCallback(
    (currentValues: Record<string, unknown>) => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => {
        const code = buildSnippet(componentName, controls, currentValues);
        setCodeRaw(code);
        highlightClient(code).then(setCodeHtml);
      }, 150);
    },
    [componentName, controls],
  );

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = previewRef.current?.offsetWidth ?? 800;

    function onMove(ev: PointerEvent) {
      const delta = ev.clientX - startX;
      setPreviewWidth(Math.max(320, startWidth + delta));
    }

    function onUp() {
      setIsDragging(false);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  function handleChange(name: string, value: unknown) {
    const next = { ...values, [name]: value };
    setValues(next);
    updateCodeHighlight(next);
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        aria-label="Component playground"
      >
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
        </TabsList>

        <div className="relative overflow-hidden rounded-lg border">
          <div
            className="transition-all duration-300 ease-in-out"
            style={{
              opacity: activeTab === "preview" ? 1 : 0,
              height: activeTab === "preview" ? "auto" : 0,
              overflow: activeTab === "preview" ? "visible" : "hidden",
            }}
          >
            {/* Responsive toolbar */}
            <div className="flex items-center gap-1 border-b px-3 py-1.5">
              {WIDTH_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPreviewWidth(preset.width)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    previewWidth === preset.width
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              {previewWidth && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {previewWidth}px
                </span>
              )}
            </div>

            <div className="flex justify-center bg-background">
              <div
                ref={previewRef}
                className="relative w-full"
                style={{ maxWidth: previewWidth ?? undefined }}
              >
                <div className="flex min-h-48 items-center justify-center p-8">
                  {importError ? (
                    <div className="text-sm text-destructive">
                      {importError}
                    </div>
                  ) : Playground ? (
                    <Playground {...values} />
                  ) : (
                    <div className="flex w-full flex-col items-center gap-4 p-8">
                      <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
                      <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
                    </div>
                  )}
                </div>

                {/* Drag handle */}
                {previewWidth && (
                  <div
                    onPointerDown={handleDragStart}
                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize transition-colors hover:bg-primary/20 ${
                      isDragging ? "bg-primary/30" : ""
                    }`}
                  />
                )}
              </div>
            </div>
          </div>

          <div
            className="transition-all duration-300 ease-in-out"
            style={{
              opacity: activeTab === "code" ? 1 : 0,
              height: activeTab === "code" ? "auto" : 0,
              overflow: activeTab === "code" ? "visible" : "hidden",
            }}
          >
            <CodeBlock
              html={codeHtml}
              rawCode={codeRaw}
              showHeader={false}
              className="rounded-none border-0"
            />
          </div>

          <div
            className="transition-all duration-300 ease-in-out"
            style={{
              opacity: activeTab === "compare" ? 1 : 0,
              height: activeTab === "compare" ? "auto" : 0,
              overflow: activeTab === "compare" ? "visible" : "hidden",
            }}
          >
            <div className="grid min-h-48 grid-cols-1 sm:grid-cols-2">
              {/* Light mode */}
              <div className="light border-b bg-background text-foreground p-4 sm:border-b-0 sm:border-r">
                <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                  Light
                </p>
                <div className="flex items-center justify-center rounded-md border border-border bg-background p-4">
                  {Playground ? (
                    <Playground {...values} />
                  ) : (
                    <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
                  )}
                </div>
              </div>
              {/* Dark mode */}
              <div className="dark bg-background text-foreground p-4">
                <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                  Dark
                </p>
                <div className="flex items-center justify-center rounded-md border border-border bg-background p-4">
                  {Playground ? (
                    <Playground {...values} />
                  ) : (
                    <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="transition-all duration-300 ease-in-out"
            style={{
              opacity: activeTab === "themes" ? 1 : 0,
              height: activeTab === "themes" ? "auto" : 0,
              overflow: activeTab === "themes" ? "visible" : "hidden",
            }}
          >
            <div className="space-y-6 p-4">
              {["", ...availableThemes].map((themeSlug) => (
                <div key={themeSlug || "default"}>
                  <p className="mb-3 text-sm font-medium">
                    {themeSlug
                      ? themeSlug
                          .split("-")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")
                      : "Default"}
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Light — use .light class to force light-mode CSS variables */}
                    <div
                      data-theme={themeSlug || undefined}
                      className="light flex items-center justify-center rounded-md border border-border bg-background text-foreground p-4"
                    >
                      {Playground ? (
                        <Playground {...values} />
                      ) : (
                        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
                      )}
                    </div>
                    {/* Dark */}
                    <div
                      data-theme={themeSlug || undefined}
                      className="dark flex items-center justify-center rounded-md border border-border bg-background text-foreground p-4"
                    >
                      {Playground ? (
                        <Playground {...values} />
                      ) : (
                        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Tabs>

      {Object.keys(controls).length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">{componentName} Controls</h3>
          <PlaygroundControls
            controls={controls}
            values={values}
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  );
}
