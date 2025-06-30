import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = "https://dizai-v09.onrender.com";

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [highlight, setHighlight] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef();
  const recordingTimeoutRef = useRef();

  // Ladda övningar
  useEffect(() => {
    axios.get(`${BACKEND_URL}/exercises`).then((res) => setExercises(res.data[profile]));
  }, [profile]);

  // Ladda referensljud
  useEffect(() => {
    if (exercises.length) {
      setAudioUrl(`${BACKEND_URL}/tts?text=${encodeURIComponent(exercises[exerciseIdx].text)}&type=pt-PT`);
    }
  }, [exercises, exerciseIdx]);

  // Starta inspelning
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
        const resp = await axios.post(`${BACKEND_URL}/analyze`, formData);
        setTranscript(resp.data.transcript);
        setFeedback(resp.data.feedback);
        setHighlight(resp.data.highlight || []);
      } catch (err) {
        setFeedback("Error during analysis.");
      }
      setRecording(false);
      // Frigör mikrofonen
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };

    mediaRecorderRef.current.start();

    // Auto-stop efter 3 sekunder
    recordingTimeoutRef.current = setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }, 3000);
  };

  // Stoppa inspelning manuellt
  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      clearTimeout(recordingTimeoutRef.current);
    }
  };

  if (!exercises.length) return <div>Loading...</div>;
  const ex = exercises[exerciseIdx];

  // Snygg highlight för feedback (färg beroende på feedback)
  let feedbackStyle = { color: "orange", fontWeight: 600 };
  if (feedback === "Perfect!") feedbackStyle = { color: "green", fontWeight: 600 };
  if (feedback.startsWith("Almost")) feedbackStyle = { color: "#e9a100", fontWeight: 600 };
  if (feedback.startsWith("Error")) feedbackStyle = { color: "red", fontWeight: 600 };

  // Highlight ord i transcript om highlight-array finns
  function renderTranscript() {
    if (!transcript) return null;
    const words = transcript.split(/\s+/);
    return (
      <span>
        {words.map((word, idx) => (
          <span
            key={idx}
            style={{
              background: highlight.includes(idx) ? "#fffd99" : "transparent",
              color: highlight.includes(idx) ? "#d45900" : "#1639b2",
              borderRadius: "4px",
              marginRight: 2,
              padding: highlight.includes(idx) ? "0 3px" : 0
            }}
          >
            {word + " "}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f9f6ea", minHeight: "100vh", padding: 24 }}>
      <h1 style={{ color: "#1639b2" }}>DizAí v0.9</h1>
      <button
        style={{
          marginBottom: 28,
          fontWeight: 700,
          fontSize: 22,
          background: "#233dc2",
          color: "white",
          border: "none",
          borderRadius: 24,
          padding: "10px 32px",
          cursor: "pointer"
        }}
        onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}
      >
        Switch to {profile === "Johan" ? "Petra" : "Johan"}
      </button>

      <div>
        <h2 style={{ fontSize: 32, color: "#1639b2" }}>{ex.text}</h2>
        <p style={{ fontSize: 22, color: "#233dc2", marginBottom: 0 }}>
          IPA: <span style={{ color: "#233dc2" }}>{ex.ipa}</span>
        </p>
        <audio controls src={audioUrl} style={{ width: "100%", margin: "16px 0", background: "#f4f8fc" }}></audio>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleRecord}
          disabled={recording}
          style={{
            fontWeight: 700,
            fontSize: 22,
            background: recording ? "#b5b5b5" : "#233dc2",
            color: "white",
            border: "none",
            borderRadius: 20,
            padding: "10px 32px",
            marginRight: 10,
            cursor: recording ? "not-allowed" : "pointer"
          }}
        >
          <span role="img" aria-label="mic">🎙️</span> Record
        </button>
        {recording && (
          <button
            onClick={handleStop}
            style={{
              fontWeight: 700,
              fontSize: 22,
              background: "#ff8800",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "10px 32px",
              cursor: "pointer"
            }}
          >
            ⏹️ Stop
          </button>
        )}
      </div>

      <div style={{ fontSize: 22, marginBottom: 8 }}>
        <span style={{ color: "#233dc2", fontWeight: 700 }}>Transcript:</span>{" "}
        {renderTranscript()}
      </div>
      {feedback && (
        <div style={feedbackStyle}>{feedback}</div>
      )}

      <div style={{ marginTop: 32 }}>
        <button
          disabled={exerciseIdx === 0}
          onClick={() => setExerciseIdx(exerciseIdx - 1)}
          style={{
            background: "#aab088",
            color: "#fff",
            fontSize: 24,
            border: "none",
            borderRadius: 18,
            padding: "6px 26px",
            marginRight: 18,
            opacity: exerciseIdx === 0 ? 0.5 : 1,
            fontWeight: 600
          }}
        >
          Prev
        </button>
        <button
          disabled={exerciseIdx === exercises.length - 1}
          onClick={() => setExerciseIdx(exerciseIdx + 1)}
          style={{
            background: "#233dc2",
            color: "#fff",
            fontSize: 24,
            border: "none",
            borderRadius: 18,
            padding: "6px 26px",
            opacity: exerciseIdx === exercises.length - 1 ? 0.5 : 1,
            fontWeight: 600
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
