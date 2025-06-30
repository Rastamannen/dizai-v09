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
  const [userAudioUrl, setUserAudioUrl] = useState(null);
  const mediaRecorderRef = useRef();

  useEffect(() => {
    axios
      .get("https://dizai-v09.onrender.com/exercises")
      .then((res) => setExercises(res.data[profile]));
  }, [profile]);

  useEffect(() => {
    if (exercises.length) {
      setAudioUrl(
        `/tts?text=${encodeURIComponent(
          exercises[exerciseIdx].text
        )}&type=pt-PT`
      );
    }
  }, [exercises, exerciseIdx]);

  const handleRecordToggle = async () => {
    if (recording) {
      mediaRecorderRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      let chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorderRef.current.onstop = async () => {
        setRecording(false);
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setUserAudioUrl(url);

        const formData = new FormData();
        formData.append("audio", blob, "audio.webm");
        formData.append("profile", profile);
        formData.append("exerciseId", exerciseIdx);

        const resp = await axios.post("https://dizai-v09.onrender.com/analyze", formData);
        setTranscript(resp.data.transcript);
        setFeedback(resp.data.feedback);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Recording failed:", err);
      setRecording(false);
    }
  };

  if (!exercises.length) return <div>Loading...</div>;
  const ex = exercises[exerciseIdx];

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h2>DizAí v0.9</h2>
      <button onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}>
        Switch to {profile === "Johan" ? "Petra" : "Johan"}
      </button>

      <div style={{ marginTop: "1rem" }}>
        <h3>{ex.text}</h3>
        <p>IPA: {ex.ipa}</p>
        <audio controls src={audioUrl}></audio>
      </div>

      <button onClick={handleRecordToggle}>
        🎙️ {recording ? "Stop recording" : "Start recording"}
      </button>

      {userAudioUrl && (
        <div>
          <p>Your recording:</p>
          <audio controls src={userAudioUrl}></audio>
        </div>
      )}

      <p>Transcript: {transcript}</p>
      <p style={{ color: feedback === "Perfect!" ? "green" : "orange" }}>{feedback}</p>

      <button disabled={exerciseIdx === 0} onClick={() => setExerciseIdx(exerciseIdx - 1)}>
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
