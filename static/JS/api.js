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

    static async deleteChat(chatId) {
        const response = await fetch(`/api/chat/${chatId}`, {
            method: "DELETE"
        });
        return response.json();
    }

    static async togglePinChat(chatId, isPinned) {
        const response = await fetch(`/api/chat/${chatId}/pin`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_pinned: isPinned })
        });
        return response.json();
    }

    static async sendTextMessage(message, chatId) {
        const now = new Date();
        const clientDatetime = now.toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message, 
                chat_id: chatId,
                client_datetime: clientDatetime
            })
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