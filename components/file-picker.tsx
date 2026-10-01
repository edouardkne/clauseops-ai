"use client";

import { useEffect, useRef, useState } from "react";

import { extractPdfDocument, PDF_LIMITS } from "../lib/pdf/extract";
import type { ExtractedDocument } from "../lib/pdf/types";

import { Icon } from "./icon";
import { AnalysisResult } from "./analysis-result";
import { useAnalysisSession } from "./analysis-session";
import { documentFingerprint } from "../lib/intelligence/analysis-cache";
import { AI_ANALYSIS_LIMITS, AnalyzeContractRequestSchema, VerifiedContractAnalysisSchema } from "../lib/ai/contract-analysis-schema";

type FilePickerKind = "contract" | "evidence";

const EVIDENCE_FORMATS = [
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "png",
  "jpg",
  "jpeg",
] as const;

const EVIDENCE_MAX_BYTES = 20 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function excerpt(text: string, maxLength = 420) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

export function FilePicker({
  kind = "contract",
}: {
  kind?: FilePickerKind;
}) {
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const [analyzing, setAnalyzing] = useState(false);
  const session = useAnalysisSession();
  const analysis = kind === "contract" ? session.current?.analysis : undefined;
  const [reuseMessage, setReuseMessage] = useState("");
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => () => {
    revision.current++;
    activeRequest.current?.abort();
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] =
    useState<ExtractedDocument | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  const isContract = kind === "contract";

  const formats = isContract
    ? ["pdf"]
    : [...EVIDENCE_FORMATS];

  const accept = formats
    .map((format) => `.${format}`)
    .join(",");

  function resetSelection() {
    revision.current++;
    activeRequest.current?.abort();
    activeRequest.current = null;
    busy.current = false;
    setAnalyzing(false);
    if (kind === "contract") session.clearCurrent();
    setReuseMessage("");
    setAnalysisError("");
    setFile(null);
    setDocument(null);
    setError("");
    setProcessing(false);

    if (input.current) {
      input.current.value = "";
    }
  }

  async function choose(selected?: File) {
    if (!selected || busy.current) return;
    const currentRevision = ++revision.current;
    if (kind === "contract") session.clearCurrent();
    setReuseMessage("");
    setAnalysisError("");
    setError("");
    setDocument(null);

    if (!selected) {
      return;
    }

    if (!isContract) {
      const extension =
        selected.name
          .split(".")
          .pop()
          ?.toLowerCase() ?? "";

      if (!EVIDENCE_FORMATS.includes(
        extension as (typeof EVIDENCE_FORMATS)[number],
      )) {
        setFile(null);
        setError(
          `Choose a supported file: ${EVIDENCE_FORMATS.join(", ")}.`,
        );
        return;
      }

      if (selected.size > EVIDENCE_MAX_BYTES) {
        setFile(null);
        setError(
          "Evidence files are currently limited to 20 MB.",
        );
        return;
      }

      setFile(selected);
      return;
    }

    setFile(selected);
    setProcessing(true);
    busy.current = true;

    try {
      const extracted =
        await extractPdfDocument(selected);

      if (currentRevision === revision.current) setDocument(extracted);
    } catch (caught) {
      if (currentRevision !== revision.current) return;
      setFile(null);
      setDocument(null);

      setError(
        caught instanceof Error
          ? caught.message
          : "ClauseOps could not read this PDF.",
      );

      if (input.current) {
        input.current.value = "";
      }
    } finally {
      if (currentRevision === revision.current) {
        busy.current = false;
        setProcessing(false);
      }
    }
  }

  async function analyze() {
    if (!document || busy.current) return;
    const payload = {
      filename: document.filename,
      pages: document.pages.map(({ pageNumber, text }) => ({ pageNumber, text })),
    };
    setAnalysisError("");
    if (!AnalyzeContractRequestSchema.safeParse(payload).success) {
      setAnalysisError("AI analysis accepts up to 250,000 extracted characters in total and 50,000 per page. Use a shorter document; your extraction preview is still available.");
      return;
    }
    const currentRevision = revision.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    busy.current = true;
    setAnalyzing(true);
    const timer = setTimeout(() => controller.abort(), AI_ANALYSIS_LIMITS.timeoutMs + 10_000);
    try {
      const key = await documentFingerprint(payload);
      if (currentRevision !== revision.current || controller.signal.aborted) return;
      let providerRequested = false;
      const result = await session.cache.run(key, async () => {
        if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
        providerRequested = true;
        const response = await fetch("/api/analyze-contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          const message = response.status === 413
            ? "The extracted text is too large to analyse. Try a shorter document."
            : response.status === 400
              ? "The extracted pages could not be accepted. Please check the preview and select a supported PDF."
              : "AI analysis is unavailable or could not finish. Please try again; your extracted pages are still available.";
          throw new Error(message);
        }
        const body = await response.json();
        const parsed = VerifiedContractAnalysisSchema.safeParse(body.analysis);
        if (!parsed.success) throw new Error("The server returned an incomplete analysis. Please try again.");
        return parsed.data;
      });
      if (currentRevision === revision.current) {
        session.activate(key, document.filename, document.pageCount, result);
        setReuseMessage(providerRequested ? "Analysis ready. Operational intelligence is calculated locally." : "Existing analysis reused for this unchanged document. No AI request was sent.");
      }
    } catch (caught) {
      if (currentRevision !== revision.current) return;
      setAnalysisError(controller.signal.aborted
        ? "Analysis timed out. Your extracted pages are still available; you can try again."
        : caught instanceof Error && ["The extracted text", "The extracted pages", "AI analysis is unavailable", "The server returned"].some(prefix => caught.message.startsWith(prefix))
          ? caught.message
          : "The analysis request failed. Check your connection and try again.");
    } finally {
      clearTimeout(timer);
      if (currentRevision === revision.current) {
        busy.current = false;
        activeRequest.current = null;
        setAnalyzing(false);
      }
    }
  }

  const readablePages =
    document?.pages.filter(
      (page) => page.text.length > 0,
    ) ?? [];

  return (
    <div>
      <div
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void choose(
            event.dataTransfer.files[0],
          );
        }}
      >
        <span className="upload-symbol">
          <Icon
            name="upload"
            size={30}
          />
        </span>

        <h2>
          Drop your{" "}
          {isContract
            ? "contract"
            : "evidence"}{" "}
          here
        </h2>

        <p>
          {isContract
            ? "ClauseOps reads selectable PDF text locally and preserves page references."
            : "Attach supporting evidence to your compliance workflow."}
        </p>

        <input
          ref={input}
          className="sr-only"
          type="file"
          accept={accept}
          aria-label={`Choose ${kind} file`}
          onChange={(event) => {
            void choose(
              event.target.files?.[0],
            );
          }}
          tabIndex={-1}
        />

        <button
          type="button"
          className="button primary"
          disabled={processing || analyzing}
          onClick={() =>
            input.current?.click()
          }
        >
          {processing
            ? "Reading PDF…"
            : "Choose File"}
        </button>

        <small>
          {isContract
            ? `PDF · Up to ${PDF_LIMITS.maxBytes / (1024 * 1024)} MB · ${PDF_LIMITS.maxPages} pages maximum`
            : `${formats
                .map((format) =>
                  format.toUpperCase(),
                )
                .join(", ")} · Up to 20 MB · One file at a time`}
        </small>
      </div>

      <div
        aria-live="polite"
        aria-busy={processing}
      >
        {processing && (
          <div
            className="inline-note"
            role="status"
          >
            <Icon name="file" />
            <div>
              <strong>
                Reading document locally
              </strong>
              <p>
                Extracting selectable text
                and preserving page
                boundaries. Nothing has been
                sent to an AI provider.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p
            className="error-message"
            role="alert"
          >
            {error}
          </p>
        )}

        {file && (
          <div className="selected-file">
            <Icon name="file" />

            <div>
              <strong>{file.name}</strong>

              <p>
                {formatFileSize(file.size)}
                {document
                  ? ` · ${document.pageCount} pages · ${document.characterCount.toLocaleString("en-US")} extracted characters`
                  : " · Selected locally only"}
              </p>
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label="Remove selected file"
              onClick={resetSelection}
            >
              <Icon name="close" />
            </button>
          </div>
        )}

        {document && (
          <>
            <div className="inline-note">
              <Icon name="shield" />

              <div>
                <strong>
                  PDF text extracted locally
                </strong>

                <p>
                  {document.pageCount} pages
                  detected ·{" "}
                  {readablePages.length} pages
                  contain selectable text ·{" "}
                  {document.characterCount.toLocaleString(
                    "en-US",
                  )}{" "}
                  characters extracted.
                </p>

                <p>
                  Review the extracted pages before choosing AI analysis.
                  Empty pages are retained to preserve original page numbers.
                </p>
              </div>
            </div>

            <details className="card extracted-preview">
              <summary
                className="text-link"
                style={{
                  cursor: "pointer",
                  padding: "18px 20px",
                }}
              >
                Preview extracted pages
              </summary>

              <div
                style={{
                  padding: "0 20px 20px",
                }}
              >
                {readablePages
                  .slice(0, 3)
                  .map((page) => (
                    <div
                      key={page.pageNumber}
                    >
                      <h3 className="source-heading">
                        Page {page.pageNumber}
                      </h3>

                      <blockquote>
                        {excerpt(page.text)}
                      </blockquote>
                    </div>
                  ))}

                {readablePages.length >
                  3 && (
                  <p className="small-muted">
                    Preview shows the first 3
                    readable pages only. All{" "}
                    {readablePages.length}{" "}
                    readable pages remain
                    available in memory for the
                    next analysis step.
                  </p>
                )}
              </div>
            </details>
          </>
        )}
      </div>

      <div className="privacy-note">
        <Icon name="shield" />

        <p>
          {isContract ? (
            <>
              <strong>
                Your PDF stays on your device
                during extraction.
              </strong>{" "}
              Parsing and the PDF binary stay local. Only when you click
              Analyze with AI, the filename and extracted page text are sent
              through our server to OpenAI. ClauseOps keeps the result in this
              workspace session memory, with no database storage or document analytics.
              Results survive workspace navigation; refreshing or clearing the session removes them. OpenAI’s API
              data policies apply to transmitted text; this is not a zero-retention guarantee.
            </>
          ) : (
            <>
              <strong>
                Your evidence stays on your
                device.
              </strong>{" "}
              This Phase 1 preview displays
              only local file metadata. No
              evidence content is uploaded or
              stored.
            </>
          )}
        </p>
      </div>

      {document && isContract && (
        <div className="stack">
          <div className="demo-notice">
            <Icon name="shield" />
            <span>
              AI analysis uses the extracted text, not the PDF file.
              Source citations are checked against that text. This checks a text
              match, not legal correctness or evidence authenticity.
            </span>
          </div>

          <button type="button" className="button primary" disabled={analyzing} onClick={() => void analyze()}>
            <Icon name="spark" size={18} />
            {analyzing ? "Analysing document…" : analysis ? "Reuse current analysis" : "Analyze with AI"}
          </button>
          <div aria-live="polite" aria-busy={analyzing}>
            {analyzing && <p className="inline-note" role="status">Analysing the extracted pages and checking supporting quotes. This can take up to two minutes. Your page preview remains available.</p>}
            {analysisError && <p className="error-message" role="alert">{analysisError}</p>}
            {reuseMessage && <p className="small-muted" role="status">{reuseMessage}</p>}
          </div>
        </div>
      )}
      {isContract && session.current && <>
        <AnalysisResult key={session.current.key} />
        <button className="button secondary" type="button" onClick={() => { resetSelection(); session.forgetAll(); }}>Clear analysis session</button>
      </>}
    </div>
  );
}
