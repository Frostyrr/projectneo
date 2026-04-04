window.attachedImageFile = null; 

const imageUpload = document.getElementById("image-upload");
const userInputField = document.getElementById("user-input"); 
const imageBtn = document.getElementById("image-btn");

// NEW: Grab the preview elements
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const removeImageBtn = document.getElementById("remove-image-btn");

imageUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    window.attachedImageFile = file;

    // --- NEW: Generate a local preview URL and show the thumbnail ---
    const localImageUrl = URL.createObjectURL(file);
    imagePreview.src = localImageUrl;
    imagePreviewContainer.style.display = "inline-block"; // Unhide the box

    userInputField.placeholder = `Add a prompt...`;
    if (imageBtn) imageBtn.style.color = "#81c995"; 
});

// --- NEW: Let the user cancel the upload by clicking the X ---
removeImageBtn.addEventListener("click", () => {
    window.attachedImageFile = null;
    imageUpload.value = ""; // Clear the file
    
    // Hide and clear the preview
    imagePreviewContainer.style.display = "none";
    imagePreview.src = "";
    
    userInputField.placeholder = "Ask Neo...";
    if (imageBtn) imageBtn.style.color = ""; 
});