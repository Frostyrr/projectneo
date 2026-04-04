// ==================================================
// This file handles  network requests to the backend 
// ==================================================

class ApiService {
    static async getChats() {
        const response = await fetch("/api/chats");
        return response.json();
    }

    static async getChatHistory(chatId) {
        const response = await fetch(`/api/chat/${chatId}`);
        return response.json();
    }

    static async renameChat(chatId, title) {
        const response = await fetch(`/api/chat/${chatId}/rename`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title })
        });
        return response.json();
    }

    static async sendTextMessage(message, chatId) {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, chat_id: chatId })
        });
        return response.json();
    }

    static async sendImageMessage(message, chatId, imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        
        // Use user's prompt or a default
        const customPrompt = message ? message : "Analyze this schedule. Extract all events, times, days, and locations. Format them into a clean, easy-to-read list.";
        formData.append("prompt", customPrompt);
        
        if (chatId) formData.append("chat_id", chatId);

        const response = await fetch("/api/analyze-image", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) throw new Error(`Server crashed with status: ${response.status}`);
        return response.json();
    }
}