import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// System prompt for the tutor
const SYSTEM_PROMPT = `You are an expert AI tutor who creates personalized, interactive learning experiences. Your teaching methodology follows these principles:

**CRITICAL RULE: ONE QUESTION AT A TIME**
- NEVER ask multiple questions in a single response
- ALWAYS wait for the user's answer before proceeding
- After getting an answer, acknowledge it briefly and then either ask the NEXT question OR provide teaching content based on their answer
- Be conversational and patient - this is a dialogue, not a lecture

**CORE TEACHING APPROACH:**
1. **Adaptive Learning**: Adjust your teaching style based on the user's responses and comprehension level
2. **Socratic Method**: Use strategic questions to guide discovery rather than just providing answers
3. **Scaffolding**: Build knowledge progressively from fundamentals to advanced concepts
4. **Active Learning**: Incorporate exercises, examples, and real-world applications
5. **Step-by-Step Progress**: Move forward only after confirming understanding

**INTERACTION FLOW:**
1. **First Message**: Welcome them warmly and ask ONE knowledge assessment question
2. **After Each Response**: 
   - Acknowledge their answer
   - Based on their level, either ask the next assessment question OR start teaching
3. **During Teaching**:
   - Explain ONE concept at a time
   - After explanation, ask ONE question to check understanding
   - Wait for response before moving to next concept
4. **Never Overwhelm**: Don't provide long lists, syllabi, or multiple questions at once

**COMMUNICATION STYLE:**
- Be conversational, friendly, and encouraging
- Use clear, engaging language appropriate to the user's level
- Keep responses focused and concise
- Ask ONE specific question at the end of each message
- Build rapport through natural dialogue

**PERSONALIZATION:**
- Adapt to different learning styles (visual, auditory, kinesthetic, reading/writing)
- Adjust pace based on user responses
- Provide analogies and examples relevant to their interests
- Celebrate small wins and progress

Remember: You're having a CONVERSATION, not delivering a lecture. One question or concept at a time!`;

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
    }
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
    tempValue: document.getElementById('tempValue')
};

// Check WebGPU support
async function checkWebGPUSupport() {
    if (!navigator.gpu) {
        elements.compatibilityWarning.style.display = 'flex';
        elements.loadingScreen.style.display = 'none';
        return false;
    }
    return true;
}

// Initialize the AI model
async function initializeModel() {
    try {
        updateLoadingStatus('Checking browser compatibility...', 10);
        
        const hasWebGPU = await checkWebGPUSupport();
        if (!hasWebGPU) return;

        updateLoadingStatus('Initializing AI engine...', 20);
        
        // Create engine with progress callback
        state.engine = await webllm.CreateMLCEngine(
            "Phi-3-mini-4k-instruct-q4f16_1-MLC",
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
        }, 500);

    } catch (error) {
        console.error('Failed to initialize model:', error);
        updateLoadingStatus(`Error: ${error.message}`, 0);
        elements.compatibilityWarning.style.display = 'flex';
    }
}

// Update loading status
function updateLoadingStatus(text, percent) {
    elements.loadingStatus.textContent = text;
    elements.loadingProgress.style.width = `${percent}%`;
}

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
    setInterval(updateSessionDuration, 1000);

    // Create initial prompt
    const learningStyle = state.learningPreferences.style;
    const difficulty = state.learningPreferences.difficulty;
    
    const initialPrompt = `I want to learn about: ${topic}

My learning preferences:
- Learning style: ${learningStyle}
- Difficulty level: ${difficulty}

Please start by greeting me warmly and asking me ONE question to assess my current knowledge level about this topic. Keep it conversational and friendly!`;

    // Generate response (don't show this initial prompt to user)
    await generateResponse(initialPrompt, true);
}

// Generate AI response
async function generateResponse(userMessage, isInitialPrompt = false) {
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

        // Add assistant message to UI
        addMessage('assistant', assistantMessage);

        elements.modelStatus.textContent = 'Ready';

    } catch (error) {
        console.error('Error generating response:', error);
        typingDiv.remove();
        addMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
        elements.modelStatus.textContent = 'Error';
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

// Export chat history
function exportChat() {
    if (state.messages.length === 0) {
        alert('No chat history to export!');
        return;
    }

    const chatText = state.messages.map(msg => {
        const role = msg.role === 'user' ? 'You' : 'AI Tutor';
        return `${role}: ${msg.content}\n\n`;
    }).join('');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutor-session-${state.currentTopic || 'chat'}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// New session
function newSession() {
    if (state.messages.length > 0) {
        if (!confirm('Are you sure you want to start a new session? Current progress will be lost.')) {
            return;
        }
    }

    state.messages = [];
    state.currentTopic = null;
    state.sessionStartTime = null;

    elements.chatMessages.innerHTML = '';
    elements.chatMessages.style.display = 'none';
    elements.chatInputContainer.style.display = 'none';
    elements.welcomeScreen.style.display = 'block';
    elements.topicDisplay.style.display = 'none';
    elements.durationDisplay.style.display = 'none';
    elements.topicInput.value = '';
}

// Event listeners
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
    });
});

elements.sendBtn.addEventListener('click', () => {
    const message = elements.chatInput.value.trim();
    if (message) {
        generateResponse(message);
        elements.chatInput.value = '';
    }
});

elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = elements.chatInput.value.trim();
        if (message) {
            generateResponse(message);
            elements.chatInput.value = '';
        }
    }
});

elements.newSessionBtn.addEventListener('click', newSession);
elements.exportBtn.addEventListener('click', exportChat);

// Learning preferences
elements.learningStyle.addEventListener('change', (e) => {
    state.learningPreferences.style = e.target.value;
});

elements.difficultyLevel.addEventListener('change', (e) => {
    state.learningPreferences.difficulty = e.target.value;
});

elements.temperature.addEventListener('input', (e) => {
    state.settings.temperature = parseFloat(e.target.value);
    elements.tempValue.textContent = e.target.value;
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initializeModel();
});
