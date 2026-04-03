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
        userInput.placeholder = "Ask Neo...";
    }

} else {
    if (micBtn) micBtn.style.display = "none";
    console.warn("Speech Recognition not supported in this browser.");
}