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
  const [highlight, setHighlight] = useState([]);
  const mediaRecorderRef = useRef();

  useEffect(() => {
    axios
      .get("https://dizai-v09.onrender.com/exercises")
      .then((res) => setExercises(res.data[profile]));
  }, [profile]);

  useEffect(() => {
    if (exercises.length)
      setAudioUrl(
        `/tts?text=${encodeURIComponent(exercises[exerciseIdx].text)}&type=pt-PT`
      );
  }, [exercises, exerciseIdx]);

  const handleRecord = async () => {
    setRecording(true);
    setFeedback(""); // Nollställ feedback och highlight före inspelning
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
      const resp = await axios.post(
        "https://dizai-v09.onrender.com/analyze",
        formData
      );
      setTranscript(resp.data.transcript);
      setFeedback(resp.data.feedback);
      setHighlight(resp.data.highlight || []);
      setRecording(false);
    };
    mediaRecorderRef.current.start();
    setTimeout(() => {
      mediaRecorderRef.current.stop();
    }, 3000);
  };

  if (!exercises.length) return <div>Loading...</div>;
  const ex = exercises[exerciseIdx];

  // Färglogik för feedback
  let feedbackColor = "orange";
  let highlightColor = "#ffa500"; // orange som default
  if (feedback === "Try again. Pay attention to pronunciation.") {
    feedbackColor = "red";
    highlightColor = "#ff6666";
  } else if (feedback === "Almost! Check highlighted words.") {
    feedbackColor = "orange";
    highlightColor = "#ffd966";
  } else if (feedback === "Perfect!") {
    feedbackColor = "green";
    highlightColor = "transparent";
  }

  return (
    <div>
      <h2>DizAí v0.9</h2>
      <button
        onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}
      >
        Switch to {profile === "Johan" ? "Petra" : "Johan"}
      </button>
      <div>
        {/* Referenstext med highlight */}
        <h3>
          {ex.text.split(/\s+/).map((word, i) => (
            <span
              key={i}
              style={{
                background:
                  highlight.length > 0 && highlight.includes(i)
                    ? highlightColor
                    : "transparent",
                borderRadius: "4px",
                padding: "0 2px",
                transition: "background 0.2s",
              }}
            >
              {word + " "}
            </span>
          ))}
        </h3>
        <p>IPA: {ex.ipa}</p>
        <audio controls src={audioUrl}></audio>
      </div>
      <button onClick={handleRecord} disabled={recording}>
        🎙️ {recording ? "Recording..." : "Record"}
      </button>
      <p>
        <b>Transcript:</b> {transcript}
      </p>
      {feedback && (
        <p style={{ color: feedbackColor, fontWeight: "bold" }}>{feedback}</p>
      )}
      <button
        disabled={exerciseIdx === 0}
        onClick={() => setExerciseIdx(exerciseIdx - 1)}
      >
        Prev
      </button>
      <button
        disabled={exerciseIdx === exercises.length - 1}
        onClick={() => setExerciseIdx(exerciseIdx + 1)}
      >
        Next
      </button>
    </div>
  );
}
