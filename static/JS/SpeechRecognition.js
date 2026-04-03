const micBtn = document.getElementById("mic-btn");
let isRecording = false;
let finalTranscript = "";
let recognition = null;
let mediaStream = null; // ✅ Keep mic stream alive

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {

    // ✅ Request mic permission explicitly first before recognition starts
    async function requestMicPermission() {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            return true;
        } catch (e) {
            alert("Microphone access denied. Please allow microphone access.");
            return false;
        }
    }

    function startRecognition() {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            console.log("Recognition started"); // ✅ Check if this appears in console
        };

        recognition.onresult = (event) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += t + " ";
                } else {
                    interim += t;
                }
            }
            userInput.value = (finalTranscript + interim).trim();
            console.log("Result:", userInput.value); // ✅ Check if this appears
        };

        recognition.onerror = (event) => {
            console.error("Recognition error:", event.error); // ✅ Check what error appears
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                alert("Speech recognition blocked. Please disable Brave Shields for localhost.");
                isRecording = false;
                stopUI();
            }
        };

        recognition.onend = () => {
            console.log("Recognition ended, isRecording:", isRecording);
            if (isRecording) {
                startRecognition(); // restart
            } else {
                if (userInput.value.trim() !== "") {
                    sendMessage();
                }
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.warn("Recognition start error:", e);
        }
    }

    micBtn.addEventListener("click", async () => {
        if (isRecording) {
            // STOP
            isRecording = false;
            if (recognition) {
                recognition.onend = null;
                recognition.abort();
                recognition = null;
            }
            // ✅ Release mic stream
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
                mediaStream = null;
            }
            stopUI();
            if (userInput.value.trim() !== "") {
                sendMessage();
            }
        } else {
            // START — request mic first
            const allowed = await requestMicPermission();
            if (!allowed) return;

            isRecording = true;
            finalTranscript = "";
            userInput.value = "";
            micBtn.classList.add("recording");
            userInput.placeholder = "Listening...";
            startRecognition();
        }
    });

    function stopUI() {
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

} else {
    if (micBtn) micBtn.style.display = "none";
    console.warn("Speech Recognition not supported in this browser.");
}
