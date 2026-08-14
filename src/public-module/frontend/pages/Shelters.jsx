import { useState, useEffect, useMemo } from "react";
import "./Shelters.css";

const STATUS_OPTIONS = ["All status", "Open", "Closed"];

export default function Shelters() {
  const [shelters, setShelters] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("All status");
  const [areaFilter, setAreaFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "All status")
        params.set("status", statusFilter.toUpperCase());
      if (areaFilter) params.set("area_id", areaFilter);
      if (search) params.set("search", search);

      fetch(`/api/public/shelters?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch shelters");
          return res.json();
        })
        .then(setShelters)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, [statusFilter, areaFilter, search]);

  useEffect(() => {
    fetch("/api/public/shelters")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        const areas = new Map();
        rows.forEach((s) => areas.set(s.area.area_id, s.area));
        setAreaOptions(
          [...areas.values()].sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="shelters-page">
      <div className="page-header">
        <h1>Shelters</h1>
      </div>

      <div className="content-card">
        <div className="filters">
          <div className="filter-group">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`filter-chip${statusFilter === opt ? " active" : ""}`}
                onClick={() => setStatusFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="card-toolbar">
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
                placeholder="Search shelters..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <select
              className="area-select"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="">All areas</option>
              {areaOptions.map((area) => (
                <option key={area.area_id} value={area.area_id}>
                  {area.name}, {area.state}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="state-message">Loading shelters...</div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : shelters.length === 0 ? (
          <div className="state-message">No shelters found.</div>
        ) : (
          <div className="shelter-grid">
            {shelters.map((s) => (
              <ShelterCard key={s.shelter_id} shelter={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShelterCard({ shelter }) {
  const occupancyPct = useMemo(
    () =>
      shelter.capacity > 0
        ? Math.round((shelter.current_occupancy / shelter.capacity) * 100)
        : 0,
    [shelter],
  );

  return (
    <div className="shelter-card">
      <div className="shelter-card-header">
        <span className="shelter-name">{shelter.name}</span>
        <span className={`status-badge ${shelter.status.toLowerCase()}`}>
          {shelter.status.charAt(0) + shelter.status.slice(1).toLowerCase()}
        </span>
      </div>
      <div className="shelter-address">{shelter.address}</div>
      <div className="shelter-area">
        {shelter.area.name}, {shelter.area.state}
      </div>
      <div className="shelter-occupancy">
        <div className="occupancy-bar">
          <div
            className="occupancy-fill"
            style={{ width: `${Math.min(occupancyPct, 100)}%` }}
          />
        </div>
        <span className="occupancy-text">
          {shelter.current_occupancy}/{shelter.capacity}
        </span>
      </div>
      {shelter.contact_number && (
        <div className="shelter-contact">
          <PhoneIcon />
          <span>{shelter.contact_number}</span>
        </div>
      )}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
