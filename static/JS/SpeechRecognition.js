// --- Speech to Text (Microphone Integration) ---
const micBtn = document.getElementById("mic-btn");
let isRecording = false;

// Check for browser support (Chrome, Edge, Safari natively support this)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stops automatically when the user pauses
    recognition.interimResults = true; // Shows words in the input box as they are spoken

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add("recording");
        userInput.placeholder = "Listening...";
        userInput.value = ""; // Clear existing text when starting a new recording
    };

    recognition.onresult = (event) => {
        // Compile the transcribed words from the event object
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
            
        userInput.value = transcript; // Drop the text into your existing input box
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        stopRecording();
    };

    recognition.onend = () => {
        stopRecording();
        
        // Optional: Auto-send the message once they finish talking. 
        // If you prefer they review the text and click send manually, leave this commented out.
        // if (userInput.value.trim() !== "") sendMessage(); 
    };

    // Toggle recording on button click
    micBtn.addEventListener("click", () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    function stopRecording() {
        isRecording = false;
        micBtn.classList.remove("recording");
        userInput.placeholder = "Ask Neo...";
    }
} else {
    // Hide the mic button completely if the browser doesn't support the feature
    if (micBtn) micBtn.style.display = "none";
    console.warn("Speech Recognition API is not supported in this browser.");
}