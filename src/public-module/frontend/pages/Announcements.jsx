import { useState, useEffect } from "react";
import { formatDate } from "../utils/format";
import "./Announcements.css";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [eventFilter, setEventFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    // Using a microtask so the loading/error resets arent a synchronous setState call in the effect body itself.
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (eventFilter) params.set("event_id", eventFilter);
      if (search) params.set("search", search);

      fetch(`/api/public/announcements?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch announcements");
          return res.json();
        })
        .then(setAnnouncements)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, [eventFilter, search]);

  useEffect(() => {
    fetch("/api/public/events")
      .then((res) => (res.ok ? res.json() : []))
      .then(setEvents)
      .catch(() => {});
  }, []);

  return (
    <div className="announcements-page">
      <div className="page-header">
        <h1>Emergency Announcements</h1>
      </div>

      <div className="content-card">
        <div className="card-toolbar">
          <select
            className="event-select"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">All events</option>
            {events.map((evt) => (
              <option key={evt.event_id} value={evt.event_id}>
                {evt.name}
              </option>
            ))}
          </select>

          <div className="search-wrapper">
            <svg
              className="search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading announcements...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : announcements.length === 0 ? (
          <div className="state-message">No announcements found.</div>
        ) : (
          <div className="announcement-list">
            {announcements.map((a) => (
              <div key={a.announcement_id} className="announcement-item">
                <div className="announcement-item-header">
                  <span className="announcement-title">{a.title}</span>
                  <span className="announcement-date">
                    {formatDate(a.created_at)}
                  </span>
                </div>
                <p className="announcement-message">{a.message}</p>
                {a.event && <span className="event-tag">{a.event.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
