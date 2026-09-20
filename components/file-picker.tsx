"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
export function FilePicker({ kind = "contract" }: {
  kind?: "contract" | "evidence";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const formats = kind === "contract" ? ["pdf", "docx", "txt"] : ["pdf", "docx", "xlsx", "csv", "png", "jpg", "jpeg"];
  function choose(selected?: File) {
    setError(""); setFile(null); if(!selected)
      return; if(!formats.includes(selected.name.split(".").pop()?.toLowerCase() || "")) {
        setError(`Choose a supported file: ${formats.join(", ")}.`);
        return;
      } if(selected.size > 20 * 1024 * 1024) {
        setError("This preview accepts files up to 20 MB.");
        return;
      } setFile(selected);
  }
  return <div>
    <div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}>
      <span className="upload-symbol">
        <Icon name="upload" size={30} />
      </span>
      <h2>Drop your {kind === "contract" ? "document" : "evidence"} here</h2>
      <p>Bring your next obligation into focus.</p>
      <input ref={input} className="sr-only" type="file" accept={formats.map(f => `.${f}`).join(",")} aria-label={`Choose ${kind} file`} onChange={e => choose(e.target.files?.[0])} tabIndex={-1} />
      <button type="button" className="button primary" onClick={() => input.current?.click()}>Choose File</button>
      <small>{formats.map(f => f.toUpperCase()).join(", ")} · Up to 20 MB · One file at a time</small>
    </div>
    <div aria-live="polite">{error && <p className="error-message" role="alert">{error}</p>}{file && <div className="selected-file">
      <Icon name="file" />
      <div>
        <strong>{file.name}</strong>
        <p>{(file.size / 1024).toFixed(1)} KB · Selected locally only. No file was uploaded or saved.</p>
      </div>
      <button className="icon-button" aria-label="Remove selected file" onClick={() => {
        setFile(null); if(input.current)
          input.current.value = "";
      }}>
        <Icon name="close" />
      </button>
    </div>}</div>
    <div className="privacy-note">
      <Icon name="shield" />
      <p>
        <strong>Your document stays on your device.</strong> This frontend preview only displays the selected filename and size. No contents are read, sent, analysed, or stored.</p>
    </div>{file && kind === "contract" && <Link className="button secondary" href="/contracts/demo">Explore a pre-built demo analysis <Icon name="arrow" size={16} />
    </Link>}</div>;
}
