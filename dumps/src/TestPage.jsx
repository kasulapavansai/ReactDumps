import React, { useEffect, useState } from "react";
import "./TestPage.css";

export default function TestPage() {
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(0);
  const [aiResponses, setAiResponses] = useState({});
  const [loadingAI, setLoadingAI] = useState({});
  const [revealedAnswers, setRevealedAnswers] = useState({}); // map qId -> true/false
  const [selectedAnswers, setSelectedAnswers] = useState({}); // map qId -> letter selected by user
  const pageSize = 3;

  useEffect(() => {
    fetch(
      "http://localhost:5000/api/exam?folder=AWS&exam=AWS Certified AI Practitioner AIF-C01"
    )
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === "object") {
          const arr = Object.entries(data).map(([key, value]) => ({
            id: key,
            Question: value.Question || "",
            Options: value.Choices || {},
            Answer: value.Answer || "",
            Explanation: value.Explanation || "",
            Vote_count: value.Vote_count || [],
            discussion_count: value.discussion_count || value.DiscussionCount || 0,
          }));

          // SORT BY KEY (id) numerically when possible
          arr.sort((a, b) => {
            const na = parseInt(a.id, 10);
            const nb = parseInt(b.id, 10);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: "base" });
          });

          setQuestions(arr);
        }
      })
      .catch((err) => console.error("Error fetching exam:", err));
  }, []);

  const start = page * pageSize;
  const end = Math.min(start + pageSize, questions.length);
  const visibleQuestions = questions.slice(start, end);

  const nextPage = () => {
    if (end < questions.length) setPage(page + 1);
  };

  const prevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const generateAI = async (q) => {
    const qId = q.id;
    setLoadingAI((prev) => ({ ...prev, [qId]: true }));

    try {
      const res = await fetch("http://localhost:5000/api/generate_ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Question: q.Question,
          Options: q.Options,
          Answer: q.Answer,
          Explanation: q.Explanation,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setAiResponses((prev) => ({ ...prev, [qId]: data.response }));
      } else {
        setAiResponses((prev) => ({ ...prev, [qId]: "Error generating AI response" }));
      }
    } catch (err) {
      console.error(err);
      setAiResponses((prev) => ({ ...prev, [qId]: "Error generating AI response" }));
    } finally {
      setLoadingAI((prev) => ({ ...prev, [qId]: false }));
    }
  };

  // toggle reveal/hide
  const toggleReveal = (qId) => {
    setRevealedAnswers((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // when user clicks an option: record selection and reveal answer
  const handleOptionClick = (qId, letter) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: letter }));
    setRevealedAnswers((prev) => ({ ...prev, [qId]: true }));
  };

  // helper to extract letters like "AD", "A,D", "ABD" -> ['A','D',...]
  const extractLetters = (s) => {
    if (!s) return [];
    const matches = s.toString().toUpperCase().match(/[A-Z]/g);
    return matches ? [...new Set(matches)] : [];
  };

  // aggregated per-option vote counts
  const computeVotesForQuestion = (q) => {
    const perOptionVotes = {};
    Object.keys(q.Options || {}).forEach((k) => {
      perOptionVotes[String(k).trim().toUpperCase()] = 0;
    });

    if (Array.isArray(q.Vote_count)) {
      q.Vote_count.forEach((entry) => {
        const letters = extractLetters(entry.voted_answers);
        const count = Number(entry.vote_count) || 0;
        letters.forEach((L) => {
          if (!perOptionVotes.hasOwnProperty(L)) perOptionVotes[L] = 0;
          perOptionVotes[L] += count;
        });
      });
    }

    const totalVotes = Object.values(perOptionVotes).reduce((s, v) => s + v, 0);
    return { perOptionVotes, totalVotes };
  };

  // combo-level grouping for stacked community distribution
  const computeComboVotes = (q) => {
    const comboMap = {};
    if (Array.isArray(q.Vote_count)) {
      q.Vote_count.forEach((entry) => {
        const letters = extractLetters(entry.voted_answers).sort();
        if (letters.length === 0) return;
        const key = letters.join("") || "";
        comboMap[key] = (comboMap[key] || 0) + (Number(entry.vote_count) || 0);
      });
    }
    const total = Object.values(comboMap).reduce((s, v) => s + v, 0);
    const combos = Object.entries(comboMap)
      .map(([k, v]) => ({ combo: k, count: v, percent: total > 0 ? Math.round((v / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
    return { combos, total };
  };

  // small palette for stacked segments
  const palette = ["#2d9cdb", "#27ae60", "#f39c12", "#8e44ad", "#e74c3c", "#16a085"];

  return (
    <div className="test-page">
      <h2>AWS SAACO2 Exam - Test Mode</h2>
      <p className="total-questions">Total Questions: {questions.length}</p>

      {visibleQuestions.map((q, idx) => {
        const isRevealed = !!revealedAnswers[q.id];

        // most-voted letters (from Vote_count entries where is_most_voted true) if any
        const mostVotedEntries =
          Array.isArray(q.Vote_count) && q.Vote_count.length
            ? q.Vote_count.filter((v) => !!v.is_most_voted)
            : [];
        const mostVotedSet = new Set(mostVotedEntries.flatMap((e) => extractLetters(e.voted_answers)));

        // letters to highlight when revealed
        const revealedLettersSet = isRevealed
          ? (mostVotedSet.size > 0 ? mostVotedSet : new Set(extractLetters(q.Answer)))
          : new Set();

        const { perOptionVotes, totalVotes } = computeVotesForQuestion(q);
        const { combos, total: comboTotal } = computeComboVotes(q);

        return (
          <div key={q.id} className="question-card">
            <h3>
              {start + idx + 1}. {q.Question}
            </h3>

            <ul className="options-list">
              {Object.entries(q.Options).map(([optKey, optValue]) => {
                const letter = String(optKey).trim().toUpperCase();
                const isRevealedOption = revealedLettersSet.has(letter);
                const showMostVoted = isRevealed && mostVotedSet.has(letter);

                const userSelected = selectedAnswers[q.id];
                const isSelected = userSelected === letter;
                // selected + revealed correct -> selected-correct
                // selected + revealed wrong -> selected-wrong
                const liClass = [
                  "option",
                  isRevealedOption ? "revealed" : "",
                  showMostVoted ? "most-voted" : "",
                  isSelected && isRevealedOption ? "selected-correct" : "",
                  isSelected && !isRevealedOption ? "selected-wrong" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <li
                    key={optKey}
                    className={liClass}
                    onClick={() => handleOptionClick(q.id, letter)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleOptionClick(q.id, letter);
                    }}
                  >
                    <div className="option-content">
                      <b>{letter}:</b> {optValue}
                      {showMostVoted && <span className="badge">Most Voted</span>}
                    </div>

                    {/* feedback for user's selection */}
                    {isSelected && isRevealed && (
                      <div className="selection-feedback">
                        {isRevealedOption ? <span className="correct-text">Correct</span> : <span className="incorrect-text">Incorrect</span>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* community distribution: below options, above reveal button.
                Only displayed after reveal (isRevealed === true). */}
            {isRevealed && (
              <div className="community-section">
                <div className="comm-label">Community vote distribution</div>
                <div className="stacked-bar-wrap">
                  <div className="stacked-bar">
                    {combos.length === 0 ? (
                      <div className="stacked-empty">No votes</div>
                    ) : (
                      combos.map((c, i) => {
                        const bg = palette[i % palette.length];
                        return (
                          <div
                            key={c.combo}
                            className="stacked-seg"
                            style={{
                              width: `${c.percent}%`,
                              background: bg,
                            }}
                            title={`${c.combo} (${c.percent}%) - ${c.count} votes`}
                          >
                            {c.percent >= 8 ? <span className="seg-label">{`${c.combo} (${c.percent}%)`}</span> : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="stacked-legend">
                    {combos.map((c, i) => (
                      <div className="legend-item" key={c.combo}>
                        <span className="legend-swatch" style={{ background: palette[i % palette.length] }} />
                        <span className="legend-text">{`${c.combo} (${c.percent}%)`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* action buttons (Reveal/Hide + Generate AI) */}
            <div className="question-actions">
              <button onClick={() => toggleReveal(q.id)}>
                {isRevealed ? "Hide Solution" : "Reveal Answer"}
              </button>

              <button onClick={() => generateAI(q)} disabled={loadingAI[q.id]}>
                {loadingAI[q.id] ? "Generating..." : "Generate with AI"}
              </button>
            </div>

            {/* solution box (shows correct answer + explanation) - shown when revealed */}
            {isRevealed && (
              <div className="solution-box">
                <div className="solution-top">
                  <div className="correct-answer">
                    <strong>Correct Answer:</strong>{" "}
                    <span className="correct-letters">
                      {mostVotedSet.size > 0 ? Array.from(mostVotedSet).join("") : extractLetters(q.Answer).join("")}
                    </span>
                  </div>
                </div>

                {q.Explanation && (
                  <div className="explanation">
                    <strong>Explanation:</strong>
                    <div>{q.Explanation}</div>
                  </div>
                )}
              </div>
            )}

            {aiResponses[q.id] && (
              <div className="ai-response">
                <b>AI Response:</b>
                <p>{aiResponses[q.id]}</p>
              </div>
            )}
          </div>
        );
      })}

      <div className="pagination">
        <button onClick={prevPage} disabled={page === 0}>
          ⬅ Prev
        </button>
        <span className="page-info">
          Questions {start + 1}–{end} of {questions.length}
        </span>
        <button onClick={nextPage} disabled={end >= questions.length}>
          Next ➡
        </button>
      </div>
    </div>
  );
}
