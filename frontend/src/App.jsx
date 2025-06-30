import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

// Dynamisk backend-URL för lokal/prod
const BACKEND_URL =
  process.env.NODE_ENV === "production"
    ? "https://dizai-v09.onrender.com"
    : "http://localhost:3001";

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef();

  // Hämta övningar
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/exercises`)
      .then((res) => setExercises(res.data[profile]))
      .catch((err) => setFeedback("Could not load exercises!"));
  }, [profile]);

  // Sätt audio-URL
  useEffect(() => {
    if (exercises.length)
      setAudioUrl(
        `${BACKEND_URL}/tts?text=${encodeURIComponent(
          exercises[exerciseIdx].text
        )}&type=pt-PT`
      );
  }, [exercises, exerciseIdx]);

  // Starta och stoppa inspelning
  const handleRecord = async () => {
    if (recording) {
      // Stoppa
      mediaRecorderRef.current.stop();
      return;
    }
    setRecording(true);
    setTranscript("");
    setFeedback("");
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
        const resp = await axios.post(
          `${BACKEND_URL}/analyze`,
          formData
        );
        setTranscript(resp.data.transcript);
        setFeedback(resp.data.feedback);
      } catch (err) {
        setFeedback("Error during analysis.");
      }
      setRecording(false);
    };
    mediaRecorderRef.current.start();
    // Stoppas automatiskt efter 3 sek om inte stoppas manuellt
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive")
        mediaRecorderRef.current.stop();
    }, 3000);
  };

  if (!exercises.length) return <div>Loading...</div>;
  const ex = exercises[exerciseIdx];

  // Feedback-färger
  let feedbackColor = "orange";
  if (feedback === "Perfect!") feedbackColor = "green";
  else if (feedback.startsWith("Almost")) feedbackColor = "goldenrod";
  else if (feedback.startsWith("Try again")) feedbackColor = "orange";
  else if (feedback === "Error during analysis.") feedbackColor = "red";

  return (
    <div>
      <h2>DizAí v0.9</h2>
      <button onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}>
        Switch to {profile === "Johan" ? "Petra" : "Johan"}
      </button>
      <div>
        <h3>{ex.text}</h3>
        <p>IPA: {ex.ipa}</p>
        <audio controls src={audioUrl}></audio>
      </div>
      <button
        onClick={handleRecord}
        disabled={recording && !mediaRecorderRef.current}
        style={{
          background: recording ? "#B3B684" : "#1C2AAF",
          color: "white",
          fontWeight: "bold",
          padding: "0.5em 1.5em",
          borderRadius: "1em",
          margin: "1em 0",
        }}
      >
        {recording ? "⏹️ Stop" : "🎙️ Record"}
      </button>
      <div>
        <p style={{ fontWeight: "bold" }}>
          Transcript: <span style={{ fontWeight: "normal" }}>{transcript}</span>
        </p>
        <p style={{ color: feedbackColor, fontWeight: "bold" }}>{feedback}</p>
      </div>
      <button
        disabled={exerciseIdx === 0}
        onClick={() => setExerciseIdx(exerciseIdx - 1)}
        style={{
          background: "#A9AF88",
          color: "#fff",
          fontWeight: "bold",
          borderRadius: "1em",
          margin: "0.5em",
          padding: "0.5em 1em",
        }}
      >
        Prev
      </button>
      <button
        disabled={exerciseIdx === exercises.length - 1}
        onClick={() => setExerciseIdx(exerciseIdx + 1)}
        style={{
          background: "#1C2AAF",
          color: "#fff",
          fontWeight: "bold",
          borderRadius: "1em",
          margin: "0.5em",
          padding: "0.5em 1em",
        }}
      >
        Next
      </button>
    </div>
  );
}
