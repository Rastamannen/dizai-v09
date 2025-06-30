import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = "https://dizai-v09.onrender.com";

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

  useEffect(() => {
    axios.get(`${BACKEND_URL}/exercises`)
      .then((res) => setExercises(res.data[profile] || []))
      .catch((err) => {
        setExercises([]);
        setFeedback("Error loading exercises.");
      });
  }, [profile]);

  useEffect(() => {
    if (exercises.length)
      setAudioUrl(`${BACKEND_URL}/tts?text=${encodeURIComponent(exercises[exerciseIdx].text)}&type=pt-PT`);
  }, [exercises, exerciseIdx]);

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
    };
    mediaRecorderRef.current.start();
    setTimeout(() => {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }, 3000);
  };

  if (!exercises.length) return <div style={{ fontSize: "2rem", color: "#1d33ad", margin: "2rem" }}>Loading...</div>;
  const ex = exercises[exerciseIdx];

  // Highlighting words in transcript
  let transcriptDisplay = transcript;
  if (transcript && highlight.length) {
    const words = transcript.split(/\s+/);
    transcriptDisplay = words.map((word, i) =>
      highlight.includes(i) ?
        <span key={i} style={{ background: "#ffcccb", fontWeight: "bold" }}>{word + " "}</span>
        : word + " "
    );
  }

  // Feedback color logic
  let feedbackColor = "#1d33ad";
  if (feedback.startsWith("Perfect")) feedbackColor = "green";
  else if (feedback.startsWith("Almost")) feedbackColor = "#eab308"; // orange/gold
  else if (feedback) feedbackColor = "orange";

  return (
    <div style={{ background: "#faf6ea", minHeight: "100vh", fontFamily: "system-ui" }}>
      <h1 style={{ color: "#1d33ad", fontSize: "2.5rem", margin: "1rem 0 0 1rem" }}>DizAí v0.9</h1>
      <button
        style={{
          margin: "1rem",
          background: "#263bd6",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1.5rem",
          border: "none",
          borderRadius: "1.2rem",
          padding: "0.7rem 2.2rem",
          cursor: "pointer",
        }}
        onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}
      >
        Switch to {profile === "Johan" ? "Petra" : "Johan"}
      </button>
      <div style={{ margin: "2rem 1rem 0 1rem" }}>
        <h2 style={{ fontSize: "2.2rem", color: "#1d33ad" }}>{ex.text}</h2>
        <div style={{ fontSize: "1.4rem", color: "#1d33ad", margin: "0.7rem 0" }}>
          IPA: <span style={{ fontFamily: "monospace" }}>{ex.ipa}</span>
        </div>
        <audio controls src={audioUrl} style={{ width: "100%", background: "#f3f7fb", borderRadius: 18, margin: "0.6rem 0" }} />
      </div>
      <button
        onClick={handleRecord}
        disabled={recording}
        style={{
          margin: "1.5rem 1rem 0 1rem",
          background: "#2537a6",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1.5rem",
          border: "none",
          borderRadius: "1rem",
          padding: "0.7rem 2.2rem",
          cursor: recording ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
        }}
      >
        <span role="img" aria-label="mic">🎙️</span>
        {recording ? "Recording..." : "Record"}
      </button>
      <div style={{ margin: "2rem 1rem 0 1rem", fontSize: "1.35rem", color: "#1d33ad" }}>
        <strong>Transcript:</strong> {transcriptDisplay}
      </div>
      {feedback &&
        <div style={{
          margin: "1.2rem 1rem 0 1rem",
          fontWeight: "bold",
          fontSize: "1.6rem",
          color: feedbackColor
        }}>{feedback}</div>
      }
      <div style={{ margin: "2.5rem 1rem" }}>
        <button
          disabled={exerciseIdx === 0}
          onClick={() => setExerciseIdx(exerciseIdx - 1)}
          style={{
            marginRight: "1.2rem",
            background: "#a8ac8b",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.5rem",
            border: "none",
            borderRadius: "1.2rem",
            padding: "0.7rem 2.2rem",
            opacity: exerciseIdx === 0 ? 0.5 : 1,
            cursor: exerciseIdx === 0 ? "not-allowed" : "pointer"
          }}
        >Prev</button>
        <button
          disabled={exerciseIdx === exercises.length - 1}
          onClick={() => setExerciseIdx(exerciseIdx + 1)}
          style={{
            background: "#1d33ad",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.5rem",
            border: "none",
            borderRadius: "1.2rem",
            padding: "0.7rem 2.2rem",
            opacity: exerciseIdx === exercises.length - 1 ? 0.5 : 1,
            cursor: exerciseIdx === exercises.length - 1 ? "not-allowed" : "pointer"
          }}
        >Next</button>
      </div>
    </div>
  );
}
