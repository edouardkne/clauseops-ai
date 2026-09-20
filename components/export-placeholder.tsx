"use client";
import { useState } from "react";
import { Icon } from "./icon";
export function ExportPlaceholder() {
  const [shown, setShown] = useState(false); return <div className="export-placeholder">
    <button className="button secondary" aria-expanded={shown} onClick={() => setShown(!shown)}>
      <Icon name="file" size={17} />Export report <span className="mini-label">Preview</span>
    </button>{shown && <p role="status">PDF export is planned for a later phase. No file has been generated.</p>}</div>;
}
