// Voice AI Widget - Embeddable Script
// This script can be embedded on any website to add a floating voice assistant

(function () {
    'use strict';

    // Widget Configuration
    const config = {
        vapiPublicKey: window.VOICE_WIDGET_CONFIG?.vapiPublicKey || '',
        assistantId: window.VOICE_WIDGET_CONFIG?.assistantId || '',
        orgId: window.VOICE_WIDGET_CONFIG?.orgId || null,
        agentId: window.VOICE_WIDGET_CONFIG?.agentId || null,
        position: window.VOICE_WIDGET_CONFIG?.position || 'bottom-right', // bottom-right, bottom-left, top-right, top-left
        primaryColor: window.VOICE_WIDGET_CONFIG?.primaryColor || '#667eea',
        secondaryColor: window.VOICE_WIDGET_CONFIG?.secondaryColor || '#764ba2'
    };

    // Inject CSS
    const styles = `
        .voice-widget-container {
            position: fixed;
            ${config.position.includes('bottom') ? 'bottom: 24px;' : 'top: 24px;'}
            ${config.position.includes('right') ? 'right: 24px;' : 'left: 24px;'}
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .voice-widget-button {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        .voice-widget-button:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
        }
        .voice-widget-button.active {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            animation: voice-widget-pulse 2s infinite;
        }
        @keyframes voice-widget-pulse {
            0%, 100% { box-shadow: 0 8px 24px rgba(245, 87, 108, 0.4); }
            50% { box-shadow: 0 8px 32px rgba(245, 87, 108, 0.8); }
        }
        .voice-widget-icon {
            width: 32px;
            height: 32px;
            color: white;
        }
        .voice-widget-panel {
            position: absolute;
            ${config.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
            ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
            width: 360px;
            max-width: calc(100vw - 48px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: all 0.3s ease;
        }
        .voice-widget-panel.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }
        .voice-widget-header {
            padding: 20px;
            background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
            border-radius: 16px 16px 0 0;
            color: white;
        }
        .voice-widget-header h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
        }
        .voice-widget-header p {
            margin: 0;
            font-size: 13px;
            opacity: 0.9;
        }
        .voice-widget-body {
            padding: 24px;
        }
        .voice-widget-status {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 12px;
            margin-bottom: 16px;
        }
        .voice-widget-status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #94a3b8;
        }
        .voice-widget-status-indicator.active {
            background: #22c55e;
            animation: voice-widget-blink 1.5s infinite;
        }
        @keyframes voice-widget-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .voice-widget-status-text {
            font-size: 14px;
            color: #475569;
            font-weight: 500;
        }
        .voice-widget-action {
            width: 100%;
            padding: 14px 24px;
            border-radius: 10px;
            border: none;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .voice-widget-action.primary {
            background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
            color: white;
        }
        .voice-widget-action.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        }
        .voice-widget-action.danger {
            background: #fee2e2;
            color: #dc2626;
            margin-top: 8px;
        }
        .voice-widget-action.danger:hover {
            background: #fecaca;
        }
        .voice-widget-visualizer {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            height: 60px;
            margin: 16px 0;
        }
        .voice-widget-bar {
            width: 4px;
            background: linear-gradient(to top, ${config.primaryColor}, ${config.secondaryColor});
            border-radius: 2px;
            transition: height 0.1s ease;
        }
        .voice-widget-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .voice-widget-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        @media (max-width: 480px) {
            .voice-widget-container {
                bottom: 16px;
                right: 16px;
            }
            .voice-widget-button {
                width: 56px;
                height: 56px;
            }
            .voice-widget-icon {
                width: 28px;
                height: 28px;
            }
        }
    `;

    // Inject styles into page
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Create widget HTML
    const widgetHTML = `
        <div class="voice-widget-container" id="voiceWidget">
            <button class="voice-widget-button" id="voiceWidgetBtn" aria-label="Voice Assistant">
                <svg class="voice-widget-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
            </button>
            <div class="voice-widget-panel" id="voiceWidgetPanel">
                <div class="voice-widget-header">
                    <button class="voice-widget-close" id="voiceWidgetClose" aria-label="Close">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    <h3>Voice AI Assistant</h3>
                    <p>Click to start a conversation</p>
                </div>
                <div class="voice-widget-body">
                    <div class="voice-widget-status">
                        <div class="voice-widget-status-indicator" id="voiceWidgetStatusIndicator"></div>
                        <span class="voice-widget-status-text" id="voiceWidgetStatusText">Ready to assist you</span>
                    </div>
                    <div class="voice-widget-visualizer" id="voiceWidgetVisualizer" style="display: none;">
                        <div class="voice-widget-bar" style="height: 20px;"></div>
                        <div class="voice-widget-bar" style="height: 35px;"></div>
                        <div class="voice-widget-bar" style="height: 25px;"></div>
                        <div class="voice-widget-bar" style="height: 40px;"></div>
                        <div class="voice-widget-bar" style="height: 30px;"></div>
                        <div class="voice-widget-bar" style="height: 45px;"></div>
                        <div class="voice-widget-bar" style="height: 25px;"></div>
                    </div>
                    <button class="voice-widget-action primary" id="voiceWidgetStartBtn">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                        Start Voice Call
                    </button>
                    <button class="voice-widget-action danger" id="voiceWidgetEndBtn" style="display: none;">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27 11.36 11.36 0 004.25.86 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.86 4.25 1 1 0 01-.27 1.11l-2.2 2.2z"></path>
                        </svg>
                        End Call
                    </button>
                </div>
            </div>
        </div>
    `;

    // Wait for DOM to be ready
    function initWidget() {
        // Inject widget HTML
        const container = document.createElement('div');
        container.innerHTML = widgetHTML;
        document.body.appendChild(container.firstElementChild);

        // Initialize widget functionality
        const widget = new VoiceWidgetController(config);
    }

    // Voice Widget Controller
    class VoiceWidgetController {
        constructor(config) {
            this.config = config;
            this.isOpen = false;
            this.isActive = false;
            this.vapi = null;

            this.initElements();
            this.initVapi();
            this.attachListeners();
        }

        initElements() {
            this.btn = document.getElementById('voiceWidgetBtn');
            this.panel = document.getElementById('voiceWidgetPanel');
            this.closeBtn = document.getElementById('voiceWidgetClose');
            this.startBtn = document.getElementById('voiceWidgetStartBtn');
            this.endBtn = document.getElementById('voiceWidgetEndBtn');
            this.statusIndicator = document.getElementById('voiceWidgetStatusIndicator');
            this.statusText = document.getElementById('voiceWidgetStatusText');
            this.visualizer = document.getElementById('voiceWidgetVisualizer');
        }

        async initVapi() {
            // Load VAPI SDK if not already loaded
            if (!window.Vapi) {
                await this.loadVapiSDK();
            }

            if (window.Vapi && this.config.vapiPublicKey) {
                this.vapi = new window.Vapi(this.config.vapiPublicKey);
                this.setupVapiListeners();
            }
        }

        loadVapiSDK() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        setupVapiListeners() {
            if (!this.vapi) return;

            this.vapi.on('call-start', () => {
                this.updateStatus('active', 'Connected - Listening...');
                this.isActive = true;
                this.btn.classList.add('active');
                this.startBtn.style.display = 'none';
                this.endBtn.style.display = 'flex';
                this.visualizer.style.display = 'flex';
                this.animateVisualizer();
            });

            this.vapi.on('call-end', () => {
                this.updateStatus('ready', 'Call ended');
                this.isActive = false;
                this.btn.classList.remove('active');
                this.startBtn.style.display = 'flex';
                this.endBtn.style.display = 'none';
                this.visualizer.style.display = 'none';
                setTimeout(() => {
                    this.updateStatus('ready', 'Ready to assist you');
                }, 2000);
            });

            this.vapi.on('speech-start', () => {
                this.updateStatus('active', 'Listening to you...');
            });

            this.vapi.on('speech-end', () => {
                this.updateStatus('active', 'Processing...');
            });

            this.vapi.on('error', (error) => {
                console.error('VAPI Error:', error);
                this.updateStatus('error', 'Connection error');
            });
        }

        attachListeners() {
            this.btn.addEventListener('click', () => this.togglePanel());
            this.closeBtn.addEventListener('click', () => this.closePanel());
            this.startBtn.addEventListener('click', () => this.startCall());
            this.endBtn.addEventListener('click', () => this.endCall());

            document.addEventListener('click', (e) => {
                if (this.isOpen && !e.target.closest('.voice-widget-container')) {
                    this.closePanel();
                }
            });
        }

        togglePanel() {
            this.isOpen = !this.isOpen;
            this.panel.classList.toggle('open', this.isOpen);
        }

        closePanel() {
            this.isOpen = false;
            this.panel.classList.remove('open');
        }

        async startCall() {
            if (!this.vapi) {
                alert('Voice assistant is not configured.');
                return;
            }

            try {
                this.updateStatus('connecting', 'Connecting...');
                await this.vapi.start(this.config.assistantId);
            } catch (error) {
                console.error('Failed to start call:', error);
                this.updateStatus('error', 'Failed to connect');
                setTimeout(() => {
                    this.updateStatus('ready', 'Ready to assist you');
                }, 2000);
            }
        }

        async endCall() {
            if (this.vapi) {
                this.vapi.stop();
            }
        }

        updateStatus(state, text) {
            this.statusText.textContent = text;
            this.statusIndicator.className = 'voice-widget-status-indicator';
            if (state === 'active' || state === 'connecting') {
                this.statusIndicator.classList.add('active');
            }
        }

        animateVisualizer() {
            if (!this.isActive) return;

            const bars = this.visualizer.querySelectorAll('.voice-widget-bar');
            bars.forEach(bar => {
                const height = Math.random() * 40 + 10;
                bar.style.height = `${height}px`;
            });

            setTimeout(() => this.animateVisualizer(), 150);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
