import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// System prompt for the tutor - TEACHING FIRST approach
const SYSTEM_PROMPT = `You are an enthusiastic and patient AI tutor. Your PRIMARY goal is to TEACH, not assess.

**CORE PHILOSOPHY: TEACH FIRST, QUESTION SECOND**

When a student wants to learn a topic, START TEACHING IMMEDIATELY. Don't quiz them first.

**YOUR TEACHING APPROACH:**

1. **Start with an Overview** (2-3 sentences)
   - Give them a clear, exciting introduction to the topic
   - Explain why it's interesting or useful
   - Set the stage for deeper learning

2. **Explain the Core Concept** (4-5 sentences)
   - Break it down into simple, digestible parts
   - Use concrete examples and real-world analogies
   - Include specific details (numbers, names, processes)
   - Make it visual and tangible

3. **Provide a Practical Example**
   - Show how it works in practice
   - Use analogies they can relate to
   - Make abstract concepts concrete

4. **Build on Their Understanding** (ONLY if they respond)
   - When they ask questions, answer thoroughly with examples
   - When they seem confused, rephrase with different analogies
   - When they understand, move to the next concept naturally

**EXAMPLE OF EXCELLENT TEACHING:**

"Great! Let's dive into Machine Learning. It's one of the most exciting fields in technology today!

Machine Learning is essentially teaching computers to learn from experience, just like humans do. Instead of programming every single rule, we show the computer thousands of examples, and it finds patterns on its own. Think of it like teaching a child to recognize dogs - you don't give them a rulebook, you show them many pictures of dogs until they learn what makes a dog a dog.

Here's how it works in practice: Imagine you want to predict house prices. You feed the computer data about thousands of houses (size, location, age, number of rooms) along with their actual prices. The ML algorithm finds patterns - maybe it discovers that houses near parks sell for 15% more, or that an extra bedroom adds $50,000 to the value. Once trained, it can predict prices for new houses it's never seen before!

There are three main types: **Supervised Learning** (learning from labeled examples, like our house price example), **Unsupervised Learning** (finding patterns in unlabeled data, like grouping customers by behavior), and **Reinforcement Learning** (learning by trial and error, like teaching a robot to walk).

The real magic happens in the algorithms. **Neural Networks** are inspired by how your brain works - they have layers of connected 'neurons' that process information. Each neuron looks at the input, applies some math, and passes it forward. During training, the network adjusts millions of tiny settings until it gets good at its task.

What specific aspect would you like to explore deeper - the algorithms, the applications, or how to get started building ML models yourself?"

**RULES FOR ENGAGEMENT:**

✅ **ALWAYS teach substantially** - give rich, detailed explanations
✅ **Use specific examples** - names, numbers, real scenarios
✅ **Make analogies** - connect new ideas to familiar concepts
✅ **Build progressively** - start simple, add complexity gradually
✅ **Be enthusiastic** - show excitement about the topic!
✅ **Offer choices** - let them guide which direction to explore

❌ **NEVER start with "What do you know about..."** - Start teaching!
❌ **NEVER give shallow one-sentence answers** - Go deep!
❌ **NEVER be dry or academic** - Be engaging and conversational!

**RESPONSE STRUCTURE:**
1. Hook/Introduction (1-2 sentences)
2. Core explanation (4-6 sentences with examples)
3. Practical application or analogy
4. Optional: Invite them to explore specific aspects

Remember: Your job is to make learning exciting and accessible. TEACH FIRST!`;

// Local storage keys
const STORAGE_KEYS = {
    SESSION: 'ai_tutor_session',
    PREFERENCES: 'ai_tutor_preferences',
    SETTINGS: 'ai_tutor_settings',
    INSTALL_DISMISSED: 'ai_tutor_install_dismissed'
};

// Application state
const state = {
    engine: null,
    messages: [],
    currentTopic: null,
    sessionStartTime: null,
    learningPreferences: {
        style: 'balanced',
        difficulty: 'intermediate'
    },
    settings: {
        temperature: 0.7
    },
    durationTimer: null
};

// DOM elements
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    loadingStatus: document.getElementById('loadingStatus'),
    loadingProgress: document.getElementById('loadingProgress'),
    app: document.getElementById('app'),
    compatibilityWarning: document.getElementById('compatibilityWarning'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    chatMessages: document.getElementById('chatMessages'),
    chatInputContainer: document.getElementById('chatInputContainer'),
    topicInput: document.getElementById('topicInput'),
    startLearningBtn: document.getElementById('startLearningBtn'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    newSessionBtn: document.getElementById('newSessionBtn'),
    exportBtn: document.getElementById('exportBtn'),
    modelStatus: document.getElementById('modelStatus'),
    currentTopic: document.getElementById('currentTopic'),
    topicDisplay: document.getElementById('topicDisplay'),
    sessionDuration: document.getElementById('sessionDuration'),
    durationDisplay: document.getElementById('durationDisplay'),
    learningStyle: document.getElementById('learningStyle'),
    difficultyLevel: document.getElementById('difficultyLevel'),
    temperature: document.getElementById('temperature'),
    tempValue: document.getElementById('tempValue'),
    installBanner: document.getElementById('installBanner'),
    installBtn: document.getElementById('installBtn'),
    dismissInstallBtn: document.getElementById('dismissInstallBtn')
};

// PWA Install prompt
let deferredPrompt = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Show toast notification
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '📝'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// ============================================================================
// LOCAL STORAGE FUNCTIONS
// ============================================================================

// Save session to localStorage
function saveSession() {
    try {
        const sessionData = {
            messages: state.messages,
            currentTopic: state.currentTopic,
            sessionStartTime: state.sessionStartTime,
            lastUpdated: Date.now()
        };
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
    } catch (error) {
        console.error('Failed to save session:', error);
    }
}

// Load session from localStorage
function loadSession() {
    try {
        const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            
            // Check if session is less than 24 hours old
            const age = Date.now() - (parsed.lastUpdated || 0);
            if (age < 24 * 60 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.error('Failed to load session:', error);
    }
    return null;
}

// Save preferences to localStorage
function savePreferences() {
    try {
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(state.learningPreferences));
    } catch (error) {
        console.error('Failed to save preferences:', error);
    }
}

// Load preferences from localStorage
function loadPreferences() {
    try {
        const prefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        if (prefs) {
            return JSON.parse(prefs);
        }
    } catch (error) {
        console.error('Failed to load preferences:', error);
    }
    return null;
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

// Load settings from localStorage
function loadSettings() {
    try {
        const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (settings) {
            return JSON.parse(settings);
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    return null;
}

// Clear all saved data
function clearAllData() {
    try {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        showToast('All saved data cleared', 'success');
    } catch (error) {
        console.error('Failed to clear data:', error);
        showToast('Failed to clear data', 'error');
    }
}

// ============================================================================
// PWA INSTALL HANDLING
// ============================================================================

// Handle PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Check if user dismissed the banner before
    const dismissed = localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED);
    if (!dismissed) {
        elements.installBanner.style.display = 'block';
    }
});

// Install button click
if (elements.installBtn) {
    elements.installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                showToast('App installed successfully! 🎉', 'success');
            }
            
            deferredPrompt = null;
            elements.installBanner.style.display = 'none';
        }
    });
}

// Dismiss install banner
if (elements.dismissInstallBtn) {
    elements.dismissInstallBtn.addEventListener('click', () => {
        elements.installBanner.style.display = 'none';
        localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, 'true');
    });
}

// Handle successful install
window.addEventListener('appinstalled', () => {
    showToast('App installed! You can now use it offline.', 'success');
    elements.installBanner.style.display = 'none';
});

// ============================================================================
// MODEL INITIALIZATION
// ============================================================================

// Check WebGPU support
async function checkWebGPUSupport() {
    if (!navigator.gpu) {
        elements.compatibilityWarning.style.display = 'flex';
        elements.loadingScreen.style.display = 'none';
        return false;
    }
    return true;
}

// Initialize the AI model with retry logic
async function initializeModel(retryCount = 0) {
    const maxRetries = 3;
    
    try {
        updateLoadingStatus('Checking browser compatibility...', 10);
        
        const hasWebGPU = await checkWebGPUSupport();
        if (!hasWebGPU) return;

        updateLoadingStatus('Initializing AI engine...', 20);
        
        // Create engine with progress callback
        // Using Llama-3.1-8B-Instruct for superior teaching and instruction-following
        state.engine = await webllm.CreateMLCEngine(
            "Llama-3.1-8B-Instruct-q4f16_1-MLC",
            {
                initProgressCallback: (progress) => {
                    const percent = Math.round(progress.progress * 100);
                    updateLoadingStatus(progress.text, percent);
                }
            }
        );

        updateLoadingStatus('AI model ready!', 100);
        
        // Wait a moment before showing the app
        setTimeout(() => {
            elements.loadingScreen.style.display = 'none';
            elements.app.style.display = 'flex';
            elements.modelStatus.textContent = 'Ready';
            
            // Load saved preferences and settings
            loadSavedData();
            
            // Check for saved session
            restoreSessionIfAvailable();
            
            showToast('AI Tutor ready! 🎓', 'success');
        }, 500);

    } catch (error) {
        console.error('Failed to initialize model:', error);
        
        if (retryCount < maxRetries) {
            const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            updateLoadingStatus(`Error loading model. Retrying in ${retryDelay/1000}s... (Attempt ${retryCount + 1}/${maxRetries})`, 0);
            
            setTimeout(() => {
                initializeModel(retryCount + 1);
            }, retryDelay);
        } else {
            updateLoadingStatus(`Error: ${error.message}`, 0);
            elements.compatibilityWarning.style.display = 'flex';
            showToast('Failed to load AI model after multiple attempts', 'error', 0);
        }
    }
}

// Update loading status
function updateLoadingStatus(text, percent) {
    elements.loadingStatus.textContent = text;
    elements.loadingProgress.style.width = `${percent}%`;
}

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

// Load saved preferences and settings
function loadSavedData() {
    // Load preferences
    const savedPrefs = loadPreferences();
    if (savedPrefs) {
        state.learningPreferences = savedPrefs;
        elements.learningStyle.value = savedPrefs.style;
        elements.difficultyLevel.value = savedPrefs.difficulty;
    }
    
    // Load settings
    const savedSettings = loadSettings();
    if (savedSettings) {
        state.settings = savedSettings;
        elements.temperature.value = savedSettings.temperature;
        elements.tempValue.textContent = savedSettings.temperature;
    }
}

// Restore previous session
function restoreSessionIfAvailable() {
    const savedSession = loadSession();
    
    if (savedSession && savedSession.messages.length > 0) {
        // Ask user if they want to restore
        const restore = confirm('Would you like to restore your previous learning session?');
        
        if (restore) {
            state.messages = savedSession.messages;
            state.currentTopic = savedSession.currentTopic;
            state.sessionStartTime = savedSession.sessionStartTime;
            
            // Update UI
            elements.welcomeScreen.style.display = 'none';
            elements.chatMessages.style.display = 'flex';
            elements.chatInputContainer.style.display = 'block';
            elements.currentTopic.textContent = state.currentTopic;
            elements.topicDisplay.style.display = 'block';
            elements.durationDisplay.style.display = 'block';
            
            // Restore messages
            state.messages.forEach(msg => {
                if (msg.role !== 'system') {
                    addMessage(msg.role, msg.content);
                }
            });
            
            // Start duration timer
            startDurationTimer();
            
            // Focus input
            elements.chatInput.focus();
            
            showToast('Session restored successfully', 'success');
        } else {
            // Clear old session
            localStorage.removeItem(STORAGE_KEYS.SESSION);
        }
    }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

// Format time duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// Update session duration
function updateSessionDuration() {
    if (state.sessionStartTime) {
        const duration = Date.now() - state.sessionStartTime;
        elements.sessionDuration.textContent = formatDuration(duration);
    }
}

// Start duration timer
function startDurationTimer() {
    if (state.durationTimer) {
        clearInterval(state.durationTimer);
    }
    state.durationTimer = setInterval(updateSessionDuration, 1000);
}

// Start learning session
async function startLearningSession(topic) {
    if (!topic.trim()) return;

    state.currentTopic = topic;
    state.sessionStartTime = Date.now();
    state.messages = [];

    // Update UI
    elements.welcomeScreen.style.display = 'none';
    elements.chatMessages.style.display = 'flex';
    elements.chatInputContainer.style.display = 'block';
    elements.currentTopic.textContent = topic;
    elements.topicDisplay.style.display = 'block';
    elements.durationDisplay.style.display = 'block';

    // Start duration timer
    startDurationTimer();

    // Save session
    saveSession();

    // Create initial prompt - TEACH FIRST approach
    const learningStyle = state.learningPreferences.style;
    const difficulty = state.learningPreferences.difficulty;

    const initialPrompt = `I want to learn about: ${topic}

My learning preferences:
- Learning style: ${learningStyle}
- Difficulty level: ${difficulty}

Start teaching me about this topic RIGHT NOW. Don't ask me what I know - just dive in and explain it clearly with examples and analogies. Make it engaging and exciting! Assume I'm curious and ready to learn.`;

    // Generate response (don't show this initial prompt to user)
    await generateResponse(initialPrompt, true);
    
    // Focus input
    elements.chatInput.focus();
}

// ============================================================================
// AI RESPONSE GENERATION
// ============================================================================

// Generate AI response with error handling
async function generateResponse(userMessage, isInitialPrompt = false, retryCount = 0) {
    const maxRetries = 2;
    
    // Add user message to UI only if it's not the initial system prompt
    if (!isInitialPrompt) {
        addMessage('user', userMessage);
    }

    // Show typing indicator
    const typingDiv = showTypingIndicator();

    try {
        elements.modelStatus.textContent = 'Thinking...';

        // Build messages array with system prompt
        const messagesForAPI = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        // Add conversation history (last 10 messages to manage context)
        const recentMessages = state.messages.slice(-10);
        messagesForAPI.push(...recentMessages);

        // Add current user message
        messagesForAPI.push({ role: 'user', content: userMessage });

        // Generate response
        const response = await state.engine.chat.completions.create({
            messages: messagesForAPI,
            temperature: state.settings.temperature,
            max_tokens: 1500,
        });

        // Remove typing indicator
        typingDiv.remove();

        // Get assistant response
        const assistantMessage = response.choices[0].message.content;

        // Update state
        state.messages.push({ role: 'user', content: userMessage });
        state.messages.push({ role: 'assistant', content: assistantMessage });

        // Save session
        saveSession();

        // Add assistant message to UI
        addMessage('assistant', assistantMessage);

        elements.modelStatus.textContent = 'Ready';
        
        // Return focus to input
        elements.chatInput.focus();

    } catch (error) {
        console.error('Error generating response:', error);
        typingDiv.remove();
        
        if (retryCount < maxRetries) {
            showToast(`Error generating response. Retrying... (${retryCount + 1}/${maxRetries})`, 'warning');
            setTimeout(() => {
                generateResponse(userMessage, isInitialPrompt, retryCount + 1);
            }, 1000);
        } else {
            addMessage('assistant', '❌ Sorry, I encountered an error generating a response. Please try rephrasing your question or starting a new session.');
            elements.modelStatus.textContent = 'Error';
            showToast('Failed to generate response after multiple attempts', 'error');
        }
    }
}

// Show typing indicator
function showTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant typing';
    messageDiv.innerHTML = `
        <div class="message-avatar">🎓</div>
        <div class="message-content">
            <div class="message-text">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    return messageDiv;
}

// Add message to chat
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const avatar = role === 'user' ? '👤' : '🎓';
    const roleName = role === 'user' ? 'You' : 'AI Tutor';

    // Format content with basic markdown support
    const formattedContent = formatMarkdown(content);

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-role">${roleName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${formattedContent}</div>
        </div>
    `;

    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Basic markdown formatting
function formatMarkdown(text) {
    // Escape HTML
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Lists (basic support)
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return formatted;
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

// Export chat history
function exportChat() {
    if (state.messages.length === 0) {
        showToast('No chat history to export!', 'warning');
        return;
    }

    const exportData = {
        topic: state.currentTopic,
        date: new Date().toISOString(),
        duration: formatDuration(Date.now() - state.sessionStartTime),
        preferences: state.learningPreferences,
        messages: state.messages.map(msg => ({
            role: msg.role === 'user' ? 'You' : 'AI Tutor',
            content: msg.content
        }))
    };

    // Create both JSON and text formats
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const textContent = `AI Personal Tutor - Learning Session
Topic: ${state.currentTopic}
Date: ${new Date().toLocaleDateString()}
Duration: ${formatDuration(Date.now() - state.sessionStartTime)}

${state.messages.map(msg => {
    const role = msg.role === 'user' ? 'You' : 'AI Tutor';
    return `${role}:\n${msg.content}\n`;
}).join('\n')}

---
All learning stays on your device. Nothing is sent to any server.
Generated by AI Personal Tutor - https://github.com/ilyas-hassan/personal_tutor_app`;

    const textBlob = new Blob([textContent], { type: 'text/plain' });
    
    // Download both files
    const timestamp = new Date().toISOString().split('T')[0];
    
    // JSON export
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `tutor-session-${state.currentTopic || 'chat'}-${timestamp}.json`;
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);
    
    // Text export
    setTimeout(() => {
        const textUrl = URL.createObjectURL(textBlob);
        const textLink = document.createElement('a');
        textLink.href = textUrl;
        textLink.download = `tutor-session-${state.currentTopic || 'chat'}-${timestamp}.txt`;
        textLink.click();
        URL.revokeObjectURL(textUrl);
    }, 100);
    
    showToast('Chat exported successfully!', 'success');
}

// ============================================================================
// SESSION CONTROL
// ============================================================================

// New session
function newSession() {
    if (state.messages.length > 0) {
        if (!confirm('Are you sure you want to start a new session? Current progress will be lost unless you export it first.')) {
            return;
        }
    }

    // Clear timer
    if (state.durationTimer) {
        clearInterval(state.durationTimer);
    }

    // Clear session from storage
    localStorage.removeItem(STORAGE_KEYS.SESSION);

    // Reset state
    state.messages = [];
    state.currentTopic = null;
    state.sessionStartTime = null;

    // Reset UI
    elements.chatMessages.innerHTML = '';
    elements.chatMessages.style.display = 'none';
    elements.chatInputContainer.style.display = 'none';
    elements.welcomeScreen.style.display = 'block';
    elements.topicDisplay.style.display = 'none';
    elements.durationDisplay.style.display = 'none';
    elements.topicInput.value = '';
    
    // Focus topic input
    elements.topicInput.focus();
    
    showToast('New session started', 'success');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Topic input
elements.startLearningBtn.addEventListener('click', () => {
    const topic = elements.topicInput.value.trim();
    if (topic) {
        startLearningSession(topic);
    }
});

elements.topicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const topic = elements.topicInput.value.trim();
        if (topic) {
            startLearningSession(topic);
        }
    }
});

// Example topic buttons
document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const topic = btn.getAttribute('data-topic');
        elements.topicInput.value = topic;
        elements.topicInput.focus();
    });
});

// Chat input
elements.sendBtn.addEventListener('click', () => {
    const message = elements.chatInput.value.trim();
    if (message) {
        generateResponse(message);
        elements.chatInput.value = '';
    }
});

// Enhanced keyboard shortcuts
elements.chatInput.addEventListener('keydown', (e) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = elements.chatInput.value.trim();
        if (message) {
            generateResponse(message);
            elements.chatInput.value = '';
        }
    }
    
    // Shift+Enter for new line is default behavior
});

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus chat input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (elements.chatInput.style.display !== 'none') {
            elements.chatInput.focus();
        } else {
            elements.topicInput.focus();
        }
    }
    
    // Ctrl/Cmd + N: New session
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        newSession();
    }
    
    // Ctrl/Cmd + E: Export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportChat();
    }
});

// Session controls
elements.newSessionBtn.addEventListener('click', newSession);
elements.exportBtn.addEventListener('click', exportChat);

// Learning preferences (save on change)
elements.learningStyle.addEventListener('change', (e) => {
    state.learningPreferences.style = e.target.value;
    savePreferences();
    showToast('Preferences saved', 'success', 2000);
});

elements.difficultyLevel.addEventListener('change', (e) => {
    state.learningPreferences.difficulty = e.target.value;
    savePreferences();
    showToast('Preferences saved', 'success', 2000);
});

// Settings (save on change)
elements.temperature.addEventListener('input', (e) => {
    state.settings.temperature = parseFloat(e.target.value);
    elements.tempValue.textContent = e.target.value;
    saveSettings();
});

// Auto-save session periodically
setInterval(() => {
    if (state.messages.length > 0) {
        saveSession();
    }
}, 30000); // Save every 30 seconds

// Save on page unload
window.addEventListener('beforeunload', () => {
    if (state.messages.length > 0) {
        saveSession();
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initializeModel();
});
