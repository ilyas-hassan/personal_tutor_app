// Web Worker for AI Model Operations
// Runs model inference in background thread to keep UI responsive

importScripts('https://esm.sh/@mlc-ai/web-llm');

let engine = null;
let isInitialized = false;

// Handle messages from main thread
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;
    
    try {
        switch (type) {
            case 'INIT_MODEL':
                await initializeModel(data);
                break;
                
            case 'GENERATE':
                await generateResponse(data);
                break;
                
            case 'CANCEL':
                // Future: implement cancellation
                self.postMessage({ type: 'CANCELLED' });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
});

// Initialize the AI model
async function initializeModel({ modelId, progressCallback = true }) {
    if (isInitialized) {
        self.postMessage({ type: 'ALREADY_INITIALIZED' });
        return;
    }
    
    try {
        self.postMessage({
            type: 'INIT_PROGRESS',
            progress: { progress: 0.1, text: 'Initializing Web Worker...' }
        });
        
        // Create engine with progress tracking
        const { CreateMLCEngine } = await import('https://esm.sh/@mlc-ai/web-llm');
        
        engine = await CreateMLCEngine(
            modelId || "Phi-3-mini-4k-instruct-q4f16_1-MLC",
            {
                initProgressCallback: (progress) => {
                    if (progressCallback) {
                        self.postMessage({
                            type: 'INIT_PROGRESS',
                            progress: {
                                progress: progress.progress,
                                text: progress.text
                            }
                        });
                    }
                }
            }
        );
        
        isInitialized = true;
        
        self.postMessage({
            type: 'INIT_COMPLETE',
            message: 'Model initialized successfully'
        });
        
    } catch (error) {
        self.postMessage({
            type: 'INIT_ERROR',
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
}

// Generate AI response
async function generateResponse({ messages, temperature = 0.7, maxTokens = 1500, stream = false }) {
    if (!isInitialized || !engine) {
        throw new Error('Model not initialized');
    }
    
    try {
        self.postMessage({ type: 'GENERATION_START' });
        
        if (stream) {
            // Streaming response (token by token)
            const chunks = await engine.chat.completions.create({
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: true
            });
            
            let fullResponse = '';
            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    self.postMessage({
                        type: 'STREAM_CHUNK',
                        chunk: content,
                        fullResponse
                    });
                }
            }
            
            self.postMessage({
                type: 'GENERATION_COMPLETE',
                response: fullResponse
            });
            
        } else {
            // Single response
            const response = await engine.chat.completions.create({
                messages,
                temperature,
                max_tokens: maxTokens
            });
            
            const content = response.choices[0].message.content;
            
            self.postMessage({
                type: 'GENERATION_COMPLETE',
                response: content
            });
        }
        
    } catch (error) {
        self.postMessage({
            type: 'GENERATION_ERROR',
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
}

// Worker ready
self.postMessage({ type: 'WORKER_READY' });
