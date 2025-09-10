import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./PdfDashboard.css"

const API_URL = "http://localhost:5000/api/pdfs";
const ITEMS_PER_PAGE = 12;

export default function PdfDashboard() {
  const navigate = useNavigate();

  const [pdfData, setPdfData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [pages, setPages] = useState({});
  const [folderOptions, setFolderOptions] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        const payload = data.pdfs || {};
        setPdfData(payload);

        const initPages = {};
        Object.keys(payload).forEach((f) => (initPages[f] = 1));
        setPages(initPages);
        setFolderOptions(Object.keys(payload).sort());
      })
      .catch((err) => {
        console.error("Failed to load pdfs:", err);
        setPdfData({});
        setPages({});
        setFolderOptions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const clearFilters = () => {
    setSelectedFolder("");
    setSelectedPdfUrl("");
    const reset = {};
    Object.keys(pdfData).forEach((f) => (reset[f] = 1));
    setPages(reset);
  };

  const pdfOptionsForSelectedFolder = selectedFolder
    ? (pdfData[selectedFolder] || []).map((p) => ({ name: p.name, url: p.url }))
    : [];

  const getDisplayedPdfsForFolder = (folder) => {
    let list = (pdfData[folder] || []).slice();
    if (selectedPdfUrl) list = list.filter((p) => p.url === selectedPdfUrl);
    return list;
  };

  const currentPageFor = (folder) => pages[folder] || 1;
  const setPageFor = (folder, nextPage) =>
    setPages((prev) => ({ ...prev, [folder]: nextPage }));

  const handleFolderChange = (e) => {
    const val = e.target.value;
    setSelectedFolder(val);
    setSelectedPdfUrl("");
    setPages((prev) => ({ ...prev, [val]: prev[val] || 1 }));
  };

  const handlePdfChange = (e) => {
    setSelectedPdfUrl(e.target.value);
    const reset = {};
    Object.keys(pdfData).forEach((f) => (reset[f] = 1));
    setPages(reset);
  };

  const openViewer = (pdf, folder) => {
    // Navigate to /viewer with state (so back works). Also add url query fallback.
    navigate("/viewer", {
      state: { url: pdf.url, name: pdf.name, folder },
      replace: false,
      search: `?url=${encodeURIComponent(pdf.url)}`, // helps refresh fallback
    });
  };

  if (loading) {
    return <div className="container"><h2>Loading PDFs…</h2></div>;
  }

  const foldersToShow = selectedFolder ? [selectedFolder] : folderOptions;

  return (
    <div className="container">
      <header className="topbar">
        <h1>PDF Library</h1>
        <div className="controls">
          <div className="control">
            <label>Folder</label>
            <select value={selectedFolder} onChange={handleFolderChange}>
              <option value="">All Folders</option>
              {folderOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>PDF (folder-specific)</label>
            <select
              value={selectedPdfUrl}
              onChange={handlePdfChange}
              disabled={!selectedFolder}
            >
              <option value="">All PDFs</option>
              {pdfOptionsForSelectedFolder.map((p) => (
                <option key={p.url} value={p.url}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="control">
            <button className="btn-clear" onClick={clearFilters}>Clear Filters</button>
          </div>
        </div>
      </header>

      <main>
        {foldersToShow.length === 0 ? (
          <p className="empty">No folders found.</p>
        ) : (
          foldersToShow.map((folder) => {
            const allPdfs = getDisplayedPdfsForFolder(folder);
            const page = currentPageFor(folder);
            const start = (page - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const pageSlice = allPdfs.slice(start, end);

            return (
              <section key={folder} className="folder-section">
                <div className="folder-header">
                  <h2>📂 {folder}</h2>
                  <div className="folder-stats">
                    <span>{allPdfs.length} item(s)</span>
                  </div>
                </div>

                {allPdfs.length === 0 ? (
                  <p className="empty">No PDFs in this folder.</p>
                ) : (
                  <>
                    <div className="grid">
                      {pageSlice.map((pdf) => (
                        <article key={pdf.url} className="card" onClick={() => openViewer(pdf, folder)}>
                          <div className="card-body">
                            <div className="card-title">{pdf.name}</div>
                            <div className="card-sub"><small>{folder}</small></div>
                          </div>
                          <div className="card-footer">
                            <button
                              className="btn-view"
                              onClick={(ev) => { ev.stopPropagation(); openViewer(pdf, folder); }}
                            >
                              View
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>

                    {allPdfs.length > ITEMS_PER_PAGE && (
                      <div className="pagination">
                        <button onClick={() => setPageFor(folder, Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
                        <span>Page {page} of {Math.ceil(allPdfs.length / ITEMS_PER_PAGE)}</span>
                        <button onClick={() => setPageFor(folder, Math.min(Math.ceil(allPdfs.length / ITEMS_PER_PAGE), page + 1))} disabled={page >= Math.ceil(allPdfs.length / ITEMS_PER_PAGE)}>Next</button>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}