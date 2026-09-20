import { useState, useEffect } from 'react';
import { getUserReports } from './firebase';

const styles = `
  .history-container {
    background: #13131a;
    border: 1px solid #1e1e2e;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .history-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: #e2e2e8;
  }

  .history-close {
    background: #1e1e2e;
    border: 1px solid #2a2a3e;
    border-radius: 8px;
    color: #9b9baf;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
  }

  .history-item {
    background: #0d0d0f;
    border: 1px solid #1e1e2e;
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .history-item:hover {
    border-color: #6366f1;
    background: rgba(99,102,241,0.05);
  }

  .history-item-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .history-date {
    font-size: 12px;
    color: #a78bfa;
    font-weight: 600;
  }

  .history-lang {
    font-size: 11px;
    color: #6b6b80;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .history-files {
    font-size: 13px;
    color: #c9d1d9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .history-empty {
    text-align: center;
    padding: 40px;
    color: #6b6b80;
    font-size: 14px;
  }
`;

export default function HistoryPanel({ user, onLoadReport, onClose }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getUserReports(user.uid);
        setReports(data);
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user]);

  return (
    <div className="history-container">
      <style>{styles}</style>
      <div className="history-header">
        <h2>Your Analysis History</h2>
        <button className="history-close" onClick={onClose}>Close</button>
      </div>

      {loading ? (
        <div className="history-empty">Loading history...</div>
      ) : reports.length === 0 ? (
        <div className="history-empty">No past analyses found. Start analysing code!</div>
      ) : (
        <div className="history-list">
          {reports.map((report) => {
            const date = new Date(report.timestamp).toLocaleString();
            return (
              <div 
                key={report.id} 
                className="history-item"
                onClick={() => onLoadReport(report)}
              >
                <div className="history-item-top">
                  <span className="history-date">{date}</span>
                  <span className="history-lang">{report.language_detected}</span>
                </div>
                <div className="history-files">
                  {report.files_analyzed?.join(", ") || "Snippet"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
