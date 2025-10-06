# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Personal Tutor is a **100% client-side** browser application that runs large language models locally using WebLLM. The entire AI inference happens in the user's browser with zero server communication (except initial model download).

**Core Architecture Principle**: Privacy-first design - no API keys, no backend, no data collection. Everything runs locally.

## Development Setup

### Running Locally

```bash
# Serve the app locally (required for CORS and ES modules)
python -m http.server 8000
# or
npx serve

# Open browser to http://localhost:8000
```

**Important**: Must use a local server (not file://). Direct file opening breaks ES module imports and WebLLM.

### Testing Requirements

- **Browser**: Chrome 113+, Edge 113+, or Opera 99+ (WebGPU required)
- **Hardware**: 8GB+ RAM minimum, dedicated GPU recommended
- **First Load**: Expect 5-10 minutes for ~2.4GB model download
- **WebGPU Check**: Visit https://webgpureport.org/ to verify support

## Architecture

### Core Files (Production)

- **index.html**: Main UI, PWA manifest, service worker registration
- **app.js**: Application logic, WebLLM integration, state management (886 lines)
- **styles.css**: CSS variables, responsive design, accessibility styles
- **sw.js**: Service worker for PWA (caches app shell, excludes model files)
- **manifest.json**: PWA configuration

### Advanced Modules (Not Integrated)

Three standalone enhancement modules exist but are NOT currently wired into the main app:

- **model-worker.js**: Web Worker for non-blocking AI generation with streaming
- **lesson-system.js**: Structured 20-30 min lessons + SRS flashcards (SM-2 algorithm)
- **voice-system.js**: Speech recognition, TTS, math rendering (KaTeX), code copy buttons

See INTEGRATION_GUIDE.md for how to integrate these.

### WebLLM Integration

**Current Model** (app.js line 312):
```javascript
"Llama-3-8B-Instruct-q4f16_1-MLC"  // Upgraded from Phi-3-mini for better instruction-following
```

**Model Loading Flow**:
1. `initializeModel()` creates engine via `webllm.CreateMLCEngine()`
2. Progress callback updates loading UI (percentage, status text)
3. First load downloads ~2.4GB to browser cache (IndexedDB)
4. Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)

**Response Generation** (app.js lines 505-574):
- Messages include system prompt + last 10 conversation turns (context window management)
- Temperature controlled via sidebar slider (default 0.7)
- Max tokens: 1500 per response
- Retry logic: 2 attempts on failure

### System Prompt Engineering

The `SYSTEM_PROMPT` (app.js lines 4-45) is carefully designed to enforce:
- Exactly ONE question per response (critical for conversational flow)
- Balance between assessment (2-3 questions) and teaching
- Substantive explanations (3-4 sentences with examples)
- Auto-switch to teaching mode for beginners or after 2-3 Q&A exchanges
- No hypothetical dialogue, no "(wait for response)" text

**Recent Focus**: Multiple commits refining the prompt to improve teaching quality and prevent endless assessment loops.

### State Management

Application state (app.js lines 56-69):
```javascript
state = {
    engine: null,              // WebLLM engine instance
    messages: [],              // Conversation history
    currentTopic: null,        // Active learning topic
    sessionStartTime: null,    // For duration tracking
    learningPreferences: {},   // Style, difficulty
    settings: {},              // Temperature, etc.
    durationTimer: null        // Interval ID
}
```

### Local Storage Persistence

Four localStorage keys (app.js line 48):
- `ai_tutor_session`: Full conversation, auto-saves every 30s, 24h retention
- `ai_tutor_preferences`: Learning style, difficulty level
- `ai_tutor_settings`: Temperature slider value
- `ai_tutor_install_dismissed`: PWA install banner dismissal

**Session Restoration**: On reload, prompts user to restore if session < 24 hours old.

### PWA Architecture

**Service Worker Strategy** (sw.js):
- **App Shell** (HTML/CSS/JS): Cache-first strategy for instant offline loading
- **Model Files** (~2.4GB): NOT cached by service worker, relies on browser HTTP cache
- **Other Resources**: Network-first with cache fallback

**Why Not Cache Model Files**:
- Too large for Service Worker Cache API (~2.4GB)
- Browser's IndexedDB handles WebLLM model caching automatically
- Service worker focuses on fast app shell loading

**Cache Versioning**: Increment `CACHE_VERSION` in sw.js when updating app shell files.

## Key Implementation Patterns

### Error Handling Pattern

All async operations use retry logic with exponential backoff:
```javascript
async function initializeModel(retryCount = 0) {
    const maxRetries = 3;
    try {
        // attempt operation
    } catch (error) {
        if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => initializeModel(retryCount + 1), delay);
        }
    }
}
```

### Message Formatting

Messages support basic markdown (app.js lines 625-655):
- Code blocks: ` ```code``` `
- Inline code: `` `code` ``
- Bold: `**text**`
- Italic: `*text*`
- Links: `[text](url)`

### Export Functionality

Dual-format export (app.js lines 662-719):
- **JSON**: Structured data with metadata (topic, duration, preferences, messages)
- **TXT**: Human-readable transcript

Both include timestamp and privacy notice.

## Customization Points

### Changing AI Model

Edit app.js line 312:
```javascript
// Options from WebLLM model list
"Llama-3-8B-Instruct-q4f16_1-MLC"      // Current (better instruction-following)
"Phi-3-mini-4k-instruct-q4f16_1-MLC"   // Previous (smaller, faster)
"TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC" // Smallest (faster but lower quality)
```

See https://github.com/mlc-ai/web-llm#models for full model list.

### Modifying Teaching Behavior

Edit `SYSTEM_PROMPT` in app.js lines 4-45. Key variables:
- Number of assessment questions before teaching (currently 2-3)
- Length of explanations (currently 3-4 sentences)
- Example format and detail level

### UI Theming

CSS variables in styles.css (lines 8-21):
```css
:root {
    --primary-color: #4299e1;
    --background: #fafbfc;
    --text-primary: #2d3748;
    /* etc. */
}
```

## Deployment

### GitHub Pages Deployment

1. Push code to `main` branch
2. Settings → Pages → Deploy from branch → `main` → `/` root
3. Wait 1-2 minutes for deployment
4. Access at: `https://username.github.io/personal_tutor_app/`

**No build step required** - all files are static.

See GITHUB_PAGES_DEPLOYMENT.md for detailed instructions.

### Important for Deployment

- **Paths**: All asset paths are absolute from root (e.g., `/manifest.json`, `/app.js`)
- **Service Worker**: Must be served from same origin as app
- **HTTPS Required**: PWA features require HTTPS (GitHub Pages provides this)

## Browser Compatibility

**WebGPU is non-negotiable** - the app cannot function without it.

Compatibility check (app.js lines 288-295):
```javascript
if (!navigator.gpu) {
    // Show compatibility warning, hide app
    elements.compatibilityWarning.style.display = 'flex';
    return false;
}
```

## Advanced Features (Future Integration)

Three advanced modules exist but require integration work:

1. **Web Worker** (model-worker.js): Offload AI to background thread for responsive UI
2. **Lesson System** (lesson-system.js): Structured learning with progress tracking, quizzes, SRS flashcards
3. **Voice & Content** (voice-system.js): Speech I/O, math rendering (KaTeX), code highlighting

These are production-ready but not connected to the UI. See INTEGRATION_GUIDE.md for implementation details.

## Educational Philosophy

The teaching approach follows proven pedagogical principles:
- **Socratic Method**: Learning through guided questions
- **Scaffolding**: Building from fundamentals
- **Active Learning**: Hands-on practice
- **Adaptive Difficulty**: Adjusts to user level

The system prompt enforces this philosophy programmatically.

## Privacy & Security

**Critical Design Constraint**: No data ever leaves the user's device.

- No analytics/telemetry
- No API calls (except initial model download from esm.run CDN)
- No user accounts or authentication
- All processing in browser via WebGPU
- LocalStorage for persistence (user-controlled)

When adding features, maintain this zero-server architecture.

## Common Development Tasks

### Testing Model Changes

1. Edit model name in app.js line 312
2. Clear browser cache (model files are cached)
3. Reload page and wait for new model download
4. Test with various topics and difficulty levels

### Testing PWA Features

1. Deploy to HTTPS server (localhost doesn't support all PWA features)
2. Open DevTools → Application → Service Workers
3. Test offline mode: check "Offline" in Network tab
4. Test install: look for install prompt in address bar

### Debugging WebLLM Issues

- Open browser console for WebLLM logs
- Check `state.engine` is not null after initialization
- Verify WebGPU: `await navigator.gpu.requestAdapter()`
- Check IndexedDB for cached model files

### Modifying Session Persistence

Auto-save interval (app.js line 869):
```javascript
setInterval(() => {
    if (state.messages.length > 0) {
        saveSession();
    }
}, 30000); // 30 seconds
```

Session age limit (app.js line 169):
```javascript
const age = Date.now() - (parsed.lastUpdated || 0);
if (age < 24 * 60 * 60 * 1000) { // 24 hours
    return parsed;
}
```
