const micBtn = document.getElementById("mic-btn");
const userInput = document.getElementById("user-input");

let isRecording = false;
let finalTranscript = "";
let recognition = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {

    function startRecognition() {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

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
        };

        recognition.onerror = (event) => {
            console.error("Recognition error:", event.error);
            if (event.error === "network") {
                alert("Speech recognition is not supported in Brave browser. Please use Chrome or Edge.");
            } else if (event.error === "not-allowed") {
                alert("Microphone access denied. Please allow microphone access.");
            }
            isRecording = false;
            stopUI();
        };

        recognition.onend = () => {
            if (isRecording) {
                startRecognition();
            } else {
                if (userInput.value.trim() !== "") {
                    window.neoApp.handleSendMessage();
                }
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.warn("Recognition start error:", e);
        }
    }

    micBtn.addEventListener("click", () => {
        if (isRecording) {
            isRecording = false;
            if (recognition) {
                recognition.onend = null;
                recognition.abort();
                recognition = null;
            }
            stopUI();
            if (userInput.value.trim() !== "") {
                window.neoApp.handleSendMessage();
            }
        } else {
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
        userInput.placeholder = "Ask Neo...";
    }

} else {
    if (micBtn) micBtn.style.display = "none";
    console.warn("Speech Recognition not supported in this browser.");
}