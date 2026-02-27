import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

// Generate particle config once
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  size: Math.random() * 4 + 2,
  left: Math.random() * 100,
  delay: Math.random() * 15,
  duration: Math.random() * 10 + 12,
  opacity: Math.random() * 0.5 + 0.2,
}));

// Generate Matrix binary rain columns
const MATRIX_COLUMNS = Array.from({ length: 25 }, (_, i) => {
  const chars = Array.from({ length: 25 }, () =>
    Math.random() > 0.5 ? "1" : "0"
  ).join("\n");
  return {
    id: i,
    chars,
    left: (i / 25) * 100 + Math.random() * 2,
    delay: Math.random() * 8,
    duration: Math.random() * 8 + 6,
    opacity: Math.random() * 0.3 + 0.08,
    fontSize: Math.random() * 6 + 12,
  };
});

/* ---- Reset Confirmation Dialog ---- */
function ResetPage() {
  const [showDialog] = useState(true);
  const [status, setStatus] = useState(null); // null | "success" | "error"

  const handleReset = async () => {
    try {
      await axios.post("http://localhost:5000/reset");
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      setStatus("error");
    }
  };

  const handleCancel = () => {
    window.location.href = "/";
  };

  return (
    <div className="app-container">
      <div className="grid-overlay" />
      <div className="matrix-rain">
        {MATRIX_COLUMNS.map((col) => (
          <div
            key={col.id}
            className="matrix-column"
            style={{
              left: col.left + "%",
              animationDelay: col.delay + "s",
              animationDuration: col.duration + "s",
              opacity: col.opacity,
              fontSize: col.fontSize + "px",
            }}
          >
            {col.chars}
          </div>
        ))}
      </div>

      {showDialog && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-icon">⚠️</div>
            <h2 className="dialog-title">RESET TIMER</h2>
            <p className="dialog-message">
              Are you sure you want to restart the hackathon timer? This action
              cannot be undone.
            </p>
            {status === "success" ? (
              <div className="dialog-success">✓ Timer Reset Successfully</div>
            ) : status === "error" ? (
              <div className="dialog-error">✗ Failed to reset timer</div>
            ) : (
              <div className="dialog-actions">
                <button className="dialog-btn dialog-btn-cancel" onClick={handleCancel}>
                  CANCEL
                </button>
                <button className="dialog-btn dialog-btn-confirm" onClick={handleReset}>
                  RESET
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Main Timer App ---- */
function TimerPage() {
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("00");
  const [seconds, setSeconds] = useState("00");
  const [started, setStarted] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [preCountdown, setPreCountdown] = useState(null); // 5,4,3,2,1 or null
  const intervalRef = useRef(null);

  const startCountdown = useCallback((startTime, duration) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const tick = () => {
      const now = Date.now();
      const remaining = duration - (now - startTime);

      if (remaining <= 0) {
        setTimeUp(true);
        setHours("00");
        setMinutes("00");
        setSeconds("00");
        clearInterval(intervalRef.current);
        return;
      }

      const hrs = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);

      setHours(String(hrs).padStart(2, "0"));
      setMinutes(String(mins).padStart(2, "0"));
      setSeconds(String(secs).padStart(2, "0"));
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
  }, []);

  const fetchTimer = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/timer");
      if (res.data.running) {
        setStarted(true);
        setTimeUp(false);
        const start = new Date(res.data.startTime).getTime();
        startCountdown(start, res.data.duration);
      } else {
        setStarted(false);
        setTimeUp(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch (err) {
      console.error("Failed to fetch timer:", err);
    }
  }, [startCountdown]);

  useEffect(() => {
    fetchTimer();
    socket.on("timerStarted", fetchTimer);
    socket.on("timerReset", () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setStarted(false);
      setTimeUp(false);
      setHours("00");
      setMinutes("00");
      setSeconds("00");
    });
    return () => {
      socket.off("timerStarted", fetchTimer);
      socket.off("timerReset");
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTimer]);

  const startTimer = async () => {
    try {
      await axios.post("http://localhost:5000/start");
    } catch (err) {
      console.error("Failed to start timer:", err);
    }
  };

  const handleStartClick = () => {
    let count = 5;
    setPreCountdown(count);
    const id = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(id);
        setPreCountdown(null);
        startTimer();
      } else {
        setPreCountdown(count);
      }
    }, 1000);
  };

  return (
    <div className="app-container">
      {/* Background Effects */}
      <div className="grid-overlay" />
      <div className="matrix-rain">
        {MATRIX_COLUMNS.map((col) => (
          <div
            key={col.id}
            className="matrix-column"
            style={{
              left: col.left + "%",
              animationDelay: col.delay + "s",
              animationDuration: col.duration + "s",
              opacity: col.opacity,
              fontSize: col.fontSize + "px",
            }}
          >
            {col.chars}
          </div>
        ))}
      </div>
      <div className="particles-container">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size + "px",
              height: p.size + "px",
              left: p.left + "%",
              animationDelay: p.delay + "s",
              animationDuration: p.duration + "s",
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="content-wrapper">
        {/* Event Header */}
        <header className="event-header">
          <h1 className="event-title">INNOVERSE - 26</h1>
        </header>

        {/* Timer or Start Button */}
        {preCountdown !== null ? (
          <div className="pre-countdown">
            <span className="pre-countdown-number" key={preCountdown}>
              {preCountdown}
            </span>
          </div>
        ) : !started ? (
          <button
            id="start-hack-btn"
            className="start-button"
            onClick={handleStartClick}
          >
            START HACK
          </button>
        ) : timeUp ? (
          <div className="timer-card">
            <div className="time-up">TIME UP!</div>
          </div>
        ) : (
          <div className="timer-card">
            <div className="timer-label">Time Remaining</div>
            <div className="timer-display">
              <div className="time-segment">
                <span className="time-digits">{hours}</span>
                <span className="time-unit">Hours</span>
              </div>
              <span className="time-colon">:</span>
              <div className="time-segment">
                <span className="time-digits">{minutes}</span>
                <span className="time-unit">Minutes</span>
              </div>
              <span className="time-colon">:</span>
              <div className="time-segment">
                <span className="time-digits">{seconds}</span>
                <span className="time-unit">Seconds</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="event-footer">
          <hr className="footer-line" />
        </footer>
      </div>
    </div>
  );
}

/* ---- Simple URL Router ---- */
function App() {
  const path = window.location.pathname;

  if (path === "/reset") {
    return <ResetPage />;
  }

  return <TimerPage />;
}

export default App;