// --- Universal Microphone Integration (MediaRecorder + Backend) ---
const micBtn = document.getElementById("mic-btn");
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

micBtn.addEventListener("click", async () => {
    if (isRecording) {
        // 1. Stop Recording
        mediaRecorder.stop();
        isRecording = false;
        micBtn.classList.remove("recording");
        userInput.placeholder = "Processing audio...";
    } else {
        // 2. Start Recording
        try {
            // Request microphone access (Works on Safari, Brave, Chrome, iOS)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            // Collect audio data as it records
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            // When recording stops, send it to the server
            mediaRecorder.onstop = async () => {
                // Combine audio chunks into a single file
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                const formData = new FormData();
                
                // Name the file based on the browser's audio format
                const extension = mediaRecorder.mimeType.includes("mp4") ? "mp4" : "webm";
                formData.append("audio", audioBlob, `recording.${extension}`);

                try {
                    const response = await fetch("/api/transcribe", {
                        method: "POST",
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.text) {
                        userInput.value = data.text; // Drop the text into the input field
                    } else {
                        console.error("Transcription failed", data.error);
                        userInput.placeholder = "Failed to hear that. Try again.";
                    }
                } catch (err) {
                    console.error("Server error:", err);
                }

                // Clean up: Turn off the red recording dot in the browser tab
                stream.getTracks().forEach(track => track.stop());
                
                // Reset placeholder after a short delay
                setTimeout(() => {
                    userInput.placeholder = "Ask Neo...";
                }, 1500);
            };

            // Start the recording process
            mediaRecorder.start();
            isRecording = true;
            micBtn.classList.add("recording");
            userInput.placeholder = "Listening...";
            userInput.value = ""; // Clear existing text

        } catch (err) {
            alert("Microphone access denied. Please check your browser permissions.");
            console.error("Mic Error:", err);
        }
    }
});