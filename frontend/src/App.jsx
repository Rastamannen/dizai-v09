import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [highlight, setHighlight] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef();

  // Hämta övningar från backend när profil ändras
  useEffect(() => {
    axios.get("/exercises").then((res) => setExercises(res.data[profile]));
  }, [profile]);

  // Sätt rätt TTS-URL när övning ändras
  useEffect(() => {
    if (exercises.length)
      setAudioUrl(`/tts?text=${encodeURIComponent(exercises[exerciseIdx].text)}&type=pt-PT`);
  }, [exercises, exerciseIdx]);

  // Highlight rendering
  function renderHighlightedTranscript(transcript, highlight) {
    if (!transcript) return null;
    const words = transcript.split(/\s+/);
    return words.map((word, idx) =>
      highlight && highlight.includes(idx) ? (
        <span key={idx} style={{
          background: "#ffe066",
          color: "#d35400",
          fontWeight: "bold",
          borderRadius: "0.3em",
          padding: "0 0.2em",
          margin: "0 0.1em"
        }}>
          {word + " "}
        </span>
      ) : (
        <span key={idx}>{word + " "}</span>
      )
    );
  }

  // Spela in och skicka ljud till backend
  const handleRecord = async () => {
    setRecording(true);
    setFeedback("");
    setTranscript("");
    setHighlight([]);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        setHighlight(resp.data.highlight || []);
      } catch (e) {
        setFeedback("Error during analysis.");
        setHighlight([]);
      }
      setRecording(false);
    };

    mediaRecorderRef.current.start();
    setTimeout(() => {
      mediaRecorderRef.current && mediaRecorderRef.current.state === "recording" && mediaRecorderRef.current.stop();
    }, 3000);
  };

  if (!exercises.length) return <div>Loading...</div>;
  const ex = exercises[exerciseIdx];

  // Feedback-färg beroende på resultat
  function feedbackColor() {
    if (feedback.startsWith("Perfect!")) return "green";
    if (feedback.startsWith("Almost!")) return "#e1a500";
    if (feedback) return "orange";
    return undefined;
  }

  return (
    <div style={{ background: "#faf6ea", minHeight: "100vh", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ color: "#2036b3" }}>DizAí v0.9</h1>
      <button
        style={{
          background: "#2036b3",
          color: "white",
          borderRadius: 20,
          fontWeight: "bold",
          padding: "12px 24px",
          fontSize: 22,
          border: "none",
          marginBottom: 20,
          cursor: "pointer"
        }}
        onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}
      >
        Switch to {profile === "Johan" ? "Petra" : "Johan"}
      </button>
      <div style={{ margin: "32px 0 16px 0" }}>
        <h2 style={{ color: "#2036b3", fontSize: "2.2rem" }}>{ex.text}</h2>
        <div style={{ color: "#2036b3", fontWeight: 400, fontSize: 24, margin: "8px 0 0 0" }}>
          IPA: {ex.ipa}
        </div>
      </div>
      <audio
        controls
        src={audioUrl}
        style={{
          display: "block",
          width: "100%",
          background: "#f5f8fb",
          borderRadius: 40,
          margin: "28px 0 12px 0"
        }}
      ></audio>
      <button
        style={{
          background: "#2036b3",
          color: "white",
          borderRadius: 20,
          fontWeight: "bold",
          fontSize: 26,
          padding: "8px 32px",
          border: "none",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: recording ? "not-allowed" : "pointer",
          opacity: recording ? 0.7 : 1
        }}
        onClick={handleRecord}
        disabled={recording}
      >
        <span role="img" aria-label="mic">🎙️</span>
        {recording ? "Recording..." : "Record"}
      </button>
      <div style={{ margin: "20px 0 0 0", fontSize: 26, fontWeight: "bold", color: "#2036b3" }}>
        Transcript:{" "}
        <span style={{ fontWeight: 400 }}>
          {renderHighlightedTranscript(transcript, highlight)}
        </span>
      </div>
      {feedback && (
        <div style={{
          margin: "18px 0 0 0",
          fontWeight: "bold",
          fontSize: 26,
          color: feedbackColor()
        }}>
          {feedback}
        </div>
      )}
      <div style={{ marginTop: 32, display: "flex", gap: 18 }}>
        <button
          disabled={exerciseIdx === 0}
          style={{
            background: "#9ea587",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 26,
            borderRadius: 20,
            padding: "8px 24px",
            border: "none",
            opacity: exerciseIdx === 0 ? 0.6 : 1,
            cursor: exerciseIdx === 0 ? "not-allowed" : "pointer"
          }}
          onClick={() => setExerciseIdx(exerciseIdx - 1)}
        >Prev</button>
        <button
          disabled={exerciseIdx === exercises.length - 1}
          style={{
            background: "#2036b3",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 26,
            borderRadius: 20,
            padding: "8px 24px",
            border: "none",
            opacity: exerciseIdx === exercises.length - 1 ? 0.6 : 1,
            cursor: exerciseIdx === exercises.length - 1 ? "not-allowed" : "pointer"
          }}
          onClick={() => setExerciseIdx(exerciseIdx + 1)}
        >Next</button>
      </div>
    </div>
  );
}
