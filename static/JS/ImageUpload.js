window.attachedImageFile = null; 

const imageUpload = document.getElementById("image-upload");
const userInputField = document.getElementById("user-input"); 
const imageBtn = document.getElementById("image-btn");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const removeImageBtn = document.getElementById("remove-image-btn");

// --- NEW: A helper function to handle the image, whether clicked or pasted ---
function attachImageToUI(file) {
    // Strict Security Check: Reject anything that isn't an image
    if (!file.type.startsWith("image/")) {
        alert("Neo can only see image files right now!");
        return;
    }

    window.attachedImageFile = file;

    const localImageUrl = URL.createObjectURL(file);
    imagePreview.src = localImageUrl;
    imagePreviewContainer.style.display = "inline-block"; 

    userInputField.placeholder = `Add a prompt...`;
    if (imageBtn) imageBtn.style.color = "#81c995"; 
}

// 1. Handle clicking the paperclip (File Explorer)
imageUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) attachImageToUI(file);
});

// 2. NEW: Handle Copy & Paste directly into the text box!
userInputField.addEventListener("paste", (event) => {
    // Check if the clipboard contains any files
    const items = event.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        // Look for the first item that is an image
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            
            attachImageToUI(file);
            
            // Prevent the browser from pasting the image's raw data as text
            event.preventDefault(); 
            break; // Stop searching once we find an image
        }
    }
});

// 3. Let the user cancel
removeImageBtn.addEventListener("click", () => {
    window.attachedImageFile = null;
    imageUpload.value = ""; 
    
    imagePreviewContainer.style.display = "none";
    imagePreview.src = "";
    
    userInputField.placeholder = "Ask Neo...";
    if (imageBtn) imageBtn.style.color = ""; 
});