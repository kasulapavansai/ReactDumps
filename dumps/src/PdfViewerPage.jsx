import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./App.css";

export default function PdfViewerPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Try state first
  const state = location.state || {};
  let { url, name, folder } = state;

  // Fallback: try to parse url from query param
  if (!url) {
    const params = new URLSearchParams(location.search);
    const q = params.get("url");
    if (q) url = decodeURIComponent(q);
  }

  // If still no url, show message
  if (!url) {
    return (
      <div className="container viewer-empty">
        <div className="viewer-top">
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <div style={{ padding: 24 }}>
          <h2>No PDF to display</h2>
          <p>Open the PDF from the dashboard instead.</p>
        </div>
      </div>
    );
  }

  // extract a friendly title if name not provided
  const title = name || (url.split("/").slice(-2)[0] || "PDF");

  return (
    <div className="viewer-page">
      <div className="viewer-header">
        <div className="viewer-left">
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="viewer-meta">
            <h2 className="viewer-title">{title}</h2>
            {folder && <span className="viewer-badge">📂 {folder}</span>}
          </div>
        </div>

        <div className="viewer-actions">
          <a className="btn-outline" href={url.replace("/preview", "/uc?export=download")} target="_blank" rel="noopener noreferrer">Download</a>
          <a className="btn-primary" href={url} target="_blank" rel="noopener noreferrer">Open in Drive</a>
        </div>
      </div>

      <div className="viewer-body">
        <iframe title={title} src={url} frameBorder="0" className="viewer-iframe" />
      </div>
    </div>
  );
}
