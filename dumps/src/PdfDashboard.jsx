import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./PdfDashboard.css";

const API_URL = "http://localhost:5000/api/exams"; // ✅ use new backend

const ITEMS_PER_PAGE = 12;

export default function PdfDashboard() {
  const navigate = useNavigate();

  const [examData, setExamData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [pages, setPages] = useState({});
  const [vendorOptions, setVendorOptions] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        setExamData(data || {});
        setVendorOptions(Object.keys(data).sort());

        const initPages = {};
        Object.keys(data).forEach((v) => (initPages[v] = 1));
        setPages(initPages);
      })
      .catch((err) => {
        console.error("Failed to load exams:", err);
        setExamData({});
        setPages({});
        setVendorOptions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const clearFilters = () => {
    setSelectedVendor("");
    setSelectedExam("");
    const reset = {};
    Object.keys(examData).forEach((v) => (reset[v] = 1));
    setPages(reset);
  };

  // ✅ Exams for selected vendor
  const examsForVendor = (vendor) => {
    const examsObj = examData[vendor] || {};
    return Object.entries(examsObj).map(([examName, details]) => ({
      name: examName,
      imagepath: details?.Imagepath || "",
    }));
  };

  const filteredExamsForVendor = (vendor) => {
    let list = examsForVendor(vendor);
    if (selectedExam) list = list.filter((e) => e.name === selectedExam);
    return list;
  };

  const currentPageFor = (vendor) => pages[vendor] || 1;
  const setPageFor = (vendor, nextPage) =>
    setPages((prev) => ({ ...prev, [vendor]: nextPage }));

  const handleVendorChange = (e) => {
    const val = e.target.value;
    setSelectedVendor(val);
    setSelectedExam("");
    setPages((prev) => ({ ...prev, [val]: prev[val] || 1 }));
  };

  const handleExamChange = (e) => {
    setSelectedExam(e.target.value);
    const reset = {};
    Object.keys(examData).forEach((v) => (reset[v] = 1));
    setPages(reset);
  };

  const openViewer = (exam, vendor) => {
    navigate("/viewer", {
      state: { name: exam.name, vendor },
      replace: false,
    });
  };

  if (loading) {
    return (
      <div className="container">
        <h2>Loading Exams…</h2>
      </div>
    );
  }

  const vendorsToShow = selectedVendor ? [selectedVendor] : vendorOptions;

  return (
    <div className="container">
      <header className="topbar">
        <h1>Exam Library</h1>
        <div className="controls">
          <div className="control">
            <label>Vendor</label>
            <select value={selectedVendor} onChange={handleVendorChange}>
              <option value="">All Vendors</option>
              {vendorOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <label>Exam (vendor-specific)</label>
            <select
              value={selectedExam}
              onChange={handleExamChange}
              disabled={!selectedVendor}
            >
              <option value="">All Exams</option>
              {examsForVendor(selectedVendor).map((exam) => (
                <option key={exam.name} value={exam.name}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <button className="btn-clear" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </header>

      <main>
        {vendorsToShow.length === 0 ? (
          <p className="empty">No vendors found.</p>
        ) : (
          vendorsToShow.map((vendor) => {
            const allExams = filteredExamsForVendor(vendor);
            const page = currentPageFor(vendor);
            const start = (page - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const pageSlice = allExams.slice(start, end);

            return (
              <section key={vendor} className="folder-section">
                <div className="folder-header">
                  <h2>🏢 {vendor}</h2>
                  <div className="folder-stats">
                    <span>{allExams.length} exam(s)</span>
                  </div>
                </div>

                {allExams.length === 0 ? (
                  <p className="empty">No Exams for this vendor.</p>
                ) : (
                  <>
                    <div className="grid">
                      {pageSlice.map((exam) => (
                        <article
                          key={exam.name}
                          className="card"
                          onClick={() => openViewer(exam, vendor)}
                        >
                          <div className="card-body">
                            <div className="card-title">{exam.name}</div>
                            <div className="card-sub">
                              <small>{vendor}</small>
                            </div>

                            <img
                              src={exam.imagepath || "/placeholder.png"}
                              alt={exam.name}
                              className="card-img"
                            />
                          </div>

                          <div className="card-footer">
                            <button
                              className="btn-view"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                openViewer(exam, vendor);
                              }}
                            >
                              View
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>

                    {allExams.length > ITEMS_PER_PAGE && (
                      <div className="pagination">
                        <button
                          onClick={() =>
                            setPageFor(vendor, Math.max(1, page - 1))
                          }
                          disabled={page === 1}
                        >
                          Prev
                        </button>
                        <span>
                          Page {page} of{" "}
                          {Math.ceil(allExams.length / ITEMS_PER_PAGE)}
                        </span>
                        <button
                          onClick={() =>
                            setPageFor(
                              vendor,
                              Math.min(
                                Math.ceil(allExams.length / ITEMS_PER_PAGE),
                                page + 1
                              )
                            )
                          }
                          disabled={
                            page >= Math.ceil(allExams.length / ITEMS_PER_PAGE)
                          }
                        >
                          Next
                        </button>
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
