// Voice Input/Output System
// Web Speech API for voice commands and text-to-speech

export class VoiceSystem {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.settings = {
            language: 'en-US',
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            voice: null
        };
        
        this.initializeRecognition();
        this.loadSettings();
    }
    
    // Initialize speech recognition
    initializeRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.settings.language;
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.onListeningStart?.();
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.onListeningEnd?.();
        };
        
        this.recognition.onerror = (event) => {
            this.isListening = false;
            this.onError?.(event.error);
        };
        
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            if (interimTranscript) {
                this.onInterimResult?.(interimTranscript);
            }
            
            if (finalTranscript) {
                this.onFinalResult?.(finalTranscript);
            }
        };
    }
    
    // Load settings from localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('ai_tutor_voice_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load voice settings:', error);
        }
    }
    
    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('ai_tutor_voice_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save voice settings:', error);
        }
    }
    
    // Start listening
    startListening() {
        if (!this.recognition) {
            throw new Error('Speech recognition not supported');
        }
        
        if (this.isListening) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
        }
    }
    
    // Stop listening
    stopListening() {
        if (!this.recognition || !this.isListening) return;
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Failed to stop recognition:', error);
        }
    }
    
    // Speak text
    speak(text, options = {}) {
        if (!this.synthesis) {
            throw new Error('Speech synthesis not supported');
        }
        
        // Stop current speech
        if (this.isSpeaking) {
            this.stopSpeaking();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply settings
        utterance.rate = options.rate || this.settings.rate;
        utterance.pitch = options.pitch || this.settings.pitch;
        utterance.volume = options.volume || this.settings.volume;
        utterance.lang = options.language || this.settings.language;
        
        // Set voice
        const voices = this.synthesis.getVoices();
        if (this.settings.voice) {
            const selectedVoice = voices.find(v => v.name === this.settings.voice);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }
        
        utterance.onstart = () => {
            this.isSpeaking = true;
            this.onSpeakStart?.();
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            this.onSpeakEnd?.();
        };
        
        utterance.onerror = (event) => {
            this.isSpeaking = false;
            this.onError?.(event.error);
        };
        
        this.synthesis.speak(utterance);
    }
    
    // Stop speaking
    stopSpeaking() {
        if (!this.synthesis) return;
        
        this.synthesis.cancel();
        this.isSpeaking = false;
    }
    
    // Pause speaking
    pauseSpeaking() {
        if (!this.synthesis || !this.isSpeaking) return;
        
        this.synthesis.pause();
    }
    
    // Resume speaking
    resumeSpeaking() {
        if (!this.synthesis) return;
        
        this.synthesis.resume();
    }
    
    // Get available voices
    getVoices() {
        if (!this.synthesis) return [];
        
        return this.synthesis.getVoices();
    }
    
    // Set voice by name
    setVoice(voiceName) {
        const voices = this.getVoices();
        const voice = voices.find(v => v.name === voiceName);
        
        if (voice) {
            this.settings.voice = voiceName;
            this.saveSettings();
            return true;
        }
        
        return false;
    }
    
    // Set speech rate (0.1 - 10)
    setRate(rate) {
        this.settings.rate = Math.max(0.1, Math.min(10, rate));
        this.saveSettings();
    }
    
    // Set speech pitch (0 - 2)
    setPitch(pitch) {
        this.settings.pitch = Math.max(0, Math.min(2, pitch));
        this.saveSettings();
    }
    
    // Set volume (0 - 1)
    setVolume(volume) {
        this.settings.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }
    
    // Change language
    setLanguage(language) {
        this.settings.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
        this.saveSettings();
    }
    
    // Check if speech recognition is supported
    isRecognitionSupported() {
        return !!this.recognition;
    }
    
    // Check if speech synthesis is supported
    isSynthesisSupported() {
        return !!this.synthesis;
    }
}

// Content Enhancement Module
export class ContentEnhancer {
    constructor() {
        this.mathRenderer = null;
        this.codeHighlighter = null;
    }
    
    // Initialize math rendering (using KaTeX or MathJax if available)
    initMathRendering() {
        // Check if KaTeX is loaded
        if (window.katex) {
            this.mathRenderer = 'katex';
            return true;
        }
        
        // Check if MathJax is loaded
        if (window.MathJax) {
            this.mathRenderer = 'mathjax';
            return true;
        }
        
        console.warn('No math rendering library found. Install KaTeX or MathJax for LaTeX support.');
        return false;
    }
    
    // Render LaTeX math in text
    renderMath(text) {
        if (!this.mathRenderer) {
            return text; // Return unchanged if no renderer
        }
        
        // Inline math: $...$
        text = text.replace(/\$([^$]+)\$/g, (match, latex) => {
            return this.renderInlineMath(latex);
        });
        
        // Display math: $$...$$
        text = text.replace(/\$\$([^$]+)\$\$/g, (match, latex) => {
            return this.renderDisplayMath(latex);
        });
        
        return text;
    }
    
    // Render inline math
    renderInlineMath(latex) {
        if (this.mathRenderer === 'katex' && window.katex) {
            try {
                return window.katex.renderToString(latex, { throwOnError: false });
            } catch (error) {
                console.error('KaTeX rendering error:', error);
                return `$${latex}$`;
            }
        }
        
        return `<span class="math-inline">$${latex}$</span>`;
    }
    
    // Render display math
    renderDisplayMath(latex) {
        if (this.mathRenderer === 'katex' && window.katex) {
            try {
                return window.katex.renderToString(latex, { 
                    displayMode: true, 
                    throwOnError: false 
                });
            } catch (error) {
                console.error('KaTeX rendering error:', error);
                return `$$${latex}$$`;
            }
        }
        
        return `<div class="math-display">$$${latex}$$</div>`;
    }
    
    // Add copy buttons to code blocks
    addCopyButtons() {
        const codeBlocks = document.querySelectorAll('pre code');
        
        codeBlocks.forEach(block => {
            // Skip if button already exists
            if (block.parentElement.querySelector('.copy-code-btn')) return;
            
            const button = document.createElement('button');
            button.className = 'copy-code-btn';
            button.textContent = '📋 Copy';
            button.setAttribute('aria-label', 'Copy code to clipboard');
            
            button.addEventListener('click', async () => {
                const code = block.textContent;
                
                try {
                    await navigator.clipboard.writeText(code);
                    button.textContent = '✅ Copied!';
                    button.classList.add('copied');
                    
                    setTimeout(() => {
                        button.textContent = '📋 Copy';
                        button.classList.remove('copied');
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy code:', error);
                    button.textContent = '❌ Failed';
                    
                    setTimeout(() => {
                        button.textContent = '📋 Copy';
                    }, 2000);
                }
            });
            
            block.parentElement.style.position = 'relative';
            block.parentElement.appendChild(button);
        });
    }
    
    // Format code with syntax highlighting (basic)
    highlightCode(code, language = 'javascript') {
        // This is a basic implementation
        // For full syntax highlighting, integrate Prism.js or Highlight.js
        
        const keywords = {
            javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export'],
            python: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except'],
            java: ['public', 'private', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while']
        };
        
        const langKeywords = keywords[language] || [];
        let highlighted = code;
        
        // Highlight keywords
        langKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
        });
        
        // Highlight strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        
        // Highlight comments
        highlighted = highlighted.replace(/\/\/.*/g, '<span class="comment">$&</span>');
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
        
        return highlighted;
    }
    
    // Create downloadable content
    createDownloadLink(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    // Format tables from markdown
    formatTable(markdown) {
        const lines = markdown.trim().split('\n');
        if (lines.length < 2) return markdown;
        
        const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
        const separator = lines[1];
        
        if (!separator.includes('---')) return markdown;
        
        let html = '<table class="markdown-table"><thead><tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        for (let i = 2; i < lines.length; i++) {
            const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
            html += '<tr>';
            cells.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        return html;
    }
}
