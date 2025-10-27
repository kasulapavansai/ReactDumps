// TakeAssessment.jsx
import React, { useEffect, useState } from "react";
import "./TakeAssessment.css";

const API_EXAMS_URL = "http://localhost:5000/api/exams";
const API_EXAM_URL = "http://localhost:5000/api/exam";

export default function TakeAssessment() {
  // vendor/exam dropdowns
  const [examData, setExamData] = useState({});
  const [vendorOptions, setVendorOptions] = useState([]);
  const [examOptions, setExamOptions] = useState([]);

  const [vendor, setVendor] = useState("");
  const [examName, setExamName] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);

  // assessment state
  const [questions, setQuestions] = useState([]); // array of {id, Question, Options, CorrectAnswers, ...}
  const [page, setPage] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // qid -> array of letters
  const [revealedAnswers, setRevealedAnswers] = useState({}); // qid -> true/false
  const [submitted, setSubmitted] = useState(false);
  const [submittedScore, setSubmittedScore] = useState(null);

  const pageSize = 3;

  // Load vendor/exam listing
  useEffect(() => {
    fetch(API_EXAMS_URL)
      .then((r) => r.json())
      .then((data) => {
        const obj = data || {};
        setExamData(obj);
        setVendorOptions(Object.keys(obj).sort());
      })
      .catch((err) => {
        console.error("Failed to load exams:", err);
        setExamData({});
        setVendorOptions([]);
      });
  }, []);

  // update examOptions when vendor changes
  useEffect(() => {
    if (!vendor) {
      setExamOptions([]);
      setExamName("");
      return;
    }
    const examsForVendor = examData[vendor] || {};
    setExamOptions(Object.keys(examsForVendor));
    if (examName && !examsForVendor[examName]) setExamName("");
  }, [vendor, examData]);

  // ----------------- helpers -----------------
  const extractLetters = (s) => {
    if (!s) return [];
    const matches = String(s).toUpperCase().match(/[A-Z]/g);
    return matches ? [...new Set(matches)] : [];
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // parse "Choose two", "Choose 2", "choose three" from question text
  const parseRequiredSelections = (questionText) => {
    if (!questionText || typeof questionText !== "string") return 1;
    // match patterns like "Choose two", "Choose 2", possibly in parentheses
    const m = questionText.match(/choose\s*(?:the\s*)?(?:\(?\s*)?(\d+|one|two|three|four|five|six|seven|eight|nine)/i);
    if (!m) return 1;
    const token = m[1].toLowerCase();
    if (/^\d+$/.test(token)) return Math.max(1, parseInt(token, 10));
    const wordToNum = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
    };
    return wordToNum[token] || 1;
  };

  // determine correct letters from Vote_count or fallback Answer (parsing after colon)
  const getMostVotedLetters = (voteCountArr, fallbackAnswer) => {
    if (!Array.isArray(voteCountArr) || voteCountArr.length === 0) {
      if (typeof fallbackAnswer === "string" && fallbackAnswer.includes(":")) {
        const after = fallbackAnswer.split(":")[1] || fallbackAnswer;
        return extractLetters(after);
      }
      return extractLetters(fallbackAnswer);
    }

    const flagged = voteCountArr.filter((entry) => entry && entry.is_most_voted);
    if (flagged.length > 0) {
      const letters = flagged.flatMap((e) =>
        extractLetters(e.voted_answers ?? e.voted_answers_str ?? e.voted ?? "")
      );
      return [...new Set(letters)];
    }

    // aggregate if no flagged
    const perOption = {};
    voteCountArr.forEach((entry) => {
      if (!entry) return;
      const votedAnswers = entry.voted_answers ?? entry.voted_answer ?? entry.voted ?? entry.voted_answers_str ?? "";
      const count = Number(entry.vote_count ?? entry.count ?? entry.voteCount ?? 0) || 0;
      const letters = extractLetters(votedAnswers);
      letters.forEach((L) => {
        perOption[L] = (perOption[L] || 0) + count;
      });
    });

    const keys = Object.keys(perOption);
    if (keys.length === 0) {
      if (typeof fallbackAnswer === "string" && fallbackAnswer.includes(":")) {
        const after = fallbackAnswer.split(":")[1] || fallbackAnswer;
        return extractLetters(after);
      }
      return extractLetters(fallbackAnswer);
    }

    const max = Math.max(...keys.map((k) => perOption[k]));
    const top = keys.filter((k) => perOption[k] === max);
    return top;
  };

  // ----------------- fetch questions -----------------
  const fetchQuestions = () => {
    if (!vendor || !examName) return;

    fetch(`${API_EXAM_URL}?vendor=${encodeURIComponent(vendor)}&exam=${encodeURIComponent(examName)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Network response not ok");
        return r.json();
      })
      .then((data) => {
        if (!data || typeof data !== "object") {
          setQuestions([]);
          return;
        }

        let arr = Object.entries(data).map(([key, value]) => {
          const opts = value.Choices || {};
          const voteArr = Array.isArray(value.Vote_count) ? value.Vote_count : value.Vote_count ? [value.Vote_count] : [];
          const most = getMostVotedLetters(voteArr, value.Answer);
          const required = parseRequiredSelections(value.Question || "");
          return {
            id: String(key),
            Question: value.Question || "",
            Options: opts,
            RawAnswer: value.Answer || "",
            Vote_count: voteArr,
            CorrectAnswers: most.map((m) => String(m).toUpperCase()),
            RequiredSelections: required, // number required (1 for single-select by default)
          };
        });

        // shuffle questions only
        arr = shuffle(arr);

        // limit to requested number
        const limit = Math.min(numQuestions, arr.length);
        arr = arr.slice(0, limit);

        setQuestions(arr);
        setPage(0);
        setSelectedAnswers({});
        setRevealedAnswers({});
        setSubmitted(false);
        setSubmittedScore(null);
      })
      .catch((err) => {
        console.error("Error fetching exam questions:", err);
        setQuestions([]);
      });
  };

  // pagination
  const start = page * pageSize;
  const end = Math.min(start + pageSize, questions.length);
  const visibleQuestions = questions.slice(start, end);
  const nextPage = () => { if (end < questions.length) setPage((p)=>p+1); };
  const prevPage = () => { if (page>0) setPage((p)=>p-1); };

  // toggle selection for multi/single select:
  // selectedAnswers[qId] will always be an array of letters (or undefined)
  const toggleSelection = (qId, letter) => {
    if (submitted) return; // don't allow after submit
    const q = questions.find((x) => x.id === qId);
    const max = q?.RequiredSelections || 1;
    setSelectedAnswers((prev) => {
      const cur = Array.isArray(prev[qId]) ? [...prev[qId]] : [];
      const idx = cur.indexOf(letter);
      if (idx >= 0) {
        // already selected -> deselect
        cur.splice(idx, 1);
      } else {
        // add only if under max
        if (cur.length < max) cur.push(letter);
        else {
          // ignore if at max (could optionally show toast)
        }
      }
      return { ...prev, [qId]: cur };
    });
  };

  // count answered: consider a question answered only if selectedAnswers[q.id].length === RequiredSelections
  const answeredCount = questions.reduce((acc, q) => {
    const sel = selectedAnswers[q.id] || [];
    return acc + (Array.isArray(sel) && sel.length === (q.RequiredSelections || 1) ? 1 : 0);
  }, 0);
  const allAttempted = questions.length > 0 && answeredCount === questions.length;

  // submit exam: reveal and compute score (exact set match)
  const submitExam = () => {
    if (!allAttempted) {
      alert("Please answer all questions before submitting.");
      return;
    }
    const reveals = {};
    questions.forEach((q) => (reveals[q.id] = true));
    setRevealedAnswers(reveals);
    setSubmitted(true);

    const score = questions.reduce((acc, q) => {
      const sel = (selectedAnswers[q.id] || []).map((s) => String(s).toUpperCase()).sort();
      const corr = (q.CorrectAnswers || []).map((s) => String(s).toUpperCase()).sort();
      // consider correct only if arrays equal (same items, same count)
      const equal = sel.length === corr.length && sel.every((v, i) => v === corr[i]);
      return acc + (equal ? 1 : 0);
    }, 0);
    setSubmittedScore(score);
  };

  const startNew = () => fetchQuestions();

  // render
  return (
    <div className="assessment-container">
      <header className="assessment-header">
        <h1>Take Assessment</h1>

        <div className="assessment-controls">
          <div className="control">
            <label>Vendor</label>
            <select value={vendor} onChange={(e) => { setVendor(e.target.value); setExamName(""); }}>
              <option value="">Select Vendor</option>
              {vendorOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="control">
            <label>Exam</label>
            <select value={examName} onChange={(e) => setExamName(e.target.value)} disabled={!vendor}>
              <option value="">Select Exam</option>
              {examOptions.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>

          <div className="control">
            <label>Number</label>
            <select value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
          </div>

          <div className="control">
            <button onClick={fetchQuestions}>Start Assessment</button>
          </div>
        </div>
      </header>

      <main>
        <div className="meta">
          <div className="exam-title">{vendor && examName ? `${vendor} - ${examName}` : "Select vendor & exam"}</div>
          <div className="total">Total questions: {questions.length}</div>
        </div>

        {visibleQuestions.map((q, idx) => {
          const correctLetters = (q.CorrectAnswers || []).map((c) => String(c).toUpperCase());
          const isRevealed = !!revealedAnswers[q.id];
          const userSelectedArr = (selectedAnswers[q.id] || []).map((s) => String(s).toUpperCase());
          const required = q.RequiredSelections || 1;

          return (
            <div key={q.id} className="question-card">
              <h3>
                {start + idx + 1}. {q.Question}
                {required > 1 && (
                  <small style={{ marginLeft: 8, color: "#666", fontWeight: 500 }}> (Choose {required})</small>
                )}
              </h3>

              <ul className="options-list">
                {Object.entries(q.Options || {}).map(([optKey, optValue]) => {
                  const letter = String(optKey).trim().toUpperCase();
                  const isSelected = userSelectedArr.includes(letter);
                  const isCorrect = correctLetters.includes(letter);

                  const liClass = [
                    "option",
                    isSelected ? "selected" : "",
                    isRevealed && isCorrect ? "revealed-correct" : "",
                    isSelected && isRevealed && !isCorrect ? "selected-wrong" : "",
                  ].filter(Boolean).join(" ");

                  return (
                    <li
                      key={optKey}
                      className={liClass}
                      onClick={() => {
                        // toggle selection respecting required count
                        toggleSelection(q.id, letter);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") toggleSelection(q.id, letter);
                      }}
                    >
                      <div className="option-content">
                        <b>{letter}:</b> {optValue}
                        {isRevealed && isCorrect && <span className="badge">Correct</span>}
                      </div>

                      {/* selection feedback when revealed */}
                      {isSelected && isRevealed && (
                        <div className="selection-feedback">
                          {isCorrect ? <span className="correct-text">Correct</span> : <span className="incorrect-text">Incorrect</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* show how many selected / required */}
              <div style={{ marginTop: 8, color: "#555" }}>
                Selected: {(selectedAnswers[q.id] || []).length} / {required}
              </div>
            </div>
          );
        })}

        {questions.length > 0 && (
          <>
            <div className="pagination">
              <button onClick={prevPage} disabled={page === 0}>⬅ Prev</button>

              <span className="page-info">Questions {start + 1}–{end} of {questions.length}</span>

              <button onClick={nextPage} disabled={end >= questions.length}>Next ➡</button>
            </div>

            {!submitted ? (
              <div className="actions" style={{ alignItems: "center" }}>
                {!allAttempted && (
                  <div style={{ color: "#a12b2b", marginRight: 12 }}>
                    {questions.length - answeredCount} unanswered
                  </div>
                )}

                <button className="submit-btn" onClick={submitExam} disabled={!allAttempted}>
                  Submit Exam
                </button>
              </div>
            ) : (
              <div className="result-box">
                <h3>Score: {submittedScore}/{questions.length}</h3>
                <button onClick={startNew}>Start New Assessment</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
