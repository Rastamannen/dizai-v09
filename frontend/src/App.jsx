import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./index.css"; // Stilar från tidigare
import { ReactComponent as Logo } from "./assets/DizAi_FullLogo.svg";

const FEEDBACK_COLORS = {
  perfect: "#197d1d",
  almost: "#D49F1B",
  tryagain: "#D1495B"
};

function getFeedbackColor(feedback) {
  if (!feedback) return "#222";
  if (feedback.toLowerCase().includes("perfect")) return FEEDBACK_COLORS.perfect;
  if (feedback.toLowerCase().includes("almost")) return FEEDBACK_COLORS.almost;
  return FEEDBACK_COLORS.tryagain;
}

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const mediaRecorderRef = useRef();

  // Hämta övningar för rätt profil
  useEffect(() => {
    axios.get("/exercises").then((res) => setExercises(res.data[profile]));
  }, [profile]);

  // Hämta TTS-url för aktuell övning
  useEffect(() => {
    if (exercises.length)
      setAudioUrl(`/tts?text=${encodeURIComponent(exercises[exerciseIdx].text)}&type=pt-PT`);
  }, [exercises, exerciseIdx]);

  // Stoppa och släpp mikrofonen
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  };

  // Starta inspelning
  const handleRecord = async () => {
    setFeedback("");
    setTranscript("");
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMediaStream(stream);
    mediaRecorderRef.current = new window.MediaRecorder(stream);
    let chunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      formData.append("profile", profile);
      formData.append("exerciseId", exerciseIdx);
      try {
        const resp = await axios.post("/analyze", formData);
        setTranscript(resp.data.transcript);
        setFeedback(resp.data.feedback);
      } catch {
        setFeedback("Error during analysis.");
      }
      setRecording(false);
      // Släpp mikrofonen
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }
    };
    mediaRecorderRef.current.start();
  };

  if (!exercises.length) return <div className="loading">Loading...</div>;
  const ex = exercises[exerciseIdx];

  // Helper för att highlighta felaktiga ord
  function renderTranscript() {
    if (!transcript) return null;
    if (!ex.highlight || !Array.isArray(ex.highlight) || ex.highlight.length === 0) {
      return <span>{transcript}</span>;
    }
    const userWords = transcript.split(/\s+/);
    return userWords.map((word, i) => {
      const isWrong = ex.highlight.includes(i);
      return (
        <span
          key={i}
          style={{
            background: isWrong ? "#ffe0e0" : undefined,
            color: isWrong ? "#D1495B" : undefined,
            borderRadius: "4px",
            padding: isWrong ? "0 2px" : 0,
            fontWeight: isWrong ? "bold" : undefined
          }}
        >
          {word + " "}
        </span>
      );
    });
  }

  return (
    <div className="app-root" style={{ background: "#F7F3E9", minHeight: "100vh", fontFamily: "'Nunito Sans', Poppins, Quicksand, Rubik, sans-serif" }}>
      {/* Logo i toppen */}
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 0 0 16px" }}>
        <Logo height={48} />
        <span style={{ fontSize: "2.2rem", color: "#0033A0", fontWeight: 800 }}>DizAí v0.9</span>
      </header>
      <main style={{ maxWidth: 540, margin: "0 auto", background: "#F7F3E9", borderRadius: 12, padding: 24 }}>
        <button
          style={{
            background: "#0033A0",
            color: "#fff",
            border: "none",
            borderRadius: 18,
            padding: "12px 26px",
            fontWeight: 700,
            fontSize: 20,
            marginBottom: 22,
            marginTop: 8,
            cursor: "pointer"
          }}
          onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}
        >
          Switch to {profile === "Johan" ? "Petra" : "Johan"}
        </button>

        <h2 style={{ fontSize: "2rem", color: "#0033A0", marginTop: 24, marginBottom: 10 }}>{ex.text}</h2>
        <div style={{ fontSize: "1.15rem", color: "#0033A0", marginBottom: 6 }}>
          <span style={{ fontWeight: 700 }}>IPA:</span> <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{ex.ipa}</span>
        </div>
        <div style={{ fontSize: "1.1rem", color: "#0033A0", marginBottom: 24 }}>
          <span style={{ fontWeight: 700 }}>Respelling:</span> <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>{ex.respelling || "-"}</span>
        </div>

        <div style={{ background: "#f3f6fa", borderRadius: 32, padding: 16, marginBottom: 18 }}>
          <audio controls src={audioUrl} style={{ width: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            style={{
              background: "#0033A0",
              color: "#fff",
              border: "none",
              borderRadius: 20,
              fontWeight: 700,
              fontSize: 22,
              padding: "10px 28px",
              marginBottom: 10,
              cursor: recording ? "not-allowed" : "pointer"
            }}
            onClick={handleRecord}
            disabled={recording}
          >
            <span role="img" aria-label="mic">🎙️</span> {recording ? "Recording..." : "Record"}
          </button>
          {recording && (
            <button
              onClick={stopRecording}
              style={{
                background: "#D1495B",
                color: "#fff",
                border: "none",
                borderRadius: 18,
                fontWeight: 600,
                fontSize: 18,
                padding: "10px 18px",
                cursor: "pointer"
              }}>
              Stop
            </button>
          )}
        </div>

        <div style={{ fontSize: "1.2rem", color: "#0033A0", fontWeight: 700, margin: "18px 0 2px 0" }}>Transcript:</div>
        <div style={{ fontSize: "1.2rem", marginBottom: 10 }}>{renderTranscript()}</div>

        {feedback && (
          <div
            style={{
              fontWeight: 700,
              color: getFeedbackColor(feedback),
              fontSize: "1.25rem",
              margin: "8px 0 12px 0"
            }}
          >
            {feedback}
          </div>
        )}

        <div style={{ display: "flex", gap: 14 }}>
          <button
            style={{
              background: "#8E9775",
              color: "#fff",
              border: "none",
              borderRadius: 18,
              padding: "10px 22px",
              fontWeight: 700,
              fontSize: 20,
              marginTop: 12,
              cursor: exerciseIdx === 0 ? "not-allowed" : "pointer"
            }}
            disabled={exerciseIdx === 0}
            onClick={() => setExerciseIdx(exerciseIdx - 1)}
          >
            Prev
          </button>
          <button
            style={{
              background: "#0033A0",
              color: "#fff",
              border: "none",
              borderRadius: 18,
              padding: "10px 22px",
              fontWeight: 700,
              fontSize: 20,
              marginTop: 12,
              cursor: exerciseIdx === exercises.length - 1 ? "not-allowed" : "pointer"
            }}
            disabled={exerciseIdx === exercises.length - 1}
            onClick={() => setExerciseIdx(exerciseIdx + 1)}
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
