// Voice AI Widget - Premium Embeddable Script
// Optimized for performance, low latency, and premium glassmorphism UI

(function () {
    'use strict';

    // 1. Initial Configuration & Default Tokens
    const config = {
        vapiPublicKey: window.VOICE_WIDGET_CONFIG?.vapiPublicKey || '3413ee7b-c5f5-4dc3-93f1-a2185da2aa15',
        assistantId: window.VOICE_WIDGET_CONFIG?.assistantId || '',
        orgId: window.VOICE_WIDGET_CONFIG?.orgId || '',
        agentId: window.VOICE_WIDGET_CONFIG?.agentId || '',
        position: window.VOICE_WIDGET_CONFIG?.position || 'bottom-right',
        primaryColor: window.VOICE_WIDGET_CONFIG?.primaryColor || '#6366f1', // Indigo
        secondaryColor: window.VOICE_WIDGET_CONFIG?.secondaryColor || '#a855f7', // Purple
        businessName: window.VOICE_WIDGET_CONFIG?.businessName || 'Voice AI Assistant'
    };

    // 2. Inject Premium CSS
    const styles = `
        :root {
            --vw-primary: ${config.primaryColor};
            --vw-secondary: ${config.secondaryColor};
            --vw-glass: rgba(255, 255, 255, 0.8);
            --vw-glass-border: rgba(255, 255, 255, 0.4);
            --vw-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.2);
        }

        .vw-container {
            position: fixed;
            ${config.position.includes('bottom') ? 'bottom: 24px;' : 'top: 24px;'}
            ${config.position.includes('right') ? 'right: 24px;' : 'left: 24px;'}
            z-index: 2147483647;
            font-family: 'Inter', -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        /* Floating Bubble */
        .vw-bubble {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--vw-primary), var(--vw-secondary));
            border: 4px solid white;
            box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            outline: none;
            padding: 0;
        }

        .vw-bubble:hover {
            transform: scale(1.1) rotate(5deg);
        }

        .vw-bubble svg {
            width: 28px;
            height: 28px;
            color: white;
            transition: transform 0.3s ease;
        }

        .vw-bubble.active {
            animation: vw-pulse 2s infinite;
        }

        @keyframes vw-pulse {
            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); }
            100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }

        /* Widget Panel */
        .vw-panel {
            position: absolute;
            ${config.position.includes('bottom') ? 'bottom: 84px;' : 'top: 84px;'}
            width: 380px;
            height: 480px;
            max-width: calc(100vw - 48px);
            background: var(--vw-glass);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--vw-glass-border);
            border-radius: 24px;
            box-shadow: var(--vw-shadow);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px) scale(0.95);
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        .vw-panel.open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
        }

        .vw-header {
            padding: 24px;
            background: linear-gradient(135deg, var(--vw-primary), var(--vw-secondary));
            color: white;
            position: relative;
        }

        .vw-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .vw-header p {
            margin: 4px 0 0 0;
            font-size: 13px;
            opacity: 0.9;
        }

        .vw-close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: all 0.2s;
        }

        .vw-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }

        .vw-body {
            flex: 1;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
        }

        .vw-status-bar {
            width: 100%;
            background: rgba(255, 255, 255, 0.5);
            padding: 12px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .vw-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #94a3b8;
        }

        .vw-indicator.ready { background: #22c55e; }
        .vw-indicator.active { 
            background: #22c55e; 
            box-shadow: 0 0 8px #22c55e;
            animation: vw-blink 1.5s infinite;
        }

        @keyframes vw-blink {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .vw-status-text {
            font-size: 14px;
            color: #475569;
            font-weight: 500;
        }

        .vw-visualizer-container {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        canvas#vwVisualizer {
            width: 100%;
            height: 100%;
            max-height: 200px;
        }

        .vw-controls {
            width: 100%;
            padding-top: 20px;
        }

        .vw-btn-main {
            width: 100%;
            padding: 16px;
            border-radius: 16px;
            border: none;
            background: linear-gradient(135deg, var(--vw-primary), var(--vw-secondary));
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .vw-btn-main:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px -10px rgba(99, 102, 241, 0.6);
        }

        .vw-btn-main:active {
            transform: scale(0.98);
        }

        .vw-btn-main.danger {
            background: linear-gradient(135deg, #f43f5e, #e11d48);
            box-shadow: 0 10px 20px -5px rgba(244, 63, 94, 0.4);
        }

        .vw-hidden { display: none !important; }

        @media (max-width: 480px) {
            .vw-panel {
                bottom: 0px;
                right: 0px;
                width: 100vw;
                height: 100vh;
                max-width: none;
                border-radius: 0;
                top: 0;
                left: 0;
            }
            .vw-container { bottom: 16px; right: 16px; }
        }
    `;

    // 3. Controller Class
    class VoiceWidget {
        constructor() {
            this.isOpen = false;
            this.status = 'disconnected';
            this.vapi = null;
            this.currentVolume = 0;
            this.animationId = null;

            this.init();
        }

        async init() {
            this.injectStyles();
            this.render();
            this.cacheElements();
            this.bindEvents();
            await this.loadSDK();
        }

        injectStyles() {
            const head = document.head || document.getElementsByTagName('head')[0];
            const style = document.createElement('style');
            style.appendChild(document.createTextNode(styles));
            head.appendChild(style);
        }

        render() {
            const container = document.createElement('div');
            container.className = 'vw-container';
            container.setAttribute('id', 'vwContainer');
            
            container.innerHTML = `
                <div class="vw-panel" id="vwPanel">
                    <div class="vw-header">
                        <button class="vw-close-btn" id="vwCloseBtn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <h2>${config.businessName}</h2>
                        <p id="vwHeaderSubtext">AI Voice Interaction</p>
                    </div>
                    <div class="vw-body">
                        <div class="vw-status-bar">
                            <div class="vw-indicator" id="vwIndicator"></div>
                            <span class="vw-status-text" id="vwStatusText">Connecting...</span>
                        </div>
                        <div class="vw-visualizer-container">
                            <canvas id="vwVisualizer"></canvas>
                        </div>
                        <div class="vw-controls">
                            <button class="vw-btn-main" id="vwToggleBtn">
                                <svg id="vwToggleIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                <span id="vwBtnText">Start Voice Call</span>
                            </button>
                        </div>
                    </div>
                </div>
                <button class="vw-bubble" id="vwBubble">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                </button>
            `;
            document.body.appendChild(container);
        }

        cacheElements() {
            this.container = document.getElementById('vwContainer');
            this.panel = document.getElementById('vwPanel');
            this.bubble = document.getElementById('vwBubble');
            this.closeBtn = document.getElementById('vwCloseBtn');
            this.toggleBtn = document.getElementById('vwToggleBtn');
            this.statusText = document.getElementById('vwStatusText');
            this.indicator = document.getElementById('vwIndicator');
            this.btnText = document.getElementById('vwBtnText');
            this.toggleIcon = document.getElementById('vwToggleIcon');
            this.canvas = document.getElementById('vwVisualizer');
            this.ctx = this.canvas.getContext('2d');
        }

        bindEvents() {
            this.bubble.addEventListener('click', () => this.togglePanel());
            this.closeBtn.addEventListener('click', () => this.togglePanel());
            this.toggleBtn.addEventListener('click', () => this.handleToggleCall());
            
            window.addEventListener('resize', () => this.setupCanvas());
        }

        setupCanvas() {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }

        async loadSDK() {
            try {
                const module = await import('https://esm.sh/@vapi-ai/web?bundle');
                const VapiClass = module.default;
                
                this.vapi = new VapiClass(config.vapiPublicKey);
                this.setupVapiListeners();
                this.updateUI('disconnected');
            } catch (err) {
                console.error('[VoiceWidget] SDK Load Failed:', err);
                this.statusText.textContent = 'Service unavailable';
            }
        }

        setupVapiListeners() {
            if (!this.vapi) return;
            this.vapi.on('call-start', () => this.updateUI('connected'));
            this.vapi.on('call-end', () => this.updateUI('disconnected'));
            this.vapi.on('volume-level', (v) => { this.currentVolume = v; });
            this.vapi.on('error', (e) => {
                console.error('[VoiceWidget] Vapi Error:', e);
                this.updateUI('disconnected');
            });
        }

        togglePanel() {
            this.isOpen = !this.isOpen;
            this.panel.classList.toggle('open', this.isOpen);
            if (this.isOpen) {
                setTimeout(() => this.setupCanvas(), 200);
                this.startAnimation();
            } else {
                this.stopAnimation();
            }
        }

        async handleToggleCall() {
            if (this.status === 'connected') {
                this.vapi.stop();
            } else {
                this.updateUI('connecting');
                try {
                    await this.vapi.start(config.assistantId);
                } catch (e) {
                    console.error('[VoiceWidget] Start failed:', e);
                    this.updateUI('disconnected');
                }
            }
        }

        updateUI(status) {
            this.status = status;
            
            switch (status) {
                case 'connected':
                    this.indicator.className = 'vw-indicator active';
                    this.statusText.textContent = 'Connected - Listening...';
                    this.btnText.textContent = 'End Call';
                    this.toggleBtn.classList.add('danger');
                    this.bubble.classList.add('active');
                    this.toggleIcon.innerHTML = '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line>';
                    break;
                case 'connecting':
                    this.indicator.className = 'vw-indicator';
                    this.statusText.textContent = 'Connecting...';
                    this.btnText.textContent = 'Please wait...';
                    break;
                case 'disconnected':
                    this.indicator.className = 'vw-indicator ready';
                    this.statusText.textContent = 'Ready to assist you';
                    this.btnText.textContent = 'Start Voice Call';
                    this.toggleBtn.classList.remove('danger');
                    this.bubble.classList.remove('active');
                    this.toggleIcon.innerHTML = '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>';
                    break;
            }
        }

        startAnimation() {
            let smoothedVolume = 0;
            const draw = () => {
                if (!this.ctx || !this.isOpen) return;
                
                const w = this.canvas.width;
                const h = this.canvas.height;
                const cx = w / 2;
                const cy = h / 2;

                smoothedVolume += (this.currentVolume - smoothedVolume) * 0.15;
                if (this.status !== 'connected') smoothedVolume = 0;

                this.ctx.clearRect(0, 0, w, h);

                const layers = [
                    { r: 40 + smoothedVolume * 150, alpha: 0.1, color: config.primaryColor },
                    { r: 35 + smoothedVolume * 80, alpha: 0.3, color: config.secondaryColor },
                    { r: 30, alpha: 1, color: config.primaryColor }
                ];

                layers.forEach(layer => {
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, Math.max(1, layer.r), 0, Math.PI * 2);
                    this.ctx.fillStyle = layer.color;
                    this.ctx.globalAlpha = layer.alpha;
                    this.ctx.fill();
                });

                if (this.status === 'connected') {
                    this.ctx.globalAlpha = 0.4;
                    this.ctx.strokeStyle = config.primaryColor;
                    this.ctx.lineWidth = 2;
                    for (let i = 1; i <= 2; i++) {
                        this.ctx.beginPath();
                        const r = 30 + (i * 20) + (Math.sin(Date.now() / 200 + i) * 8);
                        this.ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                }

                this.ctx.globalAlpha = 1;
                this.animationId = requestAnimationFrame(draw);
            };
            draw();
        }

        stopAnimation() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }
    }

    if (document.readyState === 'complete') {
        new VoiceWidget();
    } else {
        window.addEventListener('load', () => new VoiceWidget());
    }
})();
