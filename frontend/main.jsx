import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

===== frontend/src/App.jsx =====
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef();

  useEffect(() => {
    axios.get("/exercises").then((res) => setExercises(res.data[profile]));
  }, [profile]);

  useEffect(() => {
    if (exercises.length)
      setAudioUrl(`/tts?text=${encodeURIComponent(exercises[exerciseIdx].text)}&type=pt-PT`);
  }, [exercises, exerciseIdx]);

  const handleRecord = async () => {
    setRecording(true);
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
      const resp = await axios.post("/analyze", formData);
      setTranscript(resp.data.transcript);
      setFeedback(resp.data.feedback);
      setRecording(false);
    };
    mediaRecorderRef.current.start();
    setTimeout(() => {
      mediaRecorderRef.current.stop();
    }, 3000);
  };

  if (!exercises.length) return <div>Loading...</div>;
  const ex = exercises[exerciseIdx];

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
      <button onClick={handleRecord} disabled={recording}>
        🎙️ {recording ? "Recording..." : "Record"}
      </button>
      <p>Transcript: {transcript}</p>
      <p style={{ color: feedback === "Perfect!" ? "green" : "orange" }}>{feedback}</p>
      <button disabled={exerciseIdx === 0} onClick={() => setExerciseIdx(exerciseIdx - 1)}>
        Prev
      </button>
      <button disabled={exerciseIdx === exercises.length - 1} onClick={() => setExerciseIdx(exerciseIdx + 1)}>
        Next
      </button>
    </div>
  );
}
