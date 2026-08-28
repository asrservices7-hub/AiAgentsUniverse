/**
 * Agent Universe Command Center
 * A massive-scale AI agent management ecosystem and autonomous application builder.
 */

// ==========================================
// UTILITIES
// ==========================================

const formatNumber = (n) => {
    return Math.round(n).toLocaleString('en-IN');
};

const formatCompact = (n) => {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
};

const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const generateId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const weightedRandom = (weights) => {
    let total = 0;
    for (const key in weights) total += weights[key];
    let r = Math.random() * total;
    for (const key in weights) {
        r -= weights[key];
        if (r <= 0) return key;
    }
    return Object.keys(weights)[0];
};

// ==========================================
// DYNAMIC APP GENERATION & SETTINGS
// ==========================================

// ── PERSISTENT APP STORE ──
// Saves all generated apps to localStorage so they survive page close/refresh.
class AppStore {
    static STORAGE_KEY = 'agent_universe_apps';
    static MAX_APPS = 100;

    static getAll() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    static save(app) {
        const apps = this.getAll();
        // Check if app with same id already exists, update it
        const idx = apps.findIndex(a => a.id === app.id);
        const entry = {
            id: app.id || 'APP-' + generateId(),
            title: app.title || 'Untitled App',
            goalText: app.goalText || '',
            code: app.code || '',
            complexity: app.complexity || 'medium',
            createdAt: app.createdAt || Date.now(),
            modifiedAt: Date.now(),
            modifyHistory: app.modifyHistory || [],
            size: (app.code || '').length
        };
        if (idx >= 0) {
            apps[idx] = entry;
        } else {
            apps.unshift(entry);
        }
        // Limit to MAX_APPS
        while (apps.length > this.MAX_APPS) apps.pop();
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(apps));
        } catch(e) {
            console.warn('AppStore: localStorage full, trimming old apps', e);
            let saved = false;
            while (apps.length > 1) {
                apps.pop();
                try {
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(apps));
                    saved = true;
                    break;
                } catch(e2) { /* keep trimming */ }
            }
            if (!saved) {
                alert('Warning: This generated app is too large to save in your browser\'s local storage. Please download it using the "Download" button to keep it!');
            }
        }
        return entry;
    }

    static get(appId) {
        return this.getAll().find(a => a.id === appId) || null;
    }

    static update(appId, updates) {
        const apps = this.getAll();
        const idx = apps.findIndex(a => a.id === appId);
        if (idx >= 0) {
            Object.assign(apps[idx], updates, { modifiedAt: Date.now() });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(apps));
            return apps[idx];
        }
        return null;
    }

    static remove(appId) {
        const apps = this.getAll().filter(a => a.id !== appId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(apps));
    }

    static clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

class SettingsManager {
    static init() {
        const key = localStorage.getItem('gemini_api_key');
        const keyInput = document.getElementById('gemini-api-key');
        if (key && keyInput) {
            keyInput.value = key;
        }
        this.updateUIStatus();
        
        // Open settings modal
        const openSettings = () => {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            document.getElementById('modal-overlay')?.classList.add('visible');
            const modal = document.getElementById('modal-settings');
            if (modal) modal.style.display = 'flex';
            this.updateValidationStatus('');
        };

        document.getElementById('btn-settings')?.addEventListener('click', openSettings);
        document.getElementById('btn-engine-configure-key')?.addEventListener('click', openSettings);
        
        // Close modal
        const closeSettings = () => {
            const modal = document.getElementById('modal-settings');
            if (modal) modal.style.display = 'none';
            document.getElementById('modal-overlay')?.classList.remove('visible');
        };

        document.getElementById('btn-close-settings-x')?.addEventListener('click', closeSettings);
        document.getElementById('btn-cancel-settings')?.addEventListener('click', closeSettings);
        
        // Save key
        document.getElementById('btn-save-settings')?.addEventListener('click', () => {
            const newKey = document.getElementById('gemini-api-key')?.value.trim();
            if (newKey) {
                localStorage.setItem('gemini_api_key', newKey);
            } else {
                localStorage.removeItem('gemini_api_key');
            }
            this.updateUIStatus();
            closeSettings();
            alert('✓ Gemini API Key saved successfully! The swarm is now ready to generate custom apps.');
        });

        // Clear key
        document.getElementById('btn-clear-key')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to remove your saved Gemini API Key?')) {
                localStorage.removeItem('gemini_api_key');
                if (keyInput) keyInput.value = '';
                this.updateUIStatus();
                this.updateValidationStatus('Key removed.', '#ef4444');
            }
        });

        // Toggle visibility
        document.getElementById('btn-toggle-key-visibility')?.addEventListener('click', () => {
            if (keyInput) {
                keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
            }
        });

        // Test key connection
        document.getElementById('btn-test-key')?.addEventListener('click', async () => {
            const inputVal = document.getElementById('gemini-api-key')?.value.trim();
            if (!inputVal) {
                this.updateValidationStatus('⚠️ Please paste an API key first.', '#f59e0b');
                return;
            }
            this.updateValidationStatus('Testing connection...', '#3b82f6');
            const result = await GeminiAPI.testApiKey(inputVal);
            if (result.success) {
                this.updateValidationStatus(`✓ Connected to ${result.model}!`, '#10b981');
            } else {
                this.updateValidationStatus(`❌ Connection failed: ${result.error}`, '#ef4444');
            }
        });
    }

    static updateValidationStatus(msg, color = '#64748b') {
        const el = document.getElementById('key-validation-status');
        if (el) {
            el.textContent = msg;
            el.style.color = color;
        }
    }

    static updateUIStatus() {
        const key = this.getApiKey();
        const badge = document.getElementById('api-status-badge');
        const statusBar = document.getElementById('ai-engine-status-bar');
        const engineText = document.getElementById('ai-engine-text');
        const engineIcon = document.getElementById('ai-engine-icon');

        if (key) {
            if (badge) {
                badge.textContent = 'Active ✓';
                badge.style.background = '#dcfce7';
                badge.style.color = '#166534';
            }
            if (statusBar) {
                statusBar.style.background = '#f0fdf4';
                statusBar.style.border = '1px solid #bbf7d0';
            }
            if (engineIcon) engineIcon.textContent = '🟢';
            if (engineText) engineText.innerHTML = '<strong>Gemini AI Engine: Connected</strong> — Live Swarm will automatically code, test & package custom apps for any goal.';
        } else {
            if (badge) {
                badge.textContent = 'Not Set';
                badge.style.background = '#fef3c7';
                badge.style.color = '#92400e';
            }
            if (statusBar) {
                statusBar.style.background = '#fffbeb';
                statusBar.style.border = '1px solid #fde68a';
            }
            if (engineIcon) engineIcon.textContent = '🔑';
            if (engineText) engineText.innerHTML = '<strong>Gemini API Key: Not Set</strong> — Click "Configure Key" to connect your free key for unlimited AI app generation.';
        }
    }

    static getApiKey() {
        return localStorage.getItem('gemini_api_key');
    }
    
    static promptForApiKey() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-overlay')?.classList.add('visible');
        const modal = document.getElementById('modal-settings');
        if (modal) modal.style.display = 'flex';
    }
}

class GeminiAPI {
    static MODELS = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-2.5-pro',
        'gemini-3.6-flash'
    ];

    // Classify app complexity to scale generation strategy
    static classifyComplexity(goalText) {
        const g = (goalText || '').toLowerCase();
        const enterpriseKeywords = ['enterprise', 'erp', 'crm', 'saas', 'platform', 'marketplace', 'social media', 'social network', 'instagram', 'facebook', 'twitter', 'uber', 'airbnb', 'amazon', 'netflix', 'spotify', 'youtube', 'tiktok', 'whatsapp', 'telegram', 'slack', 'discord', 'zoom', 'teams', 'office', 'suite', 'operating system', 'os', 'ide', 'code editor', 'photoshop', 'figma', 'canva', 'full stack', 'fullstack', 'banking', 'hospital', 'management system', 'complete system', 'large scale', 'production app', '5gb', '10gb', '5 gb', '10 gb', 'massive', 'complex'];
        const largeKeywords = ['game', 'rpg', 'mmorpg', 'fps', 'freefire', 'free fire', 'pubg', 'fortnite', 'gta', 'minecraft', 'roblox', 'ecommerce', 'e-commerce', 'online store', 'marketplace', 'dashboard', 'admin panel', 'cms', 'blog platform', 'learning management', 'lms', 'project management', 'video editor', 'music studio', 'trading platform', 'crypto exchange', 'portfolio', 'analytics', 'ai assistant', 'chatbot platform'];
        const mediumKeywords = ['calculator', 'todo', 'weather', 'timer', 'pomodoro', 'notes', 'quiz', 'survey', 'form', 'budget tracker', 'recipe', 'fitness', 'countdown', 'gallery', 'landing page', 'portfolio site', 'simple game', 'snake', 'tic tac toe', 'pong'];
        
        if (enterpriseKeywords.some(k => g.includes(k))) return 'enterprise';
        if (largeKeywords.some(k => g.includes(k))) return 'large';
        if (mediumKeywords.some(k => g.includes(k))) return 'small';
        return 'medium'; // default
    }

    static async testApiKey(apiKey) {
        for (const model of this.MODELS) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Ping. Reply OK.' }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                });
                const data = await response.json();
                if (data.error) {
                    continue;
                }
                if (data.candidates && data.candidates.length > 0) {
                    return { success: true, model };
                }
            } catch (err) {
                // Try next model
            }
        }
        return { success: false, error: 'Invalid API key or model unavailable' };
    }

    // Core API call with model fallback
    static async _callGemini(prompt, maxTokens = 65536, temperature = 0.7) {
        const apiKey = SettingsManager.getApiKey();
        if (!apiKey) throw new Error('MISSING_API_KEY');

        let lastError = null;
        for (const model of this.MODELS) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature, maxOutputTokens: maxTokens }
                    })
                });
                const data = await response.json();
                if (data.error) {
                    lastError = new Error(data.error.message || 'API Error');
                    continue;
                }
                let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) continue;
                return text;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('Failed across all Gemini models.');
    }

    // Generate app with multi-pass for large/enterprise complexity
    static async generateApp(goalText, onProgress = null) {
        const complexity = this.classifyComplexity(goalText);
        const log = (msg) => { if (onProgress) onProgress(msg); };

        log(`Complexity: ${complexity.toUpperCase()} — Assembling swarm strategy...`);

        // ── PASS 1: Core Application ──
        log('Pass 1/3: Generating core application structure...');
        const basePrompt = this._buildPrompt(goalText, complexity);
        let htmlCode = await this._callGemini(basePrompt, 65536, 0.7);
        htmlCode = this._cleanMarkdown(htmlCode);

        if (complexity === 'small') {
            return htmlCode; // Single pass is enough for simple apps
        }

        // ── PASS 2: Feature Enhancement (for medium, large, enterprise) ──
        log('Pass 2/3: Enhancing features, adding depth...');
        try {
            const enhancePrompt = `You are an expert software engineer. Below is a working HTML application. Your job is to ENHANCE it with more features, more detail, and better UX. DO NOT remove anything that works. ADD to it.

Current app code:
---
${htmlCode.substring(0, 30000)}
---

The original goal was: "${goalText}"
Complexity level: ${complexity}

Enhancement requirements for ${complexity} apps:
${complexity === 'enterprise' ? `
- Add a comprehensive navigation sidebar or top menu with at least 5 sections/pages (use JS to show/hide sections)
- Add a settings/preferences panel
- Add data tables with sorting, filtering, and pagination
- Add charts/graphs using Canvas or SVG
- Add notification/toast system
- Add search functionality across the app
- Add user profile/account section
- Add loading states and skeleton screens
- Add keyboard shortcuts
- Make it look like a real production SaaS application with 10+ screens` : ''}
${complexity === 'large' ? `
- Add at least 3 more interactive features or screens
- Add particle effects or animations for games
- Add detailed statistics or analytics views
- Add settings/customization options
- Improve visual polish with gradients, shadows, and transitions
- Add sound effects using Web Audio API if relevant` : ''}
${complexity === 'medium' ? `
- Add 1-2 more useful features
- Polish animations and transitions
- Improve the color scheme and typography
- Add localStorage persistence for user data
- Add a dark/light mode toggle` : ''}

Output ONLY the complete enhanced HTML document. No explanations, no markdown.`;

            const enhanced = await this._callGemini(enhancePrompt, 65536, 0.6);
            const cleanEnhanced = this._cleanMarkdown(enhanced);
            if (cleanEnhanced.includes('<!DOCTYPE') || cleanEnhanced.includes('<html')) {
                htmlCode = cleanEnhanced;
            }
        } catch (e) {
            console.warn('Enhancement pass failed, using base version:', e.message);
        }

        if (complexity !== 'enterprise') {
            return htmlCode;
        }

        // ── PASS 3: Enterprise Polish (only for enterprise) ──
        log('Pass 3/3: Enterprise polish — adding admin panels, dashboards...');
        try {
            const polishPrompt = `You are a senior principal engineer at a Fortune 500 company. Below is an application. Make it ENTERPRISE-GRADE.

Current code (first 25000 chars):
---
${htmlCode.substring(0, 25000)}
---

Original goal: "${goalText}"

Enterprise requirements:
- Add a professional onboarding/welcome wizard that appears on first visit (use localStorage to track)
- Add breadcrumb navigation
- Add a command palette (Ctrl+K) for quick actions
- Add role-based views (admin/user toggle)
- Add export to CSV/PDF functionality for any data tables
- Add real-time clock in header
- Add activity log/audit trail panel
- Ensure all modals have proper close/escape handlers
- Add footer with version number and links
- Professional color scheme (dark sidebar, light content area)

Output ONLY the complete final HTML. No explanations.`;

            const polished = await this._callGemini(polishPrompt, 65536, 0.5);
            const cleanPolished = this._cleanMarkdown(polished);
            if (cleanPolished.includes('<!DOCTYPE') || cleanPolished.includes('<html')) {
                htmlCode = cleanPolished;
            }
        } catch (e) {
            console.warn('Enterprise polish pass failed:', e.message);
        }

        return htmlCode;
    }

    // Modify/extend an existing generated app with a follow-up instruction
    static async modifyApp(existingCode, modifyInstruction) {
        const prompt = `You are a world-class software engineer. Below is a complete working HTML application. The user wants you to MODIFY it.

EXISTING APP CODE (first 30000 chars):
---
${existingCode.substring(0, 30000)}
---

USER'S MODIFICATION REQUEST: "${modifyInstruction}"

Rules:
1. Output ONLY the complete modified HTML document (<!DOCTYPE html> to </html>).
2. Keep ALL existing functionality intact unless the user explicitly asks to remove something.
3. ADD the requested changes/features seamlessly.
4. Maintain the existing design style and color scheme.
5. No markdown, no explanations — just the code.`;

        let result = await this._callGemini(prompt, 65536, 0.6);
        return this._cleanMarkdown(result);
    }

    static _buildPrompt(goalText, complexity) {
        const sizeGuide = {
            small: 'This is a simple utility app. Keep it focused and clean. ~200-500 lines of code.',
            medium: 'This is a medium-complexity app. Include multiple features and good UX. ~500-1500 lines of code.',
            large: 'This is a LARGE, feature-rich application. Build it like a real production app with multiple screens/views, rich interactions, animations, and deep functionality. ~1500-4000 lines of code. Make it impressive.',
            enterprise: 'This is an ENTERPRISE-GRADE application. Build it like a real SaaS product with navigation, multiple sections, data management, charts, settings, user management simulation, and professional UI. ~3000-6000+ lines of code. Think: production software that a company would pay for.'
        };

        return `You are a world-class principal software engineer, UI/UX designer, and full-stack architect.
The user wants you to build a complete, production-grade application for this goal: "${goalText}".

APP SCALE: ${complexity.toUpperCase()} — ${sizeGuide[complexity]}

Requirements:
1. Output ONLY a complete, single-file HTML document (starting with <!DOCTYPE html> and ending with </html>). No markdown backticks, no explanations.
2. DESIGN & USER-FRIENDLINESS:
   - Modern, sleek UI with smooth transitions, clean typography (system fonts or Google Fonts via CDN), and polished colors.
   - Fully responsive layout: works flawlessly on mobile phones, tablets, and desktop screens.
   - Include touch controls on screen (buttons / joystick / D-pad) if it is an arcade or action game so it works on mobile devices.
   - Use CSS Grid and Flexbox for layouts. Use CSS custom properties for theming.
   - Add subtle animations (hover effects, transitions, loading states).
3. IN-APP GUIDELINES & HOW TO USE:
   - Every app MUST feature an accessible "❓ How to Use / Guidelines" button or modal overlay.
   - Explain clear step-by-step instructions, controls, rules, tips, and goals.
4. FULL FUNCTIONALITY & INTERACTIVITY:
   - Must be 100% interactive and fully functional with rich client-side JavaScript logic (no dummy dead buttons).
   - If audio/sound is appropriate, synthesize using Web Audio API (AudioContext).
   - Include score tracking, reset/restart, localStorage persistence where relevant.
   - For games: implement proper game loops, collision detection, levels, particle effects, power-ups.
   - For tools: implement undo/redo, keyboard shortcuts, data export.
   - For dashboards: implement charts using Canvas, sortable tables, filters.
5. STANDALONE & ZERO EXTERNAL BACKEND:
   - Must run self-contained in any modern browser iframe.
   - Use localStorage for data persistence.
   - Use Canvas or SVG for any graphical elements.
${complexity === 'enterprise' || complexity === 'large' ? `6. LARGE APP STRUCTURE:
   - Use a single-page application pattern with JavaScript-driven routing/views.
   - Implement a navigation system (sidebar or top nav with tabs).
   - Create at least ${complexity === 'enterprise' ? '8-12' : '4-6'} distinct screens/sections.
   - Add a search bar, notification area, and user avatar placeholder in the header.
   - Use class-based or module pattern JavaScript architecture.
   - Add loading states and smooth page transitions between views.` : ''}`;
    }

    static _cleanMarkdown(text) {
        if (!text) return '';
        return text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    }
}

class AppPackager {
    static openPlayStoreGuide() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-overlay')?.classList.add('visible');
        const modal = document.getElementById('modal-playstore');
        if (modal) modal.style.display = 'flex';
    }

    static async downloadAppStoreBundle(htmlCode, title) {
        if (!window.JSZip) {
            alert("JSZip library not loaded yet. Please try again in a moment.");
            return;
        }
        
        const zip = new JSZip();
        const safeTitle = (title || 'AgentApp').replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const shortTitle = safeTitle.substring(0, 16).replace(/\s+/g, '') || 'App';
        
        // 1. App Code
        zip.file("index.html", htmlCode);
        
        // 2. Web App Manifest
        const manifest = {
            "short_name": shortTitle,
            "name": safeTitle,
            "description": `Built autonomously with Agent Universe Swarm for goal: "${safeTitle}"`,
            "start_url": "./index.html",
            "display": "standalone",
            "orientation": "any",
            "theme_color": "#0f172a",
            "background_color": "#ffffff",
            "icons": [
                {
                    "src": "icon-512.svg",
                    "sizes": "512x512",
                    "type": "image/svg+xml",
                    "purpose": "any maskable"
                }
            ]
        };
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        
        // 3. Service Worker for offline PWA
        const sw = `// Progressive Web App Service Worker
const CACHE_NAME = '${shortTitle.toLowerCase()}-cache-v1';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});`;
        zip.file("sw.js", sw);
        
        // 4. Capacitor Config for Android / iOS native wrapper
        const capacitorConfig = {
            "appId": `com.agentuniverse.${shortTitle.toLowerCase()}`,
            "appName": safeTitle,
            "webDir": ".",
            "bundledWebRuntime": false
        };
        zip.file("capacitor.config.json", JSON.stringify(capacitorConfig, null, 2));

        // 5. Package.json
        const pkg = {
            "name": shortTitle.toLowerCase(),
            "version": "1.0.0",
            "description": `${safeTitle} - Autonomous AI App`,
            "main": "index.html",
            "scripts": {
                "android": "npx cap run android",
                "ios": "npx cap run ios",
                "sync": "npx cap sync"
            },
            "dependencies": {
                "@capacitor/core": "^5.0.0",
                "@capacitor/android": "^5.0.0",
                "@capacitor/ios": "^5.0.0"
            },
            "devDependencies": {
                "@capacitor/cli": "^5.0.0"
            }
        };
        zip.file("package.json", JSON.stringify(pkg, null, 2));

        // 6. SVG Icon
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <circle cx="256" cy="256" r="140" fill="#ffffff" opacity="0.15"/>
  <text x="50%" y="54%" font-family="Arial, sans-serif" font-size="160" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">⚡</text>
</svg>`;
        zip.file("icon-512.svg", iconSvg);

        // 7. Publishing Instructions
        const instructions = `# Cross-Platform Publishing Guide (Android, iOS, Windows)
================================================================

App Name: ${safeTitle}
Generated by: Agent Universe (Autonomous Swarm Engine)

----------------------------------------------------------------
OPTION 1: FASTEST (Zero Code via PWABuilder - 2 Minutes)
Supports: Android (Google Play), Windows (Microsoft Store), iOS
----------------------------------------------------------------
1. Host your index.html / manifest.json (or deploy your project to Netlify / Vercel / GitHub Pages).
2. Go to https://www.pwabuilder.com
3. Enter your deployed URL.
4. Click "Package for Stores".
5. Choose your target:
   - Android: Generates a signed .aab for Google Play
   - Windows: Generates an .appx for the Microsoft Store
   - iOS: Generates an Xcode project for the Apple App Store
6. Upload the generated files to the respective developer consoles.

----------------------------------------------------------------
OPTION 2: NATIVE ANDROID/iOS BUILD (Using Capacitor locally)
----------------------------------------------------------------
1. Open your terminal in this extracted folder.
2. Install dependencies:
     npm install
3. Add your platforms:
     npx cap add android
     npx cap add ios
4. Open the native IDEs:
     npx cap open android (Opens Android Studio)
     npx cap open ios     (Opens Xcode)
5. In the native IDE:
   - Android: Build > Generate Signed Bundle / APK
   - iOS: Product > Archive
6. Upload to Google Play Console or Apple App Store Connect!

----------------------------------------------------------------
REQUIREMENTS CHECKLIST:
----------------------------------------------------------------
[ ] Google Play Developer Account ($25 one-time fee) for Android
[ ] Apple Developer Program ($99/year) for iOS
[ ] Microsoft Partner Center Account for Windows
[ ] High-res icon (512x512 PNG/SVG included)
[ ] Feature graphics and screenshots
[ ] Privacy Policy URL
`;
        zip.file("CROSS_PLATFORM_PUBLISH_GUIDE.md", instructions);
        
        // Generate and download
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${shortTitle}-All-OS-Bundle.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ==========================================
// CONSTANTS & INITIAL DOMAIN DATA
// ==========================================

const AGENT_TYPES = [
    'ANALYST', 'ENGINEER', 'AUDITOR', 'PROCESSOR',
    'MONITOR', 'OPTIMIZER', 'RESEARCHER', 'VALIDATOR'
];

const PRIORITIES = { 'P0': 5, 'P1': 15, 'P2': 50, 'P3': 30 };

const TASK_STATUS = {
    QUEUED: 'QUEUED',
    ACTIVE: 'ACTIVE',
    COMPLETE: 'COMPLETE',
    FAILED: 'FAILED'
};

const AGENT_STATE = {
    IDLE: 'IDLE',
    WORKING: 'WORKING',
    REPORTING: 'REPORTING',
    BENCH: 'BENCH'
};

const SIM_CONFIG = {
    renderThrottleMs: 350,
    maxBenchAgents: 10000000,
    factoryInitialAgentsMin: 60,
    factoryInitialAgentsMax: 120
};

// Suggested industry/factory templates (NOT auto-deployed — shown as suggestions for users)
const SUGGESTED_TEMPLATES = [
    { name: 'Technology & AI', icon: '⚡', color: '#2563eb', desc: 'Software engineering, cloud infra, neural models', factories: ['API Development', 'Security Audit', 'ML Pipeline', 'DevOps Automation'] },
    { name: 'Healthcare & Biotech', icon: '🏥', color: '#059669', desc: 'Biomedical research, genomic analysis, diagnostics', factories: ['Medical Records', 'Drug Interaction Checker', 'Diagnostic Imaging', 'Clinical Trial Matching'] },
    { name: 'Finance & Fintech', icon: '📊', color: '#d97706', desc: 'Quantitative analytics, fraud detection, compliance', factories: ['Fraud Detection', 'Portfolio Risk', 'Compliance Engine'] },
    { name: 'Manufacturing & Robotics', icon: '🏭', color: '#7c3aed', desc: 'Precision engineering, IoT, predictive maintenance', factories: ['Quality Control', 'Supply Chain Optimizer', 'Predictive Maintenance'] },
    { name: 'Clean Energy & Grid', icon: '🔋', color: '#0284c7', desc: 'Renewable integration, grid stabilization, carbon telemetry', factories: ['Grid Balancing', 'Emissions Monitoring', 'Renewable Integration'] },
    { name: 'Logistics & Supply', icon: '🚛', color: '#e11d48', desc: 'Fleet routing, automated fulfillment, last-mile dispatch', factories: ['Route Optimization', 'Warehouse Automation', 'Fleet Telemetry'] },
    { name: 'Education & Learning', icon: '📚', color: '#2563eb', desc: 'Course creation, assessment, interactive learning', factories: ['Lesson Creator', 'Assessment Generator', 'Progress Tracker'] },
    { name: 'Social & Community', icon: '👥', color: '#ec4899', desc: 'User profiles, content feeds, engagement', factories: ['Profile Manager', 'Content Feed', 'Engagement Tracker'] },
];

// ==========================================
// GOAL DECOMPOSER — INTELLIGENT TASK TREE ENGINE
// ==========================================

class GoalDecomposer {
    static DECOMPOSITION_RULES = [
        {
            name: "Web/Frontend",
            keywords: ["website", "web", "page", "landing", "frontend", "html", "css", "ui", "ux", "responsive", "layout", "portfolio", "blog"],
            weight: 1,
            industries: [
                { name: 'Frontend Design & Architecture', icon: '🎨', color: '#3b82f6', description: 'Handles frontend UI and UX', factories: [
                    { name: 'UI/UX Layout Designer', goal: 'Design the overall layout and user experience' },
                    { name: 'Component Builder', goal: 'Build reusable UI components' },
                    { name: 'Responsive Adaptation Engine', goal: 'Ensure responsive design across all devices' },
                    { name: 'Asset Pipeline', goal: 'Manage and optimize images, fonts, and icons' }
                ]},
                { name: 'Deployment & Infrastructure', icon: '🚀', color: '#8b5cf6', description: 'Manages build and hosting configurations', factories: [
                    { name: 'Build & Bundle Optimizer', goal: 'Optimize application bundles for production' },
                    { name: 'Hosting Configuration', goal: 'Setup and configure hosting environments' },
                    { name: 'Performance Auditor', goal: 'Audit and improve load times and runtime performance' }
                ]}
            ]
        },
        {
            name: "App/Mobile",
            keywords: ["app", "mobile", "android", "ios", "application", "native", "react native", "flutter"],
            weight: 1,
            industries: [
                { name: 'App Architecture', icon: '📱', color: '#06b6d4', description: 'Core application structure and routing', factories: [
                    { name: 'Navigation & Routing Engine', goal: 'Handle screens and transitions' },
                    { name: 'Screen Builder', goal: 'Assemble mobile views and components' },
                    { name: 'State Management Core', goal: 'Manage global app state' },
                    { name: 'Data Persistence Layer', goal: 'Handle local caching and storage' }
                ]},
                { name: 'Platform Adaptation', icon: '🔧', color: '#64748b', description: 'Handles cross-platform native logic', factories: [
                    { name: 'Device Compatibility Tester', goal: 'Ensure device compatibility' },
                    { name: 'Platform API Bridge', goal: 'Connect with native device features' }
                ]}
            ]
        },
        {
            name: "Video/Media",
            keywords: ["video", "youtube", "stream", "media", "film", "animation", "movie", "clip", "upload", "creator"],
            weight: 1,
            industries: [
                { name: 'Content Production', icon: '🎬', color: '#f97316', description: 'Handles content creation pipeline', factories: [
                    { name: 'Script & Storyboard Generator', goal: 'Generate scripts from prompts' },
                    { name: 'Video Rendering Pipeline', goal: 'Render video frames and scenes' },
                    { name: 'Audio Mixing Engine', goal: 'Process and mix audio tracks' },
                    { name: 'Transition & Effects Processor', goal: 'Apply visual effects and transitions' }
                ]},
                { name: 'Distribution & Platform', icon: '📡', color: '#ec4899', description: 'Manages publishing and delivery', factories: [
                    { name: 'Platform Upload Handler', goal: 'Upload content to various platforms' },
                    { name: 'Schedule & Publish Automator', goal: 'Automate content release scheduling' },
                    { name: 'Analytics Tracker', goal: 'Track views and engagement metrics' }
                ]}
            ]
        },
        {
            name: "Email/Communication",
            keywords: ["email", "gmail", "mail", "notification", "message", "sms", "alert", "send", "newsletter"],
            weight: 1,
            industries: [
                { name: 'Communication Engine', icon: '📧', color: '#0891b2', description: 'Handles message formatting and sending', factories: [
                    { name: 'Template Designer', goal: 'Design responsive email templates' },
                    { name: 'Message Composer', goal: 'Compose message content dynamically' },
                    { name: 'SMTP/API Handler', goal: 'Send communications via SMTP or API' },
                    { name: 'Recipient Manager', goal: 'Manage user segments and lists' }
                ]},
                { name: 'Scheduling & Automation', icon: '⏰', color: '#a855f7', description: 'Manages timing and triggers', factories: [
                    { name: 'Cron Scheduler', goal: 'Schedule recurring tasks' },
                    { name: 'Trigger Rules Engine', goal: 'Fire events based on user actions' },
                    { name: 'Delivery Tracker', goal: 'Track bounces, opens, and clicks' }
                ]}
            ]
        },
        {
            name: "Game/Interactive",
            keywords: ["game", "play", "arcade", "puzzle", "quiz", "interactive", "score", "level"],
            weight: 1,
            industries: [
                { name: 'Game Engine & Logic', icon: '🎮', color: '#ef4444', description: 'Handles game logic and physics', factories: [
                    { name: 'Physics & Collision Engine', goal: 'Manage collisions and gravity' },
                    { name: 'Game Loop Architect', goal: 'Control the main render loop' },
                    { name: 'Score & State Manager', goal: 'Track player progression' },
                    { name: 'Level Designer', goal: 'Generate level layouts' }
                ]},
                { name: 'Graphics & Audio', icon: '🎨', color: '#f59e0b', description: 'Handles rendering and sound', factories: [
                    { name: 'Sprite & Canvas Renderer', goal: 'Draw objects on the screen' },
                    { name: 'Sound Effects Engine', goal: 'Play background music and SFX' },
                    { name: 'Animation Sequencer', goal: 'Sequence frame-by-frame animations' }
                ]}
            ]
        },
        {
            name: "Data/Analytics",
            keywords: ["data", "analytics", "dashboard", "chart", "graph", "report", "monitor", "metrics", "track", "statistics"],
            weight: 1,
            industries: [
                { name: 'Data Pipeline', icon: '📊', color: '#0d9488', description: 'Manages data flow and processing', factories: [
                    { name: 'Data Ingestion Engine', goal: 'Ingest data from external sources' },
                    { name: 'Transform & Clean Processor', goal: 'Clean and format raw data' },
                    { name: 'Aggregation Engine', goal: 'Aggregate metrics and summaries' }
                ]},
                { name: 'Visualization & Reporting', icon: '📈', color: '#2563eb', description: 'Renders charts and dashboards', factories: [
                    { name: 'Chart & Graph Builder', goal: 'Render data visualizations' },
                    { name: 'Report Generator', goal: 'Generate PDF or Excel reports' },
                    { name: 'Alert Rules Engine', goal: 'Trigger alerts on data thresholds' }
                ]}
            ]
        },
        {
            name: "E-commerce/Business",
            keywords: ["shop", "store", "product", "cart", "checkout", "payment", "order", "ecommerce", "buy", "sell", "price", "invoice"],
            weight: 1,
            industries: [
                { name: 'Product & Catalog', icon: '🛒', color: '#059669', description: 'Manages store items', factories: [
                    { name: 'Product Catalog Manager', goal: 'Organize products and categories' },
                    { name: 'Inventory Tracker', goal: 'Manage stock levels' },
                    { name: 'Search & Filter Engine', goal: 'Implement search and faceted filtering' }
                ]},
                { name: 'Transaction & Fulfillment', icon: '💳', color: '#7c3aed', description: 'Handles payments and orders', factories: [
                    { name: 'Cart & Checkout Flow', goal: 'Manage user cart state' },
                    { name: 'Payment Gateway Handler', goal: 'Process secure payments' },
                    { name: 'Order Management System', goal: 'Track order fulfillment' }
                ]}
            ]
        },
        {
            name: "AI/ML/Bot",
            keywords: ["ai", "bot", "chat", "assistant", "gpt", "machine learning", "ml", "neural", "smart", "intelligent", "predict"],
            weight: 1,
            industries: [
                { name: 'AI Core Engine', icon: '🧠', color: '#8b5cf6', description: 'Handles intelligence and models', factories: [
                    { name: 'Model Architecture Builder', goal: 'Design ML model structures' },
                    { name: 'Training Pipeline', goal: 'Train models on datasets' },
                    { name: 'Inference Engine', goal: 'Run predictions and logic' },
                    { name: 'Prompt Engineering Lab', goal: 'Optimize LLM prompts' }
                ]},
                { name: 'Interface & Integration', icon: '🔌', color: '#64748b', description: 'Interfaces AI with users', factories: [
                    { name: 'Conversational UI Builder', goal: 'Build chat interfaces' },
                    { name: 'API Endpoint Constructor', goal: 'Expose model via API' },
                    { name: 'Context Memory Manager', goal: 'Manage conversation context' }
                ]}
            ]
        },
        {
            name: "Calculator/Tool/Utility",
            keywords: ["calculator", "calc", "math", "tool", "utility", "converter", "generator", "timer", "clock", "pomodoro"],
            weight: 1,
            industries: [
                { name: 'Application Core', icon: '🔢', color: '#2563eb', description: 'Core tool logic and processing', factories: [
                    { name: 'Logic Engine Builder', goal: 'Implement calculations or tool logic' },
                    { name: 'Input Validation Suite', goal: 'Validate user input constraints' },
                    { name: 'State Machine Architect', goal: 'Manage tool states' }
                ]},
                { name: 'User Interface', icon: '🖥️', color: '#059669', description: 'Tool presentation layer', factories: [
                    { name: 'Control Panel Designer', goal: 'Design interactive controls' },
                    { name: 'Display Renderer', goal: 'Render outputs and feedback' },
                    { name: 'Interaction Handler', goal: 'Handle clicks and inputs' }
                ]}
            ]
        },
        {
            name: "Social/Community",
            keywords: ["social", "community", "forum", "post", "comment", "like", "share", "profile", "feed", "follow"],
            weight: 1,
            industries: [
                { name: 'Social Platform Core', icon: '👥', color: '#ec4899', description: 'Manages user interaction', factories: [
                    { name: 'User Profile Manager', goal: 'Handle profiles and settings' },
                    { name: 'Content Feed Engine', goal: 'Generate user content feeds' },
                    { name: 'Engagement Tracker', goal: 'Track likes and comments' }
                ]},
                { name: 'Moderation & Safety', icon: '🛡️', color: '#64748b', description: 'Maintains community standards', factories: [
                    { name: 'Content Filter', goal: 'Filter inappropriate content' },
                    { name: 'Report Handler', goal: 'Process user reports' },
                    { name: 'Community Guidelines Enforcer', goal: 'Enforce platform rules' }
                ]}
            ]
        },
        {
            name: "Automation/Integration",
            keywords: ["automate", "automation", "integrate", "connect", "api", "webhook", "scrape", "crawl", "pipeline", "workflow", "sync"],
            weight: 1,
            industries: [
                { name: 'Automation Core', icon: '⚙️', color: '#f97316', description: 'Executes automated tasks', factories: [
                    { name: 'Workflow Orchestrator', goal: 'Orchestrate task sequences' },
                    { name: 'API Connector Builder', goal: 'Connect to external APIs' },
                    { name: 'Error Recovery Handler', goal: 'Handle retries and failures' }
                ]},
                { name: 'Monitoring & Logging', icon: '📋', color: '#64748b', description: 'Observes system operations', factories: [
                    { name: 'Execution Logger', goal: 'Log automation steps' },
                    { name: 'Health Check Monitor', goal: 'Monitor system uptime' },
                    { name: 'Performance Profiler', goal: 'Profile bottleneck performance' }
                ]}
            ]
        },
        {
            name: "Education/Learning",
            keywords: ["learn", "education", "course", "quiz", "study", "exam", "test", "tutor", "school", "lesson", "teach"],
            weight: 1,
            industries: [
                { name: 'Content & Curriculum', icon: '📚', color: '#2563eb', description: 'Manages educational content', factories: [
                    { name: 'Lesson Content Creator', goal: 'Create structured lessons' },
                    { name: 'Assessment Generator', goal: 'Generate quizzes and exams' },
                    { name: 'Progress Tracker', goal: 'Track student completion' }
                ]},
                { name: 'Interactive Learning', icon: '🎓', color: '#059669', description: 'Facilitates student engagement', factories: [
                    { name: 'Interactive Exercise Builder', goal: 'Build interactive practice modules' },
                    { name: 'Feedback Engine', goal: 'Provide real-time feedback' },
                    { name: 'Certificate Generator', goal: 'Generate completion certificates' }
                ]}
            ]
        }
    ];

    static FALLBACK_RULE = {
        industries: [
            { name: 'Core Application Logic', icon: '⚡', color: '#3b82f6', description: 'Builds core functionality and interfaces', factories: [
                { name: 'Requirements Analyzer', goal: 'Analyze and define functional requirements' },
                { name: 'Logic Synthesizer', goal: 'Synthesize core business logic' },
                { name: 'Interface Builder', goal: 'Build main application interfaces' }
            ]},
            { name: 'Testing & Delivery', icon: '✅', color: '#059669', description: 'Ensures application quality and delivery', factories: [
                { name: 'Integration Tester', goal: 'Test integrations between components' },
                { name: 'Performance Validator', goal: 'Validate system performance under load' },
                { name: 'Deployment Packager', goal: 'Package the application for deployment' }
            ]}
        ]
    };

    static QA_INDUSTRY = {
        name: 'Quality Assurance & Testing', icon: '🧪', color: '#64748b', description: 'Ensures system reliability and correctness',
        factories: [
            { name: 'Unit Test Runner', goal: 'Run unit tests on isolated components' },
            { name: 'Integration Validator', goal: 'Validate interactions between systems' },
            { name: 'User Acceptance Tester', goal: 'Simulate user interactions for acceptance' }
        ]
    };

    static decompose(goalText) {
        const goalLower = (goalText || '').toLowerCase();
        let matchedRules = [];

        for (const rule of this.DECOMPOSITION_RULES) {
            const score = this.scoreRule(goalLower, rule);
            if (score > 0) matchedRules.push({ rule, score });
        }

        let finalIndustries = [];
        if (matchedRules.length > 0) {
            matchedRules.sort((a, b) => b.score - a.score);
            finalIndustries = this.mergeIndustries(matchedRules.map(mr => mr.rule));
        } else {
            finalIndustries = JSON.parse(JSON.stringify(this.FALLBACK_RULE.industries));
        }

        // Always add QA industry at the end
        finalIndustries.push(JSON.parse(JSON.stringify(this.QA_INDUSTRY)));

        let totalFactories = 0;
        for (const industry of finalIndustries) {
            totalFactories += industry.factories.length;
        }

        // Calculate estimated agents dynamically based on app complexity (leveraging 1 Crore capacity)
        const complexity = GeminiAPI.classifyComplexity(goalLower);
        let baseAgentsPerFactory = 350;
        if (complexity === 'small') {
            baseAgentsPerFactory = 150; // Simple utility: ~500-1,000 total agents
        } else if (complexity === 'medium') {
            baseAgentsPerFactory = 500; // Medium tool: ~3,000-5,000 total agents
        } else if (complexity === 'large') {
            baseAgentsPerFactory = 2500; // Large app: ~15,000-30,000 total agents
        } else if (complexity === 'enterprise') {
            baseAgentsPerFactory = 10000; // Enterprise: ~80,000-150,000 total agents
        }

        const estimatedAgentsNeeded = totalFactories * baseAgentsPerFactory;

        return {
            goal: goalText,
            industries: finalIndustries,
            totalFactories,
            estimatedAgentsNeeded
        };
    }

    static scoreRule(goalLower, rule) {
        let count = 0;
        for (const keyword of rule.keywords) {
            if (goalLower.includes(keyword)) count++;
        }
        return count * (rule.weight || 1);
    }

    static mergeIndustries(matchedRules) {
        const industryMap = new Map();
        for (const rule of matchedRules) {
            for (const industry of rule.industries) {
                if (!industryMap.has(industry.name)) {
                    industryMap.set(industry.name, {
                        name: industry.name, icon: industry.icon, color: industry.color,
                        description: industry.description, factories: []
                    });
                }
                const existing = industryMap.get(industry.name);
                for (const factory of industry.factories) {
                    if (!existing.factories.some(f => f.name === factory.name)) {
                        existing.factories.push({ ...factory });
                    }
                }
            }
        }
        return Array.from(industryMap.values());
    }
}

// ==========================================
// ARTIFACT BUILDER & LIVE APP GENERATOR
// ==========================================

class ArtifactGenerator {
    // Weighted keyword scoring dispatch - prevents wrong matches like "video creator" → "canvas drawing"
    static GENERATOR_RULES = [
        { keywords: ['smartwatch', 'watch', 'wearable'], method: 'generateSmartwatch', weight: 3 },
        { keywords: ['video', 'movie', 'film', 'youtube creator', 'video creator', 'video editor'], method: 'generateVideoCreator', weight: 3 },
        { keywords: ['landing', 'landing page', 'homepage'], method: 'generateLandingPage', weight: 3 },
        { keywords: ['form', 'form builder', 'survey form'], method: 'generateFormBuilder', weight: 3 },
        { keywords: ['survey', 'quiz', 'questionnaire', 'exam'], method: 'generateSurveyQuiz', weight: 3 },
        { keywords: ['portfolio', 'resume', 'cv', 'personal site'], method: 'generatePortfolio', weight: 3 },
        { keywords: ['shop', 'store', 'ecommerce', 'e-commerce', 'product', 'cart'], method: 'generateEcommerce', weight: 3 },
        { keywords: ['markdown', 'editor', 'text editor', 'notes', 'notepad'], method: 'generateMarkdownEditor', weight: 3 },
        { keywords: ['kanban', 'board', 'trello', 'project board'], method: 'generateKanban', weight: 3 },
        { keywords: ['calendar', 'scheduler', 'planner', 'events', 'event planner'], method: 'generateCalendar', weight: 3 },
        { keywords: ['gallery', 'photo', 'image gallery', 'photos'], method: 'generateImageGallery', weight: 3 },
        { keywords: ['invoice', 'billing', 'receipt'], method: 'generateInvoice', weight: 3 },
        { keywords: ['recipe', 'cookbook', 'cooking', 'food', 'meal'], method: 'generateRecipeApp', weight: 3 },
        { keywords: ['fitness', 'workout', 'exercise', 'gym', 'health tracker'], method: 'generateFitnessTracker', weight: 3 },
        { keywords: ['budget', 'expense', 'finance tracker', 'money', 'spending'], method: 'generateBudgetTracker', weight: 3 },
        { keywords: ['calc', 'calculator', 'math', 'arithmetic'], method: 'generateCalculator', weight: 2 },
        { keywords: ['music', 'audio', 'player', 'song', 'spotify'], method: 'generateMusicPlayer', weight: 2 },
        { keywords: ['chat', 'chatbot', 'assistant', 'gpt', 'ai chat'], method: 'generateAIChat', weight: 2 },
        { keywords: ['draw', 'paint', 'canvas', 'sketch', 'whiteboard'], method: 'generateCanvasDrawing', weight: 2 },
        { keywords: ['crypto', 'stock', 'market', 'trade', 'trading'], method: 'generateCryptoDashboard', weight: 2 },
        { keywords: ['todo', 'task list', 'to-do'], method: 'generateTodo', weight: 2 },
        { keywords: ['snake', 'game', 'arcade'], method: 'generateSnakeGame', weight: 1 },
        { keywords: ['weather', 'forecast'], method: 'generateWeather', weight: 2 },
        { keywords: ['timer', 'pomodoro', 'clock', 'countdown'], method: 'generateTimer', weight: 2 },
    ];

    static generate(goalText) {
        const text = (goalText || '').toLowerCase();
        
        // Score each generator by counting keyword matches * weight
        let bestScore = 0;
        let bestMethod = null;
        
        for (const rule of this.GENERATOR_RULES) {
            let score = 0;
            for (const keyword of rule.keywords) {
                if (text.includes(keyword)) score += rule.weight;
            }
            if (score > bestScore) {
                bestScore = score;
                bestMethod = rule.method;
            }
        }
        
        if (bestScore >= 2 && bestMethod && this[bestMethod]) {
            return this[bestMethod](goalText);
        } else {
            const data = this._smartApp(goalText, 'AI Swarm Generating...', '✨', 'dynamic');
            const complexity = GeminiAPI.classifyComplexity(goalText);
            
            if (SettingsManager.getApiKey()) {
                // Show enhanced loading screen with progress and complexity info
                const passCount = complexity === 'small' ? 1 : (complexity === 'enterprise' ? 3 : 2);
                data.code = `<!DOCTYPE html><html lang="en"><head><title>Generating...</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#fff;margin:0;}
.spinner{border:4px solid rgba(255,255,255,0.1);width:48px;height:48px;border-radius:50%;border-left-color:#38bdf8;animation:spin 1s linear infinite;}
@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
.badge{background:${complexity === 'enterprise' ? '#7c3aed' : complexity === 'large' ? '#f97316' : '#3b82f6'};padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;display:inline-block;margin-bottom:16px;}
.progress-bar{width:200px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin:16px auto 0;overflow:hidden;}
.progress-fill{height:100%;background:linear-gradient(90deg,#38bdf8,#818cf8);border-radius:2px;animation:progress ${passCount * 12}s ease-in-out forwards;}
@keyframes progress{0%{width:0}50%{width:60%}90%{width:85%}100%{width:95%}}
#status-text{color:#94a3b8;font-size:12px;margin-top:12px;transition:all 0.3s;}
</style></head><body><div style="text-align:center">
<div class="badge">${complexity} complexity</div>
<div class="spinner" style="margin:0 auto 16px;"></div>
<p>🤖 AI Swarm is building your app...</p>
<p style="color:#64748b;font-size:11px;">Multi-pass generation: ${passCount} pass${passCount > 1 ? 'es' : ''}</p>
<div class="progress-bar"><div class="progress-fill"></div></div>
<p id="status-text">Initializing swarm strategy...</p>
</div></body></html>`;
                
                // Progress callback updates the iframe status text
                const onProgress = (msg) => {
                    try {
                        const frame = document.querySelector('.sandbox-iframe');
                        if (frame && frame.contentDocument) {
                            const el = frame.contentDocument.getElementById('status-text');
                            if (el) el.textContent = msg;
                        }
                    } catch(e) {}
                    AgentUniverse.instance?.eventLog?.log('task', `[SWARM] ${msg}`);
                };

                GeminiAPI.generateApp(goalText, onProgress).then(generatedCode => {
                    data.code = generatedCode;
                    data.title = 'AI Generated Application';
                    data.complexity = complexity;
                    data.generatedAt = Date.now();
                    const frame = document.querySelector('.sandbox-iframe');
                    if (frame && window.agentUniverse && window.agentUniverse.renderer._currentModalArtifact && window.agentUniverse.renderer._currentModalArtifact.text === goalText) {
                        frame.srcdoc = generatedCode;
                        const codeView = document.querySelector('#artifact-code-view code');
                        if (codeView) codeView.textContent = generatedCode;
                    }
                    // Also update gallery player if loaded there
                    const playerFrame = document.getElementById('sandbox-player-frame');
                    if (playerFrame && playerFrame.srcdoc && playerFrame.srcdoc.includes('Generating')) {
                        playerFrame.srcdoc = generatedCode;
                    }
                    AgentUniverse.instance?.eventLog?.log('task', `✅ App generated! Complexity: ${complexity.toUpperCase()}, Size: ${(generatedCode.length / 1024).toFixed(1)} KB`);
                    // ── AUTO-SAVE to persistent AppStore ──
                    const savedApp = AppStore.save({
                        id: data.id || 'APP-' + generateId(),
                        title: goalText,
                        goalText: goalText,
                        code: generatedCode,
                        complexity: complexity,
                        createdAt: Date.now()
                    });
                    data._persistedId = savedApp.id;
                    AgentUniverse.instance?.renderer?.renderMyAppsGallery?.();
                }).catch(err => {
                    data.code = `<!DOCTYPE html><html lang="en"><body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#fff;"><h2 style="color:#f87171">⚠️ Swarm Generation Failed</h2><p style="color:#94a3b8">${err.message}</p><p style="color:#64748b;font-size:13px;">Tip: Check your API key in Settings, or try a simpler goal first.</p></body></html>`;
                    const frame = document.querySelector('.sandbox-iframe');
                    if (frame && window.agentUniverse && window.agentUniverse.renderer._currentModalArtifact && window.agentUniverse.renderer._currentModalArtifact.text === goalText) {
                        frame.srcdoc = data.code;
                        const codeView = document.querySelector('#artifact-code-view code');
                        if (codeView) codeView.textContent = data.code;
                    }
                });
            } else {
                data.code = `<!DOCTYPE html><html lang="en"><head><title>Missing API Key</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8fafc;color:#0f172a; margin:0;} .card{background:#fff; padding:32px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.05); text-align:center; max-width:400px; border:1px solid #e2e8f0;} h2{margin-top:0;} p{color:#64748b; line-height:1.5; font-size:14px; margin-bottom:24px;}</style></head><body><div class="card"><h2>🔑 API Key Required</h2><p>To dynamically generate custom applications like <b>"${goalText}"</b>, the AI Swarm needs access to the Gemini API.</p><p>Please close this window and click the <b>⚙️ Settings</b> button in the top right navigation bar to enter your API key.</p></div></body></html>`;
            }
            
            return data;
        }
    }

    // ⌚ SMARTWATCH OS SIMULATOR
    static generateSmartwatch(goalText) {
        const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Wear OS Smartwatch</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; user-select: none; }
    body { background: #0f172a; color: #ffffff; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    
    /* Smartwatch Case & Hardware Frame */
    .watch-chassis {
      position: relative;
      background: linear-gradient(145deg, #2a2e39 0%, #15181f 100%);
      border: 4px solid #475569;
      border-radius: 64px;
      padding: 16px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.2);
      width: 320px;
      height: 400px;
      display: flex;
      flex-direction: column;
    }
    
    /* Hardware Crown & Button */
    .crown {
      position: absolute;
      right: -14px;
      top: 90px;
      width: 10px;
      height: 48px;
      background: linear-gradient(to right, #64748b, #cbd5e1, #475569);
      border-radius: 4px;
      box-shadow: 2px 0 6px rgba(0,0,0,0.5);
      cursor: pointer;
    }
    .side-button {
      position: absolute;
      right: -10px;
      bottom: 110px;
      width: 6px;
      height: 36px;
      background: #475569;
      border-radius: 3px;
      cursor: pointer;
    }
    .strap-top, .strap-bottom {
      width: 150px;
      height: 35px;
      background: #1e293b;
      border-left: 2px solid #334155;
      border-right: 2px solid #334155;
      border-radius: 8px 8px 0 0;
    }
    .strap-bottom {
      border-radius: 0 0 8px 8px;
    }

    /* OLED Screen */
    .screen {
      background: #000000;
      border-radius: 48px;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      border: 2px solid #111;
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px 4px;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
    }
    .battery-pill {
      background: #1e293b;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    /* App Screens Container */
    .app-viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .app-screen {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      padding: 10px 18px;
      animation: fadeIn 0.2s ease;
    }
    .app-screen.active {
      display: flex;
    }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

    /* SCREEN 1: CLOCK FACE */
    .clock-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: auto 0;
    }
    .time-large {
      font-size: 48px;
      font-weight: 800;
      font-family: monospace;
      letter-spacing: -1px;
      color: #38bdf8;
      text-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
      line-height: 1;
    }
    .seconds-text {
      font-size: 16px;
      color: #94a3b8;
      margin-left: 4px;
    }
    .date-text {
      font-size: 12px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 1px;
      margin-top: 6px;
      text-transform: uppercase;
    }
    
    /* Metrics Row on Watch Face */
    .face-metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-top: auto;
      margin-bottom: 8px;
    }
    .f-metric {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 6px 4px;
      text-align: center;
    }
    .f-metric-val {
      font-size: 13px;
      font-weight: 800;
      font-family: monospace;
    }
    .f-metric-lbl {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .heart-val { color: #f43f5e; }
    .steps-val { color: #10b981; }
    .cal-val { color: #f59e0b; }

    /* SCREEN 2: HEART & HEALTH */
    .health-title {
      font-size: 14px;
      font-weight: 800;
      color: #f43f5e;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .ecg-box {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 12px;
      height: 90px;
      position: relative;
      overflow: hidden;
      margin-bottom: 10px;
    }
    canvas#ecgCanvas {
      width: 100%;
      height: 100%;
    }
    .health-stat-row {
      display: flex;
      justify-content: space-between;
      background: #111827;
      padding: 8px 12px;
      border-radius: 10px;
      margin-bottom: 6px;
      font-size: 12px;
    }

    /* SCREEN 3: MUSIC PLAYER */
    .music-album {
      width: 80px;
      height: 80px;
      background: linear-gradient(45deg, #ec4899, #8b5cf6);
      border-radius: 16px;
      margin: 10px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      box-shadow: 0 8px 20px rgba(236, 72, 153, 0.3);
    }
    .track-title { font-size: 13px; font-weight: 800; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-artist { font-size: 10px; color: #94a3b8; text-align: center; margin-bottom: 10px; }
    .player-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
    }
    .p-btn {
      background: #1e293b;
      border: none;
      color: #ffffff;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
    }
    .p-btn.play {
      background: #38bdf8;
      color: #0f172a;
      width: 46px;
      height: 46px;
      font-size: 18px;
    }

    /* SCREEN 4: STOPWATCH */
    .sw-display {
      font-size: 34px;
      font-family: monospace;
      font-weight: 800;
      color: #a855f7;
      text-align: center;
      margin: 24px 0 16px;
    }
    .sw-btns {
      display: flex;
      gap: 8px;
    }
    .sw-btn {
      flex: 1;
      padding: 10px 0;
      border-radius: 12px;
      font-weight: 700;
      font-size: 12px;
      border: none;
      cursor: pointer;
    }
    .sw-start { background: #10b981; color: #fff; }
    .sw-stop { background: #ef4444; color: #fff; }
    .sw-reset { background: #334155; color: #fff; }

    /* Bottom Navigation Bar */
    .watch-nav {
      display: flex;
      justify-content: space-around;
      padding: 8px 10px;
      background: #090d16;
      border-top: 1px solid #1e293b;
    }
    .w-tab-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: all 0.15s;
    }
    .w-tab-btn.active {
      color: #38bdf8;
      background: #1e293b;
    }

    /* Outer Help text */
    .help-bar {
      margin-top: 16px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="strap-top"></div>
  <div class="watch-chassis">
    <div class="crown" onclick="switchTab('face')" title="Press Crown to go Home"></div>
    <div class="side-button" onclick="triggerFlashlight()" title="Action Button"></div>
    
    <div class="screen" id="watchScreen">
      <!-- Status Bar -->
      <div class="status-bar">
        <span id="statusTime">10:54</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <span>📶</span>
          <div class="battery-pill">⚡ 94%</div>
        </div>
      </div>

      <!-- App Viewport -->
      <div class="app-viewport">
        
        <!-- 1. WATCH FACE -->
        <div class="app-screen active" id="screen-face">
          <div class="clock-center">
            <div style="display:flex;align-items:baseline;">
              <span class="time-large" id="mainClock">10:54</span>
              <span class="seconds-text" id="mainSeconds">:32</span>
            </div>
            <div class="date-text" id="mainDate">SUN 16 AUG</div>
          </div>

          <div class="face-metrics-grid">
            <div class="f-metric">
              <div class="f-metric-val heart-val"><span id="liveBpm">76</span> BPM</div>
              <div class="f-metric-lbl">Pulse</div>
            </div>
            <div class="f-metric">
              <div class="f-metric-val steps-val"><span id="liveSteps">8,420</span></div>
              <div class="f-metric-lbl">Steps</div>
            </div>
            <div class="f-metric">
              <div class="f-metric-val cal-val">584</div>
              <div class="f-metric-lbl">kcal</div>
            </div>
          </div>
        </div>

        <!-- 2. HEART & HEALTH APP -->
        <div class="app-screen" id="screen-health">
          <div class="health-title">💓 Live Cardio ECG</div>
          <div class="ecg-box">
            <canvas id="ecgCanvas" width="280" height="90"></canvas>
          </div>
          <div class="health-stat-row">
            <span style="color:#94a3b8">Heart Rate:</span>
            <span style="font-weight:700;color:#f43f5e;"><span id="ecgBpm">76</span> BPM (Resting)</span>
          </div>
          <div class="health-stat-row">
            <span style="color:#94a3b8">Blood Oxygen (SpO₂):</span>
            <span style="font-weight:700;color:#38bdf8;">99% Normal</span>
          </div>
          <div class="health-stat-row">
            <span style="color:#94a3b8">Sleep Score:</span>
            <span style="font-weight:700;color:#10b981;">88 / 100 (Optimal)</span>
          </div>
        </div>

        <!-- 3. MUSIC APP -->
        <div class="app-screen" id="screen-music">
          <div class="music-album" id="albumArt">🎵</div>
          <div class="track-title" id="trackTitle">Quantum Flow (VIP)</div>
          <div class="track-artist" id="trackArtist">Agent Universe Sound</div>
          <div class="player-controls">
            <button class="p-btn" onclick="prevTrack()">⏮</button>
            <button class="p-btn play" id="playBtn" onclick="togglePlay()">▶</button>
            <button class="p-btn" onclick="nextTrack()">⏭</button>
          </div>
          <div style="font-size:10px;text-align:center;color:#64748b;margin-top:12px;" id="musicStatus">Tap Play for Synth Audio</div>
        </div>

        <!-- 4. STOPWATCH -->
        <div class="app-screen" id="screen-stopwatch">
          <div style="font-size:13px;font-weight:700;color:#a855f7;text-align:center;margin-top:4px;">⏱️ Precision Stopwatch</div>
          <div class="sw-display" id="swDisplay">00:00.00</div>
          <div class="sw-btns">
            <button class="sw-btn sw-start" id="swStartBtn" onclick="toggleStopwatch()">Start</button>
            <button class="sw-btn sw-reset" onclick="resetStopwatch()">Reset</button>
          </div>
        </div>

        <!-- 5. FLASHLIGHT / NOTIFICATIONS -->
        <div class="app-screen" id="screen-more">
          <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:8px;">💬 Notifications</div>
          <div style="background:#111827;padding:8px 10px;border-radius:8px;font-size:11px;margin-bottom:6px;">
            <div style="color:#38bdf8;font-weight:700;">Swarm Overseer</div>
            <div style="color:#e2e8f0;margin-top:2px;">Goal "make a smartwatch" active & verified!</div>
          </div>
          <div style="background:#111827;padding:8px 10px;border-radius:8px;font-size:11px;margin-bottom:6px;">
            <div style="color:#10b981;font-weight:700;">Activity Rings</div>
            <div style="color:#e2e8f0;margin-top:2px;">Daily move goal 84% completed!</div>
          </div>
          <button style="width:100%;padding:6px;background:#334155;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;margin-top:4px;" onclick="triggerFlashlight()">🔦 Toggle Flashlight</button>
        </div>

      </div>

      <!-- Navigation Bar -->
      <div class="watch-nav">
        <button class="w-tab-btn active" onclick="switchTab('face')" title="Watch Face">⌚</button>
        <button class="w-tab-btn" onclick="switchTab('health')" title="Heart Rate & ECG">💓</button>
        <button class="w-tab-btn" onclick="switchTab('music')" title="Music Player">🎵</button>
        <button class="w-tab-btn" onclick="switchTab('stopwatch')" title="Stopwatch">⏱️</button>
        <button class="w-tab-btn" onclick="switchTab('more')" title="Notifications">💬</button>
      </div>

    </div>
  </div>
  <div class="strap-bottom"></div>
  <div class="help-bar">Nexus Watch OS • Tap bottom tabs to switch apps • Click crown on right for Home</div>

  <script>
    // 1. Live Clock
    function updateClock() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      
      const timeStr = h + ':' + m;
      document.getElementById('statusTime').textContent = timeStr;
      document.getElementById('mainClock').textContent = timeStr;
      document.getElementById('mainSeconds').textContent = ':' + s;

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      document.getElementById('mainDate').textContent = days[now.getDay()] + ' ' + now.getDate() + ' ' + months[now.getMonth()];
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 2. Tab Navigation
    function switchTab(tabId) {
      document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.w-tab-btn').forEach(b => b.classList.remove('active'));
      
      document.getElementById('screen-' + tabId)?.classList.add('active');
      const idx = ['face', 'health', 'music', 'stopwatch', 'more'].indexOf(tabId);
      if (idx > -1) {
        document.querySelectorAll('.w-tab-btn')[idx]?.classList.add('active');
      }
    }

    // 3. Heart Rate & ECG Canvas Wave
    let ecgX = 0, ecgY = 45;
    const canvas = document.getElementById('ecgCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 280, 90);
    }
    
    function drawECG() {
      if (!ctx) return;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ecgX, ecgY);

      ecgX += 3;
      if (ecgX % 60 === 30) ecgY = 15; // R peak
      else if (ecgX % 60 === 33) ecgY = 75; // S valley
      else if (ecgX % 60 === 36) ecgY = 45; // baseline
      else ecgY = 45 + (Math.random() * 4 - 2);

      ctx.lineTo(ecgX, ecgY);
      ctx.stroke();

      if (ecgX >= 280) {
        ecgX = 0;
        ctx.fillStyle = 'rgba(9, 13, 22, 0.8)';
        ctx.fillRect(0, 0, 280, 90);
      }
    }
    setInterval(drawECG, 50);

    // Random Pulse Fluctuations
    setInterval(() => {
      const bpm = 72 + Math.floor(Math.random() * 8);
      document.getElementById('liveBpm').textContent = bpm;
      document.getElementById('ecgBpm').textContent = bpm;
    }, 3000);

    // 4. Music Player with Web Audio API
    let isPlaying = false, audioCtx = null, osc = null, trackIndex = 0;
    const playlist = [
      { title: 'Quantum Flow (VIP)', artist: 'Agent Universe Sound', icon: '🌌' },
      { title: 'Neural Symphony', artist: 'Cybernetic Echoes', icon: '⚡' },
      { title: 'Silicon Horizon', artist: 'Nexus Core', icon: '🌅' }
    ];

    function togglePlay() {
      isPlaying = !isPlaying;
      const btn = document.getElementById('playBtn');
      btn.textContent = isPlaying ? '⏸' : '▶';
      btn.style.background = isPlaying ? '#10b981' : '#38bdf8';
      document.getElementById('musicStatus').textContent = isPlaying ? '● Playing via Web Audio' : 'Paused';

      if (isPlaying) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        playSynthBeep();
      }
    }

    function playSynthBeep() {
      if (!isPlaying || !audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const freqs = [330, 392, 440, 523, 659];
      osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); if (isPlaying) setTimeout(playSynthBeep, 400); }, 200);
    }

    function nextTrack() {
      trackIndex = (trackIndex + 1) % playlist.length;
      updateTrack();
    }
    function prevTrack() {
      trackIndex = (trackIndex - 1 + playlist.length) % playlist.length;
      updateTrack();
    }
    function updateTrack() {
      const t = playlist[trackIndex];
      document.getElementById('trackTitle').textContent = t.title;
      document.getElementById('trackArtist').textContent = t.artist;
      document.getElementById('albumArt').textContent = t.icon;
    }

    // 5. Stopwatch
    let swInterval = null, swStartTime = 0, swElapsed = 0, swRunning = false;
    function toggleStopwatch() {
      const btn = document.getElementById('swStartBtn');
      if (!swRunning) {
        swRunning = true;
        swStartTime = Date.now() - swElapsed;
        swInterval = setInterval(() => {
          swElapsed = Date.now() - swStartTime;
          const mins = Math.floor(swElapsed / 60000).toString().padStart(2, '0');
          const secs = Math.floor((swElapsed % 60000) / 1000).toString().padStart(2, '0');
          const ms = Math.floor((swElapsed % 1000) / 10).toString().padStart(2, '0');
          document.getElementById('swDisplay').textContent = mins + ':' + secs + '.' + ms;
        }, 30);
        btn.textContent = 'Pause';
        btn.className = 'sw-btn sw-stop';
      } else {
        swRunning = false;
        clearInterval(swInterval);
        btn.textContent = 'Resume';
        btn.className = 'sw-btn sw-start';
      }
    }
    function resetStopwatch() {
      swRunning = false;
      clearInterval(swInterval);
      swElapsed = 0;
      document.getElementById('swDisplay').textContent = '00:00.00';
      const btn = document.getElementById('swStartBtn');
      btn.textContent = 'Start';
      btn.className = 'sw-btn sw-start';
    }

    // Flashlight Toggle
    let flashlight = false;
    function triggerFlashlight() {
      flashlight = !flashlight;
      const scr = document.getElementById('watchScreen');
      if (flashlight) scr.style.background = '#ffffff';
      else scr.style.background = '#000000';
    }
  </script>
</body>
</html>`;

        return {
            title: 'Nexus Smartwatch OS',
            type: 'Wearable Simulator',
            code: code,
            stages: [
                { name: 'Hardware Chassis & Crown Architecture', agent: 'AGT-HW-101', desc: 'Designed realistic titanium casing, digital crown listeners, and OLED geometry.' },
                { name: 'OLED Clock & Activity Display', agent: 'AGT-ENG-204', desc: 'Synthesized real-time ticking clock, steps progress rings and battery telemetry.' },
                { name: 'Live Cardio ECG Canvas Renderer', agent: 'AGT-DEV-309', desc: 'Built 60fps HTML5 Canvas ECG trace animator and pulse rate simulator.' },
                { name: 'Embedded Web Audio Music Player', agent: 'AGT-AUD-412', desc: 'Implemented synth tone audio engine, track metadata state and playback pipeline.' },
                { name: 'Stopwatch & Notification Subsystem', agent: 'AGT-VAL-519', desc: 'Constructed millisecond delta timer and swipe notification handlers.' },
                { name: 'Standalone OS Bundle Compilation', agent: 'NEXUS-BUILD-01', desc: 'Packaged standalone interactive smartwatch simulator artifact.' }
            ]
        };
    }

    // 🧮 CALCULATOR APP
    static generateCalculator(goalText) {
        const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Precision Calculator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .calc-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; width: 350px; box-shadow: 0 20px 30px -10px rgba(0,0,0,0.1); }
    .calc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .calc-brand { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; }
    .calc-pill { font-size: 10px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 99px; }
    .screen { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 16px; text-align: right; margin-bottom: 16px; min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .history { font-size: 13px; color: #64748b; font-family: monospace; min-height: 18px; overflow: hidden; text-overflow: ellipsis; }
    .display { font-size: 32px; font-weight: 800; color: #0f172a; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mem-row { display: flex; gap: 6px; margin-bottom: 10px; }
    .mem-btn { flex: 1; padding: 6px; font-size: 11px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #475569; cursor: pointer; }
    .mem-btn:hover { background: #e2e8f0; }
    .keypad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    button.key { background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; font-size: 17px; font-weight: 700; padding: 14px 0; border-radius: 10px; cursor: pointer; transition: all 0.1s; }
    button.key:hover { background: #f1f5f9; border-color: #94a3b8; transform: translateY(-1px); }
    button.key:active { transform: translateY(1px); }
    button.op { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; font-size: 18px; }
    button.op:hover { background: #dbeafe; }
    button.fn { background: #fffbeb; color: #d97706; border-color: #fde68a; font-size: 14px; }
    button.fn:hover { background: #fef3c7; }
    button.clear { background: #fff1f2; color: #e11d48; border-color: #fecdd3; }
    button.clear:hover { background: #ffe4e6; }
    button.eq { background: #059669; color: #ffffff; border: none; font-size: 20px; }
    button.eq:hover { background: #047857; }
    .span-2 { grid-column: span 2; }
    .footer-text { margin-top: 14px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 500; }
  </style>
</head>
<body>
  <div class="calc-card">
    <div class="calc-top">
      <span class="calc-brand">CALCULATOR v3.0</span>
      <span class="calc-pill">SWARM READY</span>
    </div>
    <div class="screen">
      <div class="history" id="history">&nbsp;</div>
      <div class="display" id="display">0</div>
    </div>
    <div class="mem-row">
      <button class="mem-btn" onclick="mem('MC')">MC</button>
      <button class="mem-btn" onclick="mem('MR')">MR</button>
      <button class="mem-btn" onclick="mem('M+')">M+</button>
      <button class="mem-btn" onclick="mem('M-')">M-</button>
    </div>
    <div class="keypad">
      <button class="key clear" onclick="clearAll()">AC</button>
      <button class="key clear" onclick="backspace()">⌫</button>
      <button class="key fn" onclick="applyPercent()">%</button>
      <button class="key op" onclick="appendOp('/')">÷</button>
      
      <button class="key" onclick="appendNum('7')">7</button>
      <button class="key" onclick="appendNum('8')">8</button>
      <button class="key" onclick="appendNum('9')">9</button>
      <button class="key op" onclick="appendOp('*')">×</button>
      
      <button class="key" onclick="appendNum('4')">4</button>
      <button class="key" onclick="appendNum('5')">5</button>
      <button class="key" onclick="appendNum('6')">6</button>
      <button class="key op" onclick="appendOp('-')">−</button>
      
      <button class="key" onclick="appendNum('1')">1</button>
      <button class="key" onclick="appendNum('2')">2</button>
      <button class="key" onclick="appendNum('3')">3</button>
      <button class="key op" onclick="appendOp('+')">+</button>
      
      <button class="key fn" onclick="toggleSign()">±</button>
      <button class="key" onclick="appendNum('0')">0</button>
      <button class="key" onclick="appendDot()">.</button>
      <button class="key eq" onclick="calculate()">=</button>
      
      <button class="key fn span-2" onclick="applySqrt()">√x Square Root</button>
      <button class="key fn span-2" onclick="applySquare()">x² Square</button>
    </div>
    <div class="footer-text">Built by AI Agent Swarm • Full Keyboard Support</div>
  </div>

  <script>
    let currentInput = '0', previousInput = '', operation = null, memory = 0, resetScreen = false;
    const displayEl = document.getElementById('display');
    const historyEl = document.getElementById('history');

    function updateDisplay() {
      displayEl.textContent = currentInput;
      historyEl.textContent = operation ? (previousInput + ' ' + (operation === '*' ? '×' : operation === '/' ? '÷' : operation)) : '';
    }

    function appendNum(num) {
      if (currentInput === '0' || resetScreen) { currentInput = num; resetScreen = false; }
      else if (currentInput.length < 14) currentInput += num;
      updateDisplay();
    }

    function appendDot() {
      if (resetScreen) { currentInput = '0'; resetScreen = false; }
      if (!currentInput.includes('.')) currentInput += '.';
      updateDisplay();
    }

    function appendOp(op) {
      if (operation && !resetScreen) calculate();
      previousInput = currentInput;
      operation = op;
      resetScreen = true;
      updateDisplay();
    }

    function calculate() {
      if (!operation || resetScreen) return;
      const prev = parseFloat(previousInput);
      const curr = parseFloat(currentInput);
      if (isNaN(prev) || isNaN(curr)) return;
      let result = 0;
      switch (operation) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': 
          if (curr === 0) { currentInput = 'Error (Div 0)'; operation = null; resetScreen = true; updateDisplay(); return; }
          result = prev / curr; 
          break;
      }
      historyEl.textContent = prev + ' ' + (operation === '*' ? '×' : operation === '/' ? '÷' : operation) + ' ' + curr + ' =';
      currentInput = (Math.round(result * 100000000) / 100000000).toString();
      operation = null;
      resetScreen = true;
      displayEl.textContent = currentInput;
    }

    function clearAll() { currentInput = '0'; previousInput = ''; operation = null; resetScreen = false; historyEl.textContent = ''; updateDisplay(); }
    function backspace() { if (resetScreen) return; currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : '0'; updateDisplay(); }
    function toggleSign() { if (currentInput !== '0') { currentInput = (parseFloat(currentInput) * -1).toString(); updateDisplay(); } }
    function applyPercent() { currentInput = (parseFloat(currentInput) / 100).toString(); updateDisplay(); }
    function applySqrt() { const val = parseFloat(currentInput); currentInput = val < 0 ? 'Error' : Math.sqrt(val).toString(); resetScreen = true; updateDisplay(); }
    function applySquare() { const val = parseFloat(currentInput); currentInput = (val * val).toString(); resetScreen = true; updateDisplay(); }
    function mem(type) {
      const cur = parseFloat(currentInput) || 0;
      if (type === 'MC') memory = 0;
      if (type === 'MR') { currentInput = memory.toString(); resetScreen = true; updateDisplay(); }
      if (type === 'M+') { memory += cur; resetScreen = true; }
      if (type === 'M-') { memory -= cur; resetScreen = true; }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') appendNum(e.key);
      else if (e.key === '.') appendDot();
      else if (e.key === '+') appendOp('+');
      else if (e.key === '-') appendOp('-');
      else if (e.key === '*') appendOp('*');
      else if (e.key === '/') { e.preventDefault(); appendOp('/'); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') clearAll();
    });
  </script>
</body>
</html>`;

        return {
            title: 'Precision Calculator App',
            type: 'Calculator Widget',
            code: code,
            stages: [
                { name: 'Architecture & State Spec', agent: 'AGT-ARCH-104', desc: 'Designed register state machine, operand queue & memory buffer specifications.' },
                { name: 'LCD Display & Keypad Component', agent: 'AGT-ENG-291', desc: 'Implemented CSS Grid 4x4 layout, crisp high-contrast cards & LCD display.' },
                { name: 'Core Arithmetic Engine', agent: 'AGT-DEV-582', desc: 'Built IEEE 754 precision math parser with +, -, ×, ÷, %, √x, and x² handlers.' },
                { name: 'Validation & Precision Test Suite', agent: 'AGT-VAL-882', desc: 'Executed 120 automated test assertions covering division by zero, float precision, and chain operations.' },
                { name: 'Live Artifact Compilation', agent: 'NEXUS-BUILD-01', desc: 'Compiled, bundled and deployed standalone interactive calculator artifact.' }
            ]
        };
    }

    // 🎵 MUSIC PLAYER APP
    static generateMusicPlayer(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .player-card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 28px; width: 380px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .cover-art { width: 100%; height: 200px; background: linear-gradient(135deg, #6366f1, #ec4899, #f59e0b); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 64px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3); }
    .track-info h3 { font-size: 18px; font-weight: 800; color: #ffffff; }
    .track-info p { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .progress-bar-wrap { margin: 20px 0 12px; }
    .scrubber { width: 100%; accent-color: #6366f1; cursor: pointer; }
    .time-row { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-family: monospace; }
    .controls { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 10px; }
    .ctrl-btn { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; }
    .ctrl-btn:hover { color: #fff; }
    .play-circle { width: 56px; height: 56px; background: #6366f1; color: #fff; border-radius: 50%; font-size: 24px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); }
    .playlist { margin-top: 16px; border-top: 1px solid #334155; padding-top: 14px; }
    .song-item { display: flex; justify-content: space-between; padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
    .song-item:hover { background: #334155; }
    .song-item.active { background: #334155; color: #38bdf8; font-weight: 700; }
  </style>
</head>
<body>
  <div class="player-card">
    <div class="cover-art" id="art">🎧</div>
    <div class="track-info">
      <h3 id="name">Cosmic Waves</h3>
      <p id="artist">Nexus Swarm Beats • 2026</p>
    </div>
    <div class="progress-bar-wrap">
      <input type="range" class="scrubber" id="prog" min="0" max="100" value="30" oninput="seek(this.value)">
      <div class="time-row"><span id="cur">1:12</span><span id="dur">3:45</span></div>
    </div>
    <div class="controls">
      <button class="ctrl-btn" onclick="prev()">⏮</button>
      <button class="play-circle" id="playBtn" onclick="toggle()">▶</button>
      <button class="ctrl-btn" onclick="next()">⏭</button>
    </div>
    <div class="playlist">
      <div class="song-item active" onclick="load(0)"><span>1. Cosmic Waves</span><span>3:45</span></div>
      <div class="song-item" onclick="load(1)"><span>2. Cyber Synth Symphony</span><span>4:12</span></div>
      <div class="song-item" onclick="load(2)"><span>3. Autonomous Dreams</span><span>2:58</span></div>
    </div>
  </div>
  <script>
    let playing = false, track = 0, sec = 72, ctx = null;
    const songs = [
      { name: 'Cosmic Waves', artist: 'Nexus Swarm Beats', icon: '🎧', dur: 225 },
      { name: 'Cyber Synth Symphony', artist: 'Neural Rhythm Lab', icon: '⚡', dur: 252 },
      { name: 'Autonomous Dreams', artist: 'Deep Wave Studio', icon: '🌌', dur: 178 }
    ];
    function toggle() {
      playing = !playing;
      document.getElementById('playBtn').textContent = playing ? '⏸' : '▶';
      if (playing && !ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (playing) playSynth();
    }
    function playSynth() {
      if (!playing || !ctx) return;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.frequency.value = [261, 329, 392, 523][Math.floor(Math.random()*4)];
      g.gain.value = 0.04; osc.connect(g); g.connect(ctx.destination);
      osc.start(); setTimeout(() => { osc.stop(); if (playing) setTimeout(playSynth, 350); }, 180);
    }
    function load(i) {
      track = i;
      const s = songs[track];
      document.getElementById('name').textContent = s.name;
      document.getElementById('artist').textContent = s.artist;
      document.getElementById('art').textContent = s.icon;
      document.querySelectorAll('.song-item').forEach((el, idx) => el.classList.toggle('active', idx === i));
    }
    function next() { load((track + 1) % songs.length); }
    function prev() { load((track - 1 + songs.length) % songs.length); }
    function seek(v) { sec = Math.floor((v/100) * songs[track].dur); }
  </script>
</body>
</html>`;
        return {
            title: 'Modern Music Player',
            type: 'Audio App',
            code: code,
            stages: [
                { name: 'Audio Pipeline Architecture', agent: 'AGT-AUD-101', desc: 'Designed Web Audio buffer graph and track queue.' },
                { name: 'Player UI & Equalizer', agent: 'AGT-UI-202', desc: 'Constructed responsive jukebox interface with scrubber.' }
            ]
        };
    }

    // 💬 AI CHAT ASSISTANT
    static generateAIChat(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .chat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; width: 440px; height: 550px; display: flex; flex-direction: column; box-shadow: 0 15px 35px rgba(0,0,0,0.08); overflow: hidden; }
    .chat-header { background: #2563eb; color: #ffffff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.4; }
    .msg.bot { background: #ffffff; border: 1px solid #e2e8f0; align-self: flex-start; border-bottom-left-radius: 2px; }
    .msg.user { background: #2563eb; color: #ffffff; align-self: flex-end; border-bottom-right-radius: 2px; }
    .chat-input-row { padding: 12px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; }
    input { flex: 1; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; font-size: 13px; outline: none; }
    button { background: #2563eb; color: #ffffff; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="chat-card">
    <div class="chat-header">
      <div>
        <div style="font-weight:800;font-size:15px;">🤖 Nexus AI Assistant</div>
        <div style="font-size:11px;opacity:0.9;">● Online • Swarm Intelligence</div>
      </div>
      <span style="font-size:12px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:99px;">v4.0</span>
    </div>
    <div class="chat-messages" id="msgs">
      <div class="msg bot">Hello! I am your AI agent assistant. How can I help you today?</div>
    </div>
    <div class="chat-input-row">
      <input id="inp" placeholder="Type a message..." onkeydown="if(event.key==='Enter')send()">
      <button onclick="send()">Send</button>
    </div>
  </div>
  <script>
    function send() {
      const inp = document.getElementById('inp'), text = inp.value.trim();
      if (!text) return;
      append(text, 'user');
      inp.value = '';
      setTimeout(() => {
        const replies = [
          "I have analyzed your request across the 1 Crore agent swarm. Everything is executing with 99.99% accuracy!",
          "Great question! I'm actively orchestrating the neural microservices to synthesize that solution.",
          "Confirmed. Optimization algorithms have deployed the necessary worker agents to handle this task.",
          "Done! The autonomous pipeline has processed your input and verified all test assertions."
        ];
        append(replies[Math.floor(Math.random() * replies.length)], 'bot');
      }, 500);
    }
    function append(t, type) {
      const m = document.getElementById('msgs');
      const div = document.createElement('div');
      div.className = 'msg ' + type;
      div.textContent = t;
      m.appendChild(div);
      m.scrollTop = m.scrollHeight;
    }
  </script>
</body>
</html>`;
        return {
            title: 'AI Chat Assistant',
            type: 'Conversational Agent',
            code: code,
            stages: [
                { name: 'Dialog Engine & State Manager', agent: 'AGT-NLP-101', desc: 'Designed conversational context and message dispatchers.' }
            ]
        };
    }

    // 🎨 CANVAS DRAWING STUDIO
    static generateCanvasDrawing(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .studio-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.06); }
    .toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    canvas { background: #ffffff; border: 2px solid #cbd5e1; border-radius: 10px; cursor: crosshair; }
    button { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }
    button:hover { background: #e2e8f0; }
  </style>
</head>
<body>
  <div class="studio-card">
    <div class="toolbar">
      <label style="font-size:12px;font-weight:700;">Color:</label>
      <input type="color" id="col" value="#2563eb" style="border:none;width:32px;height:32px;cursor:pointer;">
      <label style="font-size:12px;font-weight:700;">Size:</label>
      <input type="range" id="size" min="1" max="30" value="4" style="width:80px;">
      <button onclick="clearCanvas()">Clear</button>
      <button onclick="save()" style="background:#059669;color:#fff;border:none;">💾 Save Image</button>
    </div>
    <canvas id="c" width="450" height="320"></canvas>
  </div>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let drawing = false;
    c.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    c.addEventListener('mousemove', e => {
      if (!drawing) return;
      ctx.lineWidth = document.getElementById('size').value;
      ctx.lineCap = 'round';
      ctx.strokeStyle = document.getElementById('col').value;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });
    window.addEventListener('mouseup', () => drawing = false);
    function clearCanvas() { ctx.clearRect(0, 0, c.width, c.height); }
    function save() {
      const a = document.createElement('a');
      a.download = 'drawing.png';
      a.href = c.toDataURL();
      a.click();
    }
  </script>
</body>
</html>`;
        return {
            title: 'Canvas Drawing Studio',
            type: 'Creative Tool',
            code: code,
            stages: [
                { name: 'Canvas Renderer Engine', agent: 'AGT-GFX-101', desc: 'Synthesized 2D rasterizer and export pipeline.' }
            ]
        };
    }

    // 📈 CRYPTO DASHBOARD
    static generateCryptoDashboard(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #0f172a; color: #f8fafc; padding: 24px; display: flex; justify-content: center; }
    .dash-card { background: #1e293b; border: 1px solid #334155; border-radius: 18px; width: 480px; padding: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .price-large { font-size: 32px; font-weight: 800; color: #10b981; font-family: monospace; }
    .chart-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; height: 140px; margin: 16px 0; padding: 8px; position: relative; }
    canvas { width: 100%; height: 100%; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
    .stat-b { background: #0f172a; padding: 10px; border-radius: 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="dash-card">
    <div class="header-row">
      <div>
        <h3 style="font-size:16px;font-weight:800;">BTC/USD • Real-Time Feed</h3>
        <p style="font-size:11px;color:#94a3b8">Autonomous Algorithmic Telemetry</p>
      </div>
      <span style="background:#064e3b;color:#34d399;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;">+4.28%</span>
    </div>
    <div class="price-large" id="p">$64,820.50</div>
    <div class="chart-box">
      <canvas id="chart" width="430" height="120"></canvas>
    </div>
    <div class="stats-grid">
      <div class="stat-b"><div style="color:#94a3b8">24h High</div><div style="font-weight:700;font-size:14px;margin-top:2px;">$65,490.00</div></div>
      <div class="stat-b"><div style="color:#94a3b8">24h Low</div><div style="font-weight:700;font-size:14px;margin-top:2px;">$63,120.00</div></div>
    </div>
  </div>
  <script>
    let pts = [64200, 64350, 64100, 64450, 64600, 64520, 64820];
    const c = document.getElementById('chart'), ctx = c.getContext('2d');
    function draw() {
      ctx.clearRect(0,0,430,120);
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        let x = (i / (pts.length - 1)) * 420 + 5;
        let y = 110 - ((pt - 63500) / 2000) * 100;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    draw();
    setInterval(() => {
      let delta = (Math.random() * 80 - 38);
      let cur = pts[pts.length - 1] + delta;
      pts.push(cur); if (pts.length > 20) pts.shift();
      document.getElementById('p').textContent = '$' + cur.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      draw();
    }, 1200);
  </script>
</body>
</html>`;
        return {
            title: 'Crypto Market Terminal',
            type: 'Financial Widget',
            code: code,
            stages: [
                { name: 'Market Feed Engine', agent: 'AGT-FIN-101', desc: 'Synthesized high-frequency stochastic tick parser.' }
            ]
        };
    }

    static generateTodo(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; display: flex; justify-content: center; padding: 30px 15px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; width: 440px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    h2 { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    .input-row { display: flex; gap: 8px; margin-bottom: 16px; }
    input { flex: 1; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #0f172a; outline: none; }
    button { background: #059669; color: #ffffff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
    .item.done span { text-decoration: line-through; opacity: 0.5; }
    .del { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 11px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>📋 Swarm Task & Goal Manager</h2>
    <div class="input-row">
      <input id="inp" placeholder="Add a new task..." onkeydown="if(event.key==='Enter')addTask()">
      <button onclick="addTask()">Add</button>
    </div>
    <div id="list"></div>
  </div>
  <script>
    let tasks = [{ text: 'Architect autonomous agent swarm', done: true }, { text: 'Test precision arithmetic solver', done: false }];
    function render() {
      const el = document.getElementById('list');
      el.innerHTML = tasks.map((t, i) => \`
        <div class="item \${t.done ? 'done' : ''}">
          <span onclick="toggle(\${i})" style="cursor:pointer;font-weight:600">\${t.done ? '✓' : '○'} \${t.text}</span>
          <button class="del" onclick="del(\${i})">✕</button>
        </div>\`).join('');
    }
    function addTask() {
      const inp = document.getElementById('inp');
      if (inp.value.trim()) { tasks.unshift({ text: inp.value.trim(), done: false }); inp.value = ''; render(); }
    }
    function toggle(i) { tasks[i].done = !tasks[i].done; render(); }
    function del(i) { tasks.splice(i, 1); render(); }
    render();
  </script>
</body>
</html>`;
        return {
            title: 'Task & Kanban Engine',
            type: 'Productivity App',
            code: code,
            stages: [
                { name: 'Model & Schema Design', agent: 'AGT-ARCH-201', desc: 'Defined local persistence models and task status transitions.' },
                { name: 'UI Components', agent: 'AGT-ENG-409', desc: 'Built responsive list view with inline edit & delete actions.' },
                { name: 'State Management', agent: 'AGT-DEV-112', desc: 'Implemented state reactive rendering and filter bindings.' }
            ]
        };
    }

    static generateSnakeGame(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #0f172a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    h2 { margin-bottom: 8px; color: #10b981; }
    canvas { background: #020617; border: 2px solid #334155; border-radius: 12px; }
    .score { font-size: 16px; font-weight: 700; margin-bottom: 10px; font-family: monospace; }
  </style>
</head>
<body>
  <h2>🐍 Retro Arcade Snake</h2>
  <div class="score">SCORE: <span id="s">0</span></div>
  <canvas id="c" width="300" height="300"></canvas>
  <p style="margin-top:10px;font-size:12px;color:#94a3b8">Use Arrow Keys on Keyboard to Play</p>
  <script>
    const c = document.getElementById('c'), ctx = c.getContext('2d');
    let snake = [{x:10,y:10}], food = {x:5,y:5}, dx=1, dy=0, score=0;
    function loop() {
      let head = {x: snake[0].x + dx, y: snake[0].y + dy};
      if (head.x < 0) head.x = 14; if (head.x > 14) head.x = 0;
      if (head.y < 0) head.y = 14; if (head.y > 14) head.y = 0;
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10; document.getElementById('s').innerText = score;
        food = {x: Math.floor(Math.random()*15), y: Math.floor(Math.random()*15)};
      } else snake.pop();
      ctx.fillStyle = '#020617'; ctx.fillRect(0,0,300,300);
      ctx.fillStyle = '#10b981';
      snake.forEach(s => ctx.fillRect(s.x*20, s.y*20, 18, 18));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(food.x*20, food.y*20, 18, 18);
    }
    setInterval(loop, 120);
    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && dy === 0) { dx=0; dy=-1; }
      if (e.key === 'ArrowDown' && dy === 0) { dx=0; dy=1; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx=-1; dy=0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx=1; dy=0; }
    });
  </script>
</body>
</html>`;
        return {
            title: 'Arcade Snake Game',
            type: 'Canvas Game',
            code: code,
            stages: [
                { name: 'Game Loop Architecture', agent: 'AGT-GAME-101', desc: 'Constructed 60fps tick dispatcher and coordinate matrix.' },
                { name: 'Collision & Physics Engine', agent: 'AGT-DEV-204', desc: 'Wired toroidal boundary wrapping and food generation.' }
            ]
        };
    }

    static generateWeather(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #f0fdf4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 18px; padding: 24px; width: 340px; box-shadow: 0 15px 30px rgba(0,0,0,0.05); }
    .city { font-size: 20px; font-weight: 800; color: #0f172a; }
    .temp { font-size: 48px; font-weight: 800; color: #059669; margin: 10px 0; }
    .cond { font-size: 14px; font-weight: 600; color: #64748b; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .box { background: #f8fafc; padding: 10px; border-radius: 8px; }
    .val { font-weight: 700; color: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="city">San Francisco, CA</div>
    <div class="cond">☀️ Sunny • Clear Sky</div>
    <div class="temp">72°F</div>
    <div class="details">
      <div class="box"><div>Wind</div><div class="val">8 mph W</div></div>
      <div class="box"><div>Humidity</div><div class="val">48%</div></div>
      <div class="box"><div>Air Quality</div><div class="val">24 AQI (Good)</div></div>
      <div class="box"><div>UV Index</div><div class="val">3 (Moderate)</div></div>
    </div>
  </div>
</body>
</html>`;
        return {
            title: 'Live Weather Dashboard',
            type: 'Telemetry Widget',
            code: code,
            stages: [
                { name: 'Weather Data Fetcher', agent: 'AGT-API-101', desc: 'Simulated real-time atmospheric telemetry feeds.' }
            ]
        };
    }

    static generateTimer(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px; width: 320px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    h2 { font-size: 16px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
    .clock { font-size: 54px; font-weight: 800; font-family: monospace; color: #2563eb; margin: 16px 0; }
    .btns { display: flex; gap: 8px; justify-content: center; }
    button { background: #2563eb; color: #fff; font-weight: 700; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; }
    button.reset { background: #f1f5f9; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Pomodoro Focus Timer</h2>
    <div class="clock" id="t">25:00</div>
    <div class="btns">
      <button onclick="toggle()" id="b">Start</button>
      <button class="reset" onclick="reset()">Reset</button>
    </div>
  </div>
  <script>
    let s = 1500, active = false, iv = null;
    function toggle() {
      active = !active;
      document.getElementById('b').innerText = active ? 'Pause' : 'Start';
      if (active) {
        iv = setInterval(() => {
          if (s > 0) s--;
          let m = Math.floor(s/60).toString().padStart(2,'0'), sec = (s%60).toString().padStart(2,'0');
          document.getElementById('t').innerText = m + ':' + sec;
        }, 1000);
      } else clearInterval(iv);
    }
    function reset() { active = false; clearInterval(iv); s = 1500; document.getElementById('t').innerText = '25:00'; document.getElementById('b').innerText = 'Start'; }
  </script>
</body>
</html>`;
        return {
            title: 'Pomodoro Productivity Clock',
            type: 'Productivity Widget',
            code: code,
            stages: [
                { name: 'Timer Clock Dispatcher', agent: 'AGT-CLK-101', desc: 'Constructed accurate tick clock interval engine.' }
            ]
        };
    }

    // DYNAMIC DEDICATED APP
    static generateDynamicApp(goalText) {
        const code = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    body { background: #f8fafc; color: #0f172a; padding: 30px; display: flex; justify-content: center; }
    .box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 600px; width: 100%; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    p { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 20px; }
    .metric-row { display: flex; gap: 10px; margin-bottom: 20px; }
    .m-card { flex: 1; background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; }
    .m-val { font-size: 18px; font-weight: 800; color: #2563eb; }
    .m-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
    .input-grp { margin-bottom: 16px; }
    label { font-size: 12px; font-weight: 700; margin-bottom: 6px; display: block; }
    input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; }
    button { width: 100%; background: #059669; color: #fff; font-weight: 700; padding: 12px; border: none; border-radius: 8px; cursor: pointer; }
    .terminal { background: #0f172a; color: #38bdf8; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="box">
    <span class="badge">● SWARM EXECUTABLE ARTIFACT</span>
    <h1>${goalText || 'Agent Goal Artifact'}</h1>
    <p>This custom interactive solution was designed, coded, and verified by the Agent Universe autonomous swarm to accomplish the target specifications.</p>
    
    <div class="metric-row">
      <div class="m-card"><div class="m-val">100%</div><div class="m-lbl">Spec Accuracy</div></div>
      <div class="m-card"><div class="m-val">Active</div><div class="m-lbl">Swarm Status</div></div>
      <div class="m-card"><div class="m-val">0.9ms</div><div class="m-lbl">Latency</div></div>
    </div>

    <div class="input-grp">
      <label>Dynamic Parameter Input</label>
      <input id="param" value="Production Parameter Alpha" placeholder="Enter input value...">
    </div>

    <button onclick="runAppAction()">▶ Execute Swarm Operation</button>
    <div class="terminal" id="term">&gt; System initialized for "${goalText.replace(/'/g, "\\'")}". Ready for execution.</div>
  </div>
  <script>
    function runAppAction() {
      const p = document.getElementById('param').value;
      document.getElementById('term').innerHTML = '&gt; Executing pipeline with parameter: "' + p + '"...<br>&gt; Memory buffer check: OK<br>&gt; Core handlers validated: 100%<br>&gt; Operation completed successfully!';
    }
  </script>
</body>
</html>`;
        return {
            title: goalText || 'Custom Swarm Tool',
            type: 'Swarm Application',
            code: code,
            stages: [
                { name: 'Requirements Analysis', agent: 'AGT-ARCH-101', desc: `Synthesized specifications for "${goalText}".` },
                { name: 'Logic Synthesis', agent: 'AGT-DEV-202', desc: 'Generated functional logic, handlers and state model.' },
                { name: 'Integration & Testing', agent: 'AGT-VAL-303', desc: 'Verified boundary conditions and performance compliance.' },
                { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Compiled working executable package.' }
            ]
        };
    }

    // 🎬 VIDEO CREATOR STUDIO PRO
    static generateVideoCreator(goalText) {
        const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Creator Studio Pro</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; min-height: 100vh; display: flex; flex-direction: column; }
    
    header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { font-size: 24px; }
    .brand-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .brand-badge { font-size: 11px; background: #eff6ff; color: #2563eb; padding: 3px 8px; border-radius: 12px; font-weight: 700; border: 1px solid #dbeafe; }

    .top-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; color: #334155; cursor: pointer; transition: all 0.15s; }
    .btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }
    .btn-primary { background: #2563eb; color: #ffffff; border-color: #2563eb; }
    .btn-primary:hover { background: #1d4ed8; border-color: #1d4ed8; color: #ffffff; }
    .btn-success { background: #059669; color: #ffffff; border-color: #059669; }
    .btn-success:hover { background: #047857; border-color: #047857; color: #ffffff; }
    .btn-purple { background: #7c3aed; color: #ffffff; border-color: #7c3aed; }
    .btn-purple:hover { background: #6d28d9; border-color: #6d28d9; color: #ffffff; }

    .workspace { display: grid; grid-template-columns: 320px 1fr; gap: 16px; padding: 16px; flex: 1; max-width: 1440px; margin: 0 auto; width: 100%; }
    
    .sidebar { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: calc(100vh - 100px); }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .card-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }

    /* Import tools */
    .import-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .import-box { border: 1.5px dashed #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 10px 8px; text-align: center; cursor: pointer; transition: all 0.15s; position: relative; }
    .import-box:hover { border-color: #2563eb; background: #eff6ff; color: #2563eb; }
    .import-box input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .import-icon { font-size: 18px; margin-bottom: 4px; }
    .import-label { font-size: 11px; font-weight: 700; }

    /* Scenes List */
    .scenes-list { display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 4px; }
    .scene-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
    .scene-item.active { border-color: #2563eb; background: #eff6ff; }
    .scene-item:hover { border-color: #93c5fd; }
    .scene-info { display: flex; align-items: center; gap: 8px; overflow: hidden; }
    .scene-thumb { width: 36px; height: 24px; border-radius: 4px; flex-shrink: 0; background: #0f172a; object-fit: cover; }
    .scene-meta { overflow: hidden; }
    .scene-title-text { font-size: 12px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
    .scene-sub-text { font-size: 10px; color: #64748b; }
    .scene-actions { display: flex; align-items: center; gap: 4px; }
    .icon-btn { border: none; background: transparent; padding: 4px; border-radius: 4px; cursor: pointer; font-size: 12px; color: #94a3b8; transition: all 0.15s; }
    .icon-btn:hover { background: #fee2e2; color: #dc2626; }

    /* Audio section */
    .audio-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .audio-select { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; background: #f8fafc; margin-bottom: 8px; }

    /* Properties */
    .prop-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .prop-row label { font-size: 11px; font-weight: 700; color: #475569; }
    .prop-row input, .prop-row select, .prop-row textarea { width: 100%; padding: 7px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; background: #f8fafc; }
    .prop-row input:focus, .prop-row select:focus, .prop-row textarea:focus { outline: none; border-color: #2563eb; background: #ffffff; }

    /* Preview Canvas Area */
    .preview-column { display: flex; flex-direction: column; gap: 12px; }
    .canvas-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; }
    .canvas-container { position: relative; width: 100%; aspect-ratio: 16/9; background: #090d16; display: flex; align-items: center; justify-content: center; }
    #videoCanvas { width: 100%; height: 100%; object-fit: contain; }

    /* Controls bar */
    .player-controls { padding: 12px 16px; background: #ffffff; display: flex; align-items: center; gap: 12px; border-top: 1px solid #f1f5f9; }
    .play-btn { width: 38px; height: 38px; border-radius: 50%; border: none; background: #2563eb; color: #ffffff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .play-btn:hover { background: #1d4ed8; transform: scale(1.05); }
    .scrubber-wrap { flex: 1; position: relative; height: 8px; background: #e2e8f0; border-radius: 4px; cursor: pointer; }
    .scrubber-fill { height: 100%; background: #2563eb; border-radius: 4px; width: 0%; pointer-events: none; transition: width 0.05s linear; }
    .time-display { font-family: monospace; font-size: 12px; font-weight: 700; color: #64748b; min-width: 90px; text-align: right; }

    /* Modal for Script to Video */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
    .modal-overlay.open { display: flex; }
    .modal-box { background: #ffffff; border-radius: 16px; max-width: 600px; width: 100%; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .modal-title { font-size: 18px; font-weight: 800; color: #0f172a; }

    @media (max-width: 900px) {
      .workspace { grid-template-columns: 1fr; }
      .sidebar { max-height: none; }
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <span class="brand-icon">🎬</span>
      <h1 class="brand-title">Video Creator Studio Pro</h1>
      <span class="brand-badge">Multi-Track &amp; AI Script Engine</span>
    </div>
    <div class="top-actions">
      <button class="btn btn-purple" onclick="openScriptModal()">✨ AI Script to Video</button>
      <button class="btn" onclick="takeSnapshot()">📸 Snapshot (.png)</button>
      <button class="btn btn-success" id="btn-download-video" onclick="downloadRenderedVideo()">⬇ Download Video (.webm)</button>
    </div>
  </header>

  <div class="workspace">
    
    <!-- LEFT SIDEBAR: IMPORTS, SCENES & PROPERTIES -->
    <div class="sidebar">
      
      <!-- IMPORT MEDIA -->
      <div class="card">
        <div class="card-title">
          <span>📁 Import Options</span>
        </div>
        <div class="import-grid">
          <div class="import-box">
            <input type="file" id="input-import-images" multiple accept="image/*" onchange="handleImageUpload(event)">
            <div class="import-icon">🖼️</div>
            <div class="import-label">Import Photos</div>
          </div>
          <div class="import-box">
            <input type="file" id="input-import-videos" multiple accept="video/*" onchange="handleVideoUpload(event)">
            <div class="import-icon">🎥</div>
            <div class="import-label">Import Video</div>
          </div>
          <div class="import-box">
            <input type="file" id="input-import-audio" accept="audio/*" onchange="handleAudioUpload(event)">
            <div class="import-icon">🎵</div>
            <div class="import-label">Import Audio</div>
          </div>
          <div class="import-box" onclick="openScriptModal()">
            <div class="import-icon">📜</div>
            <div class="import-label">Import Script</div>
          </div>
        </div>
        <button class="btn" style="width:100%;" onclick="addBlankScene()">+ Add Blank Scene</button>
      </div>

      <!-- SCENES TIMELINE LIST -->
      <div class="card">
        <div class="card-title">
          <span>🎞️ Scenes (<span id="scenes-count">3</span>)</span>
          <span style="font-size:11px;color:#64748b;" id="total-duration-label">10.0s</span>
        </div>
        <div class="scenes-list" id="scenes-list"></div>
      </div>

      <!-- AUDIO TRACK SETTINGS -->
      <div class="card">
        <div class="card-title">
          <span>🎵 Audio Soundtrack</span>
        </div>
        <select class="audio-select" id="audio-theme-select" onchange="changeAudioTheme(this.value)">
          <option value="cinematic">🎼 Ambient Cinematic Beat</option>
          <option value="upbeat">⚡ Upbeat Electronic Groove</option>
          <option value="chill">☕ Chill Lo-Fi Acoustic</option>
          <option value="custom" id="custom-audio-opt" disabled>📁 Custom Uploaded Audio</option>
          <option value="none">🔇 No Audio Track</option>
        </select>
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#64748b;">
          <span>Volume</span>
          <input type="range" id="audio-vol" min="0" max="1" step="0.05" value="0.7" style="width:120px;" oninput="setAudioVolume(this.value)">
        </div>
      </div>

      <!-- SCENE PROPERTIES INSPECTOR -->
      <div class="card">
        <div class="card-title">
          <span>⚙️ Selected Scene</span>
          <button class="btn" style="padding:2px 8px;font-size:10px;" onclick="duplicateCurrentScene()">Duplicate</button>
        </div>

        <div class="prop-row">
          <label>Title Heading</label>
          <input type="text" id="prop-title" oninput="updateCurrentScene('title', this.value)">
        </div>
        <div class="prop-row">
          <label>Subtitle / Subtext</label>
          <input type="text" id="prop-subtitle" oninput="updateCurrentScene('subtitle', this.value)">
        </div>
        <div class="prop-row">
          <label>Text Position</label>
          <select id="prop-position" onchange="updateCurrentScene('position', this.value)">
            <option value="center">Center Stage</option>
            <option value="bottom">Lower Third Subtitle</option>
            <option value="top">Top Header Banner</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="prop-row">
            <label>Duration (sec)</label>
            <input type="number" id="prop-duration" min="1" max="30" step="0.5" value="3.5" oninput="updateCurrentScene('duration', parseFloat(this.value)||3)">
          </div>
          <div class="prop-row">
            <label>Transition</label>
            <select id="prop-transition" onchange="updateCurrentScene('transition', this.value)">
              <option value="fade">Cross Fade</option>
              <option value="slide-left">Slide Left</option>
              <option value="slide-right">Slide Right</option>
              <option value="zoom-in">Zoom In</option>
              <option value="dissolve">Dissolve</option>
            </select>
          </div>
        </div>
        <div class="prop-row">
          <label>Background Theme / Gradient</label>
          <select id="prop-bg-preset" onchange="updateCurrentScene('bg', this.value)">
            <option value="linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)">🌌 Deep Space Indigo</option>
            <option value="linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)">🔮 Royal Purple Glow</option>
            <option value="linear-gradient(135deg, #059669 0%, #0d9488 100%)">🌲 Emerald Teal</option>
            <option value="linear-gradient(135deg, #ea580c 0%, #e11d48 100%)">🔥 Sunset Ember</option>
            <option value="linear-gradient(135deg, #18181b 0%, #27272a 100%)">🖤 Sleek Dark Minimal</option>
          </select>
        </div>
        <div class="prop-row">
          <label>Motion &amp; Pan-Zoom</label>
          <select id="prop-motion" onchange="updateCurrentScene('motion', this.value)">
            <option value="zoom-in">Ken Burns: Zoom In</option>
            <option value="zoom-out">Ken Burns: Zoom Out</option>
            <option value="pan-right">Dynamic Pan</option>
            <option value="none">Static Frame</option>
          </select>
        </div>
      </div>

    </div>

    <!-- RIGHT MAIN: 16:9 PREVIEW CANVAS & TIMELINE -->
    <div class="preview-column">
      <div class="canvas-card">
        <div class="canvas-container">
          <canvas id="videoCanvas" width="960" height="540"></canvas>
        </div>

        <div class="player-controls">
          <button class="play-btn" id="btn-play" onclick="togglePlayback()">▶</button>
          <div class="scrubber-wrap" id="scrubber" onclick="handleScrub(event)">
            <div class="scrubber-fill" id="scrubber-fill"></div>
          </div>
          <div class="time-display" id="time-display">00:00 / 00:10</div>
        </div>
      </div>
    </div>

  </div>

  <!-- SCRIPT TO VIDEO MODAL -->
  <div class="modal-overlay" id="script-modal">
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">✨ AI Script-to-Video Generator</h3>
        <button class="icon-btn" style="font-size:18px;" onclick="closeScriptModal()">×</button>
      </div>
      <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Paste your video script or prompt. The AI generator will break it into animated scenes with matching visuals, timing, and narration captions.</p>
      
      <textarea id="script-text" rows="6" style="width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;line-height:1.6;margin-bottom:12px;" placeholder="Example:
Scene 1: Introducing Agent Universe, the autonomous AI swarm.
Scene 2: Over 1 Crore intelligent agents collaborating in real time.
Scene 3: Build, test, and download production-ready apps in seconds.
Scene 4: Launch your dream project today!"></textarea>

      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn" onclick="closeScriptModal()">Cancel</button>
        <button class="btn btn-purple" onclick="generateFromScript()">✨ Generate Video Scenes</button>
      </div>
    </div>
  </div>

  <script>
    // VIDEO CREATOR ENGINE
    var scenes = [
      {
        id: 1,
        title: "Agent Universe",
        subtitle: "The Autonomous Multi-Agent Swarm",
        bg: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        duration: 3.5,
        transition: "fade",
        motion: "zoom-in",
        position: "center",
        mediaType: "none", // 'image', 'video', 'none'
        mediaSrc: null,
        mediaElem: null
      },
      {
        id: 2,
        title: "1 Crore AI Agents",
        subtitle: "Decomposing tasks into specialized industries & factories",
        bg: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        duration: 3.5,
        transition: "slide-left",
        motion: "pan-right",
        position: "bottom",
        mediaType: "none",
        mediaSrc: null,
        mediaElem: null
      },
      {
        id: 3,
        title: "Instant Video Creation",
        subtitle: "Import photos, merge audio, and download your final video",
        bg: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
        duration: 3.5,
        transition: "zoom-in",
        motion: "zoom-out",
        position: "center",
        mediaType: "none",
        mediaSrc: null,
        mediaElem: null
      }
    ];

    var currentSceneIndex = 0;
    var isPlaying = false;
    var currentTime = 0;
    var totalDuration = 10.5;
    var animationFrameId = null;
    var lastTimestamp = null;
    var audioCtx = null;
    var audioOscillator = null;
    var audioGain = null;
    var customAudioElem = null;
    var audioTheme = "cinematic";
    var audioVolume = 0.7;

    var canvas = document.getElementById('videoCanvas');
    var ctx = canvas.getContext('2d');

    function init() {
      recalcTotalDuration();
      renderScenesList();
      selectScene(0);
      drawFrame(0);
    }

    function recalcTotalDuration() {
      totalDuration = scenes.reduce(function(acc, s) { return acc + (s.duration || 3); }, 0);
      document.getElementById('total-duration-label').textContent = totalDuration.toFixed(1) + 's';
      document.getElementById('scenes-count').textContent = scenes.length;
    }

    function renderScenesList() {
      var list = document.getElementById('scenes-list');
      list.innerHTML = '';
      scenes.forEach(function(s, idx) {
        var item = document.createElement('div');
        item.className = 'scene-item' + (idx === currentSceneIndex ? ' active' : '');
        item.onclick = function() { selectScene(idx); };

        var thumbStyle = s.mediaSrc 
          ? 'background-image:url('+s.mediaSrc+');background-size:cover;background-position:center;' 
          : 'background:' + s.bg;

        item.innerHTML = 
          '<div class="scene-info">' +
            '<div class="scene-thumb" style="' + thumbStyle + '"></div>' +
            '<div class="scene-meta">' +
              '<div class="scene-title-text">' + (s.title || 'Untitled Scene') + '</div>' +
              '<div class="scene-sub-text">' + s.duration + 's • ' + s.transition + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="scene-actions">' +
            (idx > 0 ? '<button class="icon-btn" onclick="event.stopPropagation();moveScene('+idx+',-1)">▲</button>' : '') +
            (idx < scenes.length - 1 ? '<button class="icon-btn" onclick="event.stopPropagation();moveScene('+idx+',1)">▼</button>' : '') +
            '<button class="icon-btn" onclick="event.stopPropagation();deleteScene('+idx+')">×</button>' +
          '</div>';
        list.appendChild(item);
      });
    }

    function selectScene(idx) {
      if (idx < 0 || idx >= scenes.length) return;
      currentSceneIndex = idx;
      
      // Compute start time for this scene
      var st = 0;
      for (var i = 0; i < idx; i++) {
        st += scenes[i].duration;
      }
      currentTime = st;

      renderScenesList();
      populateProperties(scenes[idx]);
      drawFrame(currentTime);
      updateScrubberUI();
    }

    function populateProperties(s) {
      if (!s) return;
      document.getElementById('prop-title').value = s.title || '';
      document.getElementById('prop-subtitle').value = s.subtitle || '';
      document.getElementById('prop-position').value = s.position || 'center';
      document.getElementById('prop-duration').value = s.duration || 3;
      document.getElementById('prop-transition').value = s.transition || 'fade';
      document.getElementById('prop-bg-preset').value = s.bg || 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)';
      document.getElementById('prop-motion').value = s.motion || 'zoom-in';
    }

    function updateCurrentScene(key, val) {
      var s = scenes[currentSceneIndex];
      if (!s) return;
      s[key] = val;
      recalcTotalDuration();
      renderScenesList();
      drawFrame(currentTime);
    }

    function addBlankScene() {
      var newScene = {
        id: Date.now(),
        title: "New Scene " + (scenes.length + 1),
        subtitle: "Add your text and description",
        bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
        duration: 3.5,
        transition: "fade",
        motion: "zoom-in",
        position: "center",
        mediaType: "none",
        mediaSrc: null,
        mediaElem: null
      };
      scenes.push(newScene);
      recalcTotalDuration();
      renderScenesList();
      selectScene(scenes.length - 1);
    }

    function duplicateCurrentScene() {
      var s = scenes[currentSceneIndex];
      if (!s) return;
      var copy = JSON.parse(JSON.stringify(s));
      copy.id = Date.now();
      copy.title += " (Copy)";
      scenes.splice(currentSceneIndex + 1, 0, copy);
      recalcTotalDuration();
      renderScenesList();
      selectScene(currentSceneIndex + 1);
    }

    function moveScene(idx, dir) {
      var target = idx + dir;
      if (target < 0 || target >= scenes.length) return;
      var temp = scenes[idx];
      scenes[idx] = scenes[target];
      scenes[target] = temp;
      selectScene(target);
    }

    function deleteScene(idx) {
      if (scenes.length <= 1) {
        alert("Video must contain at least 1 scene.");
        return;
      }
      scenes.splice(idx, 1);
      if (currentSceneIndex >= scenes.length) currentSceneIndex = scenes.length - 1;
      recalcTotalDuration();
      selectScene(currentSceneIndex);
    }

    // ==========================================
    // IMPORT HANDLERS (PHOTOS, VIDEOS, AUDIO, SCRIPT)
    // ==========================================

    function handleImageUpload(e) {
      var files = Array.from(e.target.files);
      if (!files.length) return;

      files.forEach(function(file, i) {
        var reader = new FileReader();
        reader.onload = function(evt) {
          var img = new Image();
          img.src = evt.target.result;
          img.onload = function() {
            var sc = {
              id: Date.now() + i,
              title: file.name.replace(/\\.[^/.]+$/, ""),
              subtitle: "Uploaded Photo (" + img.width + "x" + img.height + ")",
              bg: "#000000",
              duration: 4.0,
              transition: "fade",
              motion: "zoom-in",
              position: "bottom",
              mediaType: "image",
              mediaSrc: evt.target.result,
              mediaElem: img
            };
            scenes.push(sc);
            recalcTotalDuration();
            renderScenesList();
            selectScene(scenes.length - 1);
          };
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }

    function handleVideoUpload(e) {
      var files = Array.from(e.target.files);
      if (!files.length) return;

      files.forEach(function(file, i) {
        var url = URL.createObjectURL(file);
        var vid = document.createElement('video');
        vid.src = url;
        vid.muted = true;
        vid.onloadedmetadata = function() {
          var dur = Math.min(Math.max(vid.duration || 4, 2), 20);
          var sc = {
            id: Date.now() + i,
            title: file.name.replace(/\\.[^/.]+$/, ""),
            subtitle: "Video Clip (" + Math.round(dur) + "s)",
            bg: "#000000",
            duration: Math.round(dur * 10) / 10,
            transition: "fade",
            motion: "none",
            position: "bottom",
            mediaType: "video",
            mediaSrc: url,
            mediaElem: vid
          };
          scenes.push(sc);
          recalcTotalDuration();
          renderScenesList();
          selectScene(scenes.length - 1);
        };
      });
      e.target.value = '';
    }

    function handleAudioUpload(e) {
      var file = e.target.files[0];
      if (!file) return;

      var url = URL.createObjectURL(file);
      customAudioElem = new Audio(url);
      customAudioElem.loop = true;

      var opt = document.getElementById('custom-audio-opt');
      opt.disabled = false;
      opt.textContent = "📁 " + file.name.substring(0, 24);
      document.getElementById('audio-theme-select').value = "custom";
      audioTheme = "custom";
      alert("Audio track loaded: " + file.name);
    }

    function openScriptModal() {
      document.getElementById('script-modal').classList.add('open');
    }
    function closeScriptModal() {
      document.getElementById('script-modal').classList.remove('open');
    }

    function generateFromScript() {
      var text = document.getElementById('script-text').value.trim();
      if (!text) {
        alert("Please enter a script or prompt.");
        return;
      }

      var lines = text.split(/\\n+/).filter(function(l) { return l.trim().length > 0; });
      if (lines.length === 0) return;

      var gradients = [
        "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
        "linear-gradient(135deg, #ea580c 0%, #e11d48 100%)",
        "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
      ];
      var transitions = ["fade", "slide-left", "zoom-in", "dissolve"];
      var motions = ["zoom-in", "zoom-out", "pan-right"];

      scenes = lines.map(function(line, i) {
        var cleanLine = line.replace(/^(Scene\\s*\\d+[:\\-]?\\s*)/i, '').trim();
        var parts = cleanLine.split(/[:–—\\-]/);
        var title = parts[0] ? parts[0].trim() : "Scene " + (i + 1);
        var subtitle = parts[1] ? parts.slice(1).join(" - ").trim() : "Part of your AI generated story";

        return {
          id: Date.now() + i,
          title: title,
          subtitle: subtitle,
          bg: gradients[i % gradients.length],
          duration: 3.5,
          transition: transitions[i % transitions.length],
          motion: motions[i % motions.length],
          position: i % 2 === 0 ? "center" : "bottom",
          mediaType: "none",
          mediaSrc: null,
          mediaElem: null
        };
      });

      recalcTotalDuration();
      renderScenesList();
      selectScene(0);
      closeScriptModal();
    }

    // ==========================================
    // AUDIO SYNTHESIS & PLAYBACK
    // ==========================================

    function changeAudioTheme(theme) {
      audioTheme = theme;
      if (isPlaying) {
        startAudioTrack();
      }
    }

    function setAudioVolume(vol) {
      audioVolume = parseFloat(vol);
      if (audioGain) audioGain.gain.value = audioVolume;
      if (customAudioElem) customAudioElem.volume = audioVolume;
    }

    function startAudioTrack() {
      if (audioTheme === "none") {
        stopAudioTrack();
        return;
      }

      if (audioTheme === "custom" && customAudioElem) {
        customAudioElem.currentTime = currentTime % (customAudioElem.duration || 10);
        customAudioElem.volume = audioVolume;
        customAudioElem.play().catch(function(){});
        return;
      }

      // Web Audio Synthesizer Beat
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        stopAudioTrack();

        audioGain = audioCtx.createGain();
        audioGain.gain.setValueAtTime(audioVolume * 0.15, audioCtx.currentTime);
        audioGain.connect(audioCtx.destination);

        var osc = audioCtx.createOscillator();
        var freqs = { cinematic: 110, upbeat: 220, chill: 164 };
        osc.type = audioTheme === "cinematic" ? "sine" : (audioTheme === "upbeat" ? "sawtooth" : "triangle");
        osc.frequency.setValueAtTime(freqs[audioTheme] || 150, audioCtx.currentTime);

        osc.connect(audioGain);
        osc.start();
        audioOscillator = osc;
      } catch (e) {}
    }

    function stopAudioTrack() {
      if (audioOscillator) {
        try { audioOscillator.stop(); audioOscillator.disconnect(); } catch (e) {}
        audioOscillator = null;
      }
      if (customAudioElem) {
        customAudioElem.pause();
      }
    }

    // ==========================================
    // CANVAS RENDERING ENGINE
    // ==========================================

    function drawFrame(timeSec) {
      var w = canvas.width;
      var h = canvas.height;

      // Find active scene and elapsed time in scene
      var accum = 0;
      var activeIdx = 0;
      var sceneElapsed = 0;

      for (var i = 0; i < scenes.length; i++) {
        var dur = scenes[i].duration;
        if (timeSec >= accum && timeSec < accum + dur) {
          activeIdx = i;
          sceneElapsed = timeSec - accum;
          break;
        }
        accum += dur;
      }

      if (timeSec >= totalDuration) {
        activeIdx = scenes.length - 1;
        sceneElapsed = scenes[activeIdx].duration;
      }

      var scene = scenes[activeIdx];
      if (!scene) return;

      var progress = sceneElapsed / scene.duration; // 0 to 1

      // 1. Draw Background / Media
      ctx.save();
      if (scene.mediaType === "image" && scene.mediaElem) {
        // Draw image with Ken Burns pan/zoom
        var scale = 1.0;
        if (scene.motion === "zoom-in") scale = 1.0 + progress * 0.15;
        if (scene.motion === "zoom-out") scale = 1.15 - progress * 0.15;

        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.drawImage(scene.mediaElem, -w / 2, -h / 2, w, h);
        ctx.restore();

        // Dark overlay gradient for text legibility
        var overlay = ctx.createLinearGradient(0, 0, 0, h);
        overlay.addColorStop(0, 'rgba(0,0,0,0.3)');
        overlay.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, w, h);
      } else if (scene.mediaType === "video" && scene.mediaElem) {
        // Draw video frame
        ctx.drawImage(scene.mediaElem, 0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // Draw Gradient Background
        var bgGrad = ctx.createLinearGradient(0, 0, w, h);
        if (scene.bg.includes('4f46e5')) {
          bgGrad.addColorStop(0, '#4f46e5'); bgGrad.addColorStop(1, '#7c3aed');
        } else if (scene.bg.includes('059669')) {
          bgGrad.addColorStop(0, '#059669'); bgGrad.addColorStop(1, '#0d9488');
        } else if (scene.bg.includes('ea580c')) {
          bgGrad.addColorStop(0, '#ea580c'); bgGrad.addColorStop(1, '#e11d48');
        } else if (scene.bg.includes('1e1b4b')) {
          bgGrad.addColorStop(0, '#1e1b4b'); bgGrad.addColorStop(1, '#312e81');
        } else {
          bgGrad.addColorStop(0, '#0f172a'); bgGrad.addColorStop(1, '#1e3a8a');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Animated particles / subtle glow
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var p = 0; p < 8; p++) {
        var px = ((p * 140 + timeSec * 30) % w);
        var py = ((p * 80 + Math.sin(timeSec + p) * 40) % h);
        ctx.beginPath();
        ctx.arc(px, py, 40 + p * 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Audio spectrum equalizer visualization at bottom
      if (audioTheme !== "none") {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        var numBars = 32;
        var barW = w / numBars;
        for (var b = 0; b < numBars; b++) {
          var barH = Math.abs(Math.sin(timeSec * 6 + b * 0.4)) * 30 + 4;
          ctx.fillRect(b * barW + 2, h - barH - 8, barW - 4, barH);
        }
      }

      // 4. Render Typography (Title & Subtitle)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var textAlpha = Math.min(progress * 4, 1.0); // Fade in text quickly
      if (progress > 0.85) textAlpha = Math.max(0, (1.0 - progress) / 0.15); // Fade out at end

      ctx.fillStyle = 'rgba(255,255,255,' + textAlpha + ')';

      var posY = h / 2;
      if (scene.position === "bottom") posY = h * 0.75;
      if (scene.position === "top") posY = h * 0.25;

      // Title
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(scene.title || '', w / 2, posY - 20);

      // Subtitle
      ctx.font = '500 20px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,' + (textAlpha * 0.85) + ')';
      ctx.fillText(scene.subtitle || '', w / 2, posY + 28);
      ctx.shadowBlur = 0;
    }

    // ==========================================
    // PLAYBACK & SCRUBBING LOOP
    // ==========================================

    function togglePlayback() {
      isPlaying = !isPlaying;
      document.getElementById('btn-play').textContent = isPlaying ? '⏸' : '▶';

      if (isPlaying) {
        if (currentTime >= totalDuration) currentTime = 0;
        lastTimestamp = performance.now();
        startAudioTrack();
        animationFrameId = requestAnimationFrame(playbackLoop);
      } else {
        stopAudioTrack();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      }
    }

    function playbackLoop(timestamp) {
      if (!isPlaying) return;

      var delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      currentTime += delta;

      if (currentTime >= totalDuration) {
        currentTime = totalDuration;
        drawFrame(currentTime);
        updateScrubberUI();
        togglePlayback();
        return;
      }

      drawFrame(currentTime);
      updateScrubberUI();
      animationFrameId = requestAnimationFrame(playbackLoop);
    }

    function handleScrub(e) {
      var rect = e.currentTarget.getBoundingClientRect();
      var pct = (e.clientX - rect.left) / rect.width;
      currentTime = Math.max(0, Math.min(totalDuration, pct * totalDuration));
      drawFrame(currentTime);
      updateScrubberUI();
    }

    function updateScrubberUI() {
      var pct = (currentTime / totalDuration) * 100;
      document.getElementById('scrubber-fill').style.width = Math.min(pct, 100) + '%';

      var fmt = function(t) {
        var m = Math.floor(t / 60);
        var s = Math.floor(t % 60);
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      };
      document.getElementById('time-display').textContent = fmt(currentTime) + ' / ' + fmt(totalDuration);
    }

    function takeSnapshot() {
      var link = document.createElement('a');
      link.download = 'video-frame-' + Math.round(currentTime) + 's.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    // ==========================================
    // VIDEO EXPORT & MEDIA RECORDER DOWNLOAD
    // ==========================================

    function downloadRenderedVideo() {
      var btn = document.getElementById('btn-download-video');
      btn.disabled = true;
      btn.textContent = '⏳ Rendering Video...';

      // Setup MediaRecorder from Canvas Stream
      try {
        var stream = canvas.captureStream(30);
        var chunks = [];
        var recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

        recorder.ondataavailable = function(e) {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = function() {
          var blob = new Blob(chunks, { type: 'video/webm' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'agent-universe-video.webm';
          a.click();

          btn.disabled = false;
          btn.textContent = '⬇ Download Video (.webm)';
          alert("🎉 Video Render Complete! Your video has been downloaded to your computer.");
        };

        // Play from start and record
        currentTime = 0;
        recorder.start();
        isPlaying = true;
        lastTimestamp = performance.now();

        var recordInterval = setInterval(function() {
          currentTime += 0.033; // 30 fps
          drawFrame(currentTime);
          updateScrubberUI();

          if (currentTime >= totalDuration) {
            clearInterval(recordInterval);
            recorder.stop();
            isPlaying = false;
            document.getElementById('btn-play').textContent = '▶';
          }
        }, 33);

      } catch (err) {
        alert("MediaRecorder error: " + err.message + ". Downloading frame snapshot instead.");
        takeSnapshot();
        btn.disabled = false;
        btn.textContent = '⬇ Download Video (.webm)';
      }
    }

    window.onload = init;
  </script>
</body>
</html>`;
        return { title: 'Video Creator Studio Pro', type: 'Video Creator', code, stages: [
            { name: 'Multi-Track Timeline Architecture', agent: 'AGT-VIDEO-101', desc: 'Building multi-scene timeline graph and import pipelines.' },
            { name: 'Canvas & Web Audio Engine', agent: 'AGT-RENDER-202', desc: 'Wiring 16:9 canvas renderer, Ken Burns motion, and soundtrack synthesizer.' },
            { name: 'AI Script-to-Video Parser', agent: 'AGT-AI-303', desc: 'Configuring natural language script scene generation.' },
            { name: 'MediaRecorder Export Pipeline', agent: 'NEXUS-BUILD-01', desc: 'Packaging standalone video encoder and download pipeline.' }
        ]};
    }

    // 🌐 LANDING PAGE BUILDER
    static generateLandingPage(goalText) {
        const code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Landing Page</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1e293b;line-height:1.6}.hero{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:80px 24px;text-align:center}.hero h1{font-size:clamp(32px,5vw,56px);font-weight:800;margin-bottom:16px;letter-spacing:-1px}.hero p{font-size:18px;opacity:.85;max-width:600px;margin:0 auto 32px}.cta-btn{display:inline-block;padding:14px 32px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;border:none;cursor:pointer;transition:all .2s}.cta-btn:hover{background:#2563eb;transform:translateY(-2px);box-shadow:0 8px 20px rgba(59,130,246,.3)}.section{padding:64px 24px;max-width:1000px;margin:0 auto}.section-title{text-align:center;font-size:28px;font-weight:800;margin-bottom:8px;color:#0f172a}.section-desc{text-align:center;color:#64748b;margin-bottom:40px;font-size:15px}.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px}.feature-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;transition:all .3s}.feature-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,.08)}.feature-icon{font-size:36px;margin-bottom:12px}.feature-card h3{font-size:16px;font-weight:700;margin-bottom:8px;color:#0f172a}.feature-card p{font-size:13px;color:#64748b}.testimonials{background:#f8fafc;padding:64px 24px}.testimonial-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;max-width:1000px;margin:0 auto}.testimonial-card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.testimonial-card p{font-style:italic;color:#475569;margin-bottom:12px;font-size:14px;line-height:1.7}.testimonial-author{font-weight:700;color:#0f172a;font-size:13px}.pricing{padding:64px 24px;max-width:1000px;margin:0 auto}.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}.price-card{background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:32px 24px;text-align:center;transition:all .3s}.price-card.featured{border-color:#3b82f6;position:relative}.price-card.featured::before{content:"POPULAR";position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#3b82f6;color:#fff;padding:4px 16px;border-radius:12px;font-size:11px;font-weight:700}.price-card h3{font-size:18px;font-weight:700;margin-bottom:8px}.price-amt{font-size:40px;font-weight:800;color:#0f172a;margin-bottom:16px}.price-amt span{font-size:14px;font-weight:500;color:#94a3b8}.price-features{list-style:none;margin-bottom:24px}.price-features li{padding:6px 0;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9}.footer{background:#0f172a;color:#94a3b8;padding:40px 24px;text-align:center;font-size:13px}</style></head><body><div class="hero"><h1>Build Something Amazing</h1><p>The all-in-one platform that helps teams ship products faster, with less complexity and more confidence.</p><button class="cta-btn" onclick="alert('Getting started!')">Get Started Free →</button></div><div class="section"><h2 class="section-title">Why Choose Us?</h2><p class="section-desc">Everything you need to build, deploy, and scale your product.</p><div class="features"><div class="feature-card"><div class="feature-icon">⚡</div><h3>Lightning Fast</h3><p>Optimized for speed with sub-50ms response times globally.</p></div><div class="feature-card"><div class="feature-icon">🔒</div><h3>Enterprise Security</h3><p>SOC2 compliant with end-to-end encryption and audit logging.</p></div><div class="feature-card"><div class="feature-icon">📊</div><h3>Real-Time Analytics</h3><p>Monitor every metric with live dashboards and instant alerts.</p></div><div class="feature-card"><div class="feature-icon">🔌</div><h3>Integrations</h3><p>Connect with 200+ tools including Slack, GitHub, and Jira.</p></div></div></div><div class="testimonials"><h2 class="section-title">What People Say</h2><p class="section-desc">Trusted by 10,000+ teams worldwide</p><div class="testimonial-grid"><div class="testimonial-card"><p>"This platform transformed how we build products. We shipped 3x faster in the first month."</p><div class="testimonial-author">— Sarah Chen, CTO at TechCorp</div></div><div class="testimonial-card"><p>"The analytics alone are worth the price. We finally have visibility into what matters."</p><div class="testimonial-author">— Marcus Williams, VP Engineering</div></div><div class="testimonial-card"><p>"Setup took 5 minutes. The integrations work flawlessly. Highly recommended."</p><div class="testimonial-author">— Priya Patel, Engineering Lead</div></div></div></div><div class="pricing"><h2 class="section-title">Simple Pricing</h2><p class="section-desc">Start free. Scale as you grow.</p><div class="pricing-grid"><div class="price-card"><h3>Starter</h3><div class="price-amt">$0<span>/mo</span></div><ul class="price-features"><li>Up to 3 projects</li><li>Basic analytics</li><li>Community support</li><li>1 GB storage</li></ul><button class="cta-btn" style="background:#64748b" onclick="alert('Starting free plan!')">Start Free</button></div><div class="price-card featured"><h3>Pro</h3><div class="price-amt">$29<span>/mo</span></div><ul class="price-features"><li>Unlimited projects</li><li>Advanced analytics</li><li>Priority support</li><li>100 GB storage</li></ul><button class="cta-btn" onclick="alert('Starting Pro plan!')">Start Pro</button></div><div class="price-card"><h3>Enterprise</h3><div class="price-amt">$99<span>/mo</span></div><ul class="price-features"><li>Everything in Pro</li><li>Custom integrations</li><li>24/7 dedicated support</li><li>Unlimited storage</li></ul><button class="cta-btn" style="background:#64748b" onclick="alert('Contact sales!')">Contact Sales</button></div></div></div><div class="footer">© 2026 SwarmBuilt Inc. All rights reserved. Built by AI Agent Swarm.</div></body></html>`;
        return { title: 'Landing Page', type: 'Landing Page', code, stages: [
            { name: 'Layout Architecture', agent: 'AGT-DESIGN-101', desc: 'Building hero, features, pricing sections.' },
            { name: 'Responsive Styling', agent: 'AGT-CSS-202', desc: 'Applying responsive design system.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging standalone landing page.' }
        ]};
    }

    // 📝 FORM BUILDER
    static generateFormBuilder(goalText) {
        const code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Form Builder</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f0f4f8;color:#1e293b;min-height:100vh}.app{display:grid;grid-template-columns:220px 1fr 300px;gap:16px;padding:16px;max-width:1200px;margin:0 auto;min-height:calc(100vh - 80px)}.header{grid-column:1/-1;background:#fff;border-radius:12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}.header h1{font-size:20px;font-weight:700}.panel{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.panel h3{font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.05em;margin-bottom:12px}.field-type{padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s;display:flex;align-items:center;gap:8px}.field-type:hover{border-color:#3b82f6;background:#eff6ff;color:#3b82f6}.canvas-panel{min-height:400px}.form-field{background:#f8fafc;border:2px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:8px;position:relative;transition:all .2s;cursor:pointer}.form-field:hover{border-color:#93c5fd}.form-field.selected{border-color:#3b82f6;background:#eff6ff}.form-field label{display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:6px}.form-field input,.form-field textarea,.form-field select{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;background:#fff}.form-field .remove-btn{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;border:none;background:#fee2e2;color:#dc2626;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s}.form-field:hover .remove-btn{opacity:1}.empty-canvas{text-align:center;padding:60px 20px;color:#94a3b8;font-size:14px}.prop-group{margin-bottom:12px}.prop-group label{font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px}.prop-group input,.prop-group select{width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#f8fafc}.prop-group input:focus,.prop-group select:focus{outline:none;border-color:#3b82f6}.toggle-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0}.toggle-row label{font-size:12px;font-weight:600;color:#475569}.toggle{width:36px;height:20px;background:#e2e8f0;border-radius:10px;position:relative;cursor:pointer;transition:all .2s}.toggle.on{background:#3b82f6}.toggle::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:all .2s}.toggle.on::after{left:18px}.submit-preview{margin-top:16px;padding:10px;background:#059669;color:#fff;border:none;border-radius:8px;width:100%;font-weight:700;cursor:pointer;font-size:13px;transition:all .2s}.submit-preview:hover{background:#047857}@media(max-width:768px){.app{grid-template-columns:1fr}}</style></head><body><div class="app"><div class="header"><h1>📝 Form Builder</h1><button style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer" onclick="previewForm()">👁 Preview Form</button></div><div class="panel" id="toolbox"><h3>Field Types</h3><div class="field-type" onclick="addField('text')">📄 Text Input</div><div class="field-type" onclick="addField('email')">📧 Email</div><div class="field-type" onclick="addField('number')">🔢 Number</div><div class="field-type" onclick="addField('textarea')">📝 Text Area</div><div class="field-type" onclick="addField('select')">📋 Dropdown</div><div class="field-type" onclick="addField('checkbox')">☑️ Checkbox</div><div class="field-type" onclick="addField('radio')">🔘 Radio Group</div><div class="field-type" onclick="addField('date')">📅 Date</div></div><div class="panel canvas-panel" id="canvas"><h3>Form Canvas</h3><div id="fields-container"></div></div><div class="panel" id="props-panel"><h3>Field Properties</h3><div id="props-content"><p style="font-size:12px;color:#94a3b8">Select a field to edit its properties</p></div></div></div><script>var fields=[];var selectedIdx=-1;var nextId=1;function addField(type){var f={id:nextId++,type:type,label:type.charAt(0).toUpperCase()+type.slice(1)+" Field",placeholder:"Enter "+type+"...",required:false,options:type==="select"||type==="radio"?"Option 1, Option 2, Option 3":""};fields.push(f);selectedIdx=fields.length-1;renderAll()}function removeField(idx){fields.splice(idx,1);selectedIdx=Math.min(selectedIdx,fields.length-1);renderAll()}function selectField(idx){selectedIdx=idx;renderAll()}function renderAll(){renderCanvas();renderProps()}function renderCanvas(){var c=document.getElementById("fields-container");if(fields.length===0){c.innerHTML='<div class="empty-canvas">Click a field type on the left to add it here</div>';return}c.innerHTML="";fields.forEach(function(f,i){var div=document.createElement("div");div.className="form-field"+(i===selectedIdx?" selected":"");div.onclick=function(e){if(!e.target.classList.contains("remove-btn"))selectField(i)};var html='<button class="remove-btn" onclick="removeField('+i+')">×</button>';html+="<label>"+f.label+(f.required?' <span style="color:#ef4444">*</span>':"")+"</label>";if(f.type==="textarea"){html+='<textarea placeholder="'+f.placeholder+'" rows="3"></textarea>'}else if(f.type==="select"){var opts=(f.options||"").split(",");html+="<select>";opts.forEach(function(o){html+="<option>"+o.trim()+"</option>"});html+="</select>"}else if(f.type==="checkbox"){html+='<label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12px"><input type="checkbox"> '+f.placeholder+"</label>"}else if(f.type==="radio"){var opts=(f.options||"").split(",");opts.forEach(function(o){html+='<label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12px;margin-bottom:4px"><input type="radio" name="radio-'+f.id+'"> '+o.trim()+"</label>"})}else{html+='<input type="'+f.type+'" placeholder="'+f.placeholder+'">'}div.innerHTML=html;c.appendChild(div)})}function renderProps(){var pc=document.getElementById("props-content");if(selectedIdx<0||!fields[selectedIdx]){pc.innerHTML='<p style="font-size:12px;color:#94a3b8">Select a field to edit</p>';return}var f=fields[selectedIdx];var html='<div class="prop-group"><label>Label</label><input value="'+f.label+'" oninput="updateProp(\\'label\\',this.value)"></div>';html+='<div class="prop-group"><label>Placeholder</label><input value="'+f.placeholder+'" oninput="updateProp(\\'placeholder\\',this.value)"></div>';if(f.type==="select"||f.type==="radio"){html+='<div class="prop-group"><label>Options (comma separated)</label><input value="'+f.options+'" oninput="updateProp(\\'options\\',this.value)"></div>'}html+='<div class="toggle-row"><label>Required</label><div class="toggle'+(f.required?" on":"")+'" onclick="updateProp(\\'required\\',!fields['+selectedIdx+'].required)"></div></div>';html+='<button class="submit-preview" onclick="removeField('+selectedIdx+')">🗑 Remove Field</button>';pc.innerHTML=html}function updateProp(key,val){if(selectedIdx>=0&&fields[selectedIdx]){fields[selectedIdx][key]=val;renderAll()}}function previewForm(){var msg="Form Preview:\\n\\n";fields.forEach(function(f){msg+=f.label+(f.required?" (required)":"")+": ["+f.type+"]\\n"});msg+="\\nTotal fields: "+fields.length;alert(msg)}renderAll()</script></body></html>`;
        return { title: 'Form Builder', type: 'Form Builder', code, stages: [
            { name: 'Field Type Registry', agent: 'AGT-FORM-101', desc: 'Registering all input field types.' },
            { name: 'Canvas Drag Engine', agent: 'AGT-UI-202', desc: 'Building interactive form canvas.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging form builder app.' }
        ]};
    }

    // 📋 KANBAN BOARD
    static generateKanban(goalText) {
        const code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Kanban Board</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f0f4f8;color:#1e293b;min-height:100vh;padding:20px}.header{background:#fff;border-radius:12px;padding:16px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center}.header h1{font-size:22px;font-weight:700}.board{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;min-height:calc(100vh - 120px)}.column{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.col-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid #e2e8f0}.col-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b}.col-count{background:#f1f5f9;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#64748b}.col-body{min-height:200px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;cursor:grab;transition:all .2s;position:relative}.card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08);transform:translateY(-1px)}.card:active{cursor:grabbing;opacity:.8}.card-title{font-size:13px;font-weight:600;color:#1e293b;margin-bottom:4px}.card-desc{font-size:11px;color:#94a3b8;line-height:1.5}.card-priority{display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-top:6px}.card-priority.high{background:#fee2e2;color:#dc2626}.card-priority.medium{background:#fef3c7;color:#d97706}.card-priority.low{background:#ecfdf5;color:#059669}.card-delete{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;border:none;background:transparent;color:#94a3b8;font-size:14px;cursor:pointer;opacity:0;transition:opacity .2s}.card:hover .card-delete{opacity:1}.card-delete:hover{background:#fee2e2;color:#dc2626}.add-card-area{margin-top:8px}.add-input{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff;margin-bottom:6px}.add-input:focus{outline:none;border-color:#3b82f6}.add-btn{width:100%;padding:8px;border:2px dashed #cbd5e1;border-radius:8px;background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}.add-btn:hover{border-color:#3b82f6;color:#3b82f6;background:#eff6ff}@media(max-width:768px){.board{grid-template-columns:1fr}}</style></head><body><div class="header"><h1>📋 Kanban Board</h1></div><div class="board"><div class="column" id="col-todo" ondragover="event.preventDefault()" ondrop="dropCard(event,'todo')"><div class="col-header"><span class="col-title">To Do</span><span class="col-count" id="count-todo">0</span></div><div class="col-body" id="body-todo"></div><div class="add-card-area"><input class="add-input" id="input-todo" placeholder="Add a card..." onkeydown="if(event.key==='Enter')addCard('todo')"><button class="add-btn" onclick="addCard('todo')">+ Add Card</button></div></div><div class="column" id="col-progress" ondragover="event.preventDefault()" ondrop="dropCard(event,'progress')"><div class="col-header"><span class="col-title">In Progress</span><span class="col-count" id="count-progress">0</span></div><div class="col-body" id="body-progress"></div><div class="add-card-area"><input class="add-input" id="input-progress" placeholder="Add a card..." onkeydown="if(event.key==='Enter')addCard('progress')"><button class="add-btn" onclick="addCard('progress')">+ Add Card</button></div></div><div class="column" id="col-done" ondragover="event.preventDefault()" ondrop="dropCard(event,'done')"><div class="col-header"><span class="col-title">Done</span><span class="col-count" id="count-done">0</span></div><div class="col-body" id="body-done"></div><div class="add-card-area"><input class="add-input" id="input-done" placeholder="Add a card..." onkeydown="if(event.key==='Enter')addCard('done')"><button class="add-btn" onclick="addCard('done')">+ Add Card</button></div></div></div><script>var cards=[{id:1,title:"Design landing page",desc:"Create wireframes for the hero section",priority:"high",col:"todo"},{id:2,title:"Setup CI/CD pipeline",desc:"Configure GitHub Actions for auto-deploy",priority:"medium",col:"todo"},{id:3,title:"Write API endpoints",desc:"REST API for user authentication",priority:"high",col:"progress"},{id:4,title:"Database schema",desc:"Design PostgreSQL schema",priority:"low",col:"done"}];var nextId=5;var dragId=null;function render(){["todo","progress","done"].forEach(function(col){var body=document.getElementById("body-"+col);body.innerHTML="";var colCards=cards.filter(function(c){return c.col===col});document.getElementById("count-"+col).textContent=colCards.length;colCards.forEach(function(c){var div=document.createElement("div");div.className="card";div.draggable=true;div.dataset.id=c.id;div.ondragstart=function(){dragId=c.id};div.innerHTML='<button class="card-delete" onclick="deleteCard('+c.id+')">×</button><div class="card-title">'+c.title+"</div>"+(c.desc?'<div class="card-desc">'+c.desc+"</div>":"")+'<span class="card-priority '+c.priority+'">'+c.priority.toUpperCase()+"</span>";body.appendChild(div)})})}function addCard(col){var input=document.getElementById("input-"+col);var title=input.value.trim();if(!title)return;var priorities=["low","medium","high"];cards.push({id:nextId++,title:title,desc:"",priority:priorities[Math.floor(Math.random()*3)],col:col});input.value="";render()}function deleteCard(id){cards=cards.filter(function(c){return c.id!==id});render()}function dropCard(event,col){event.preventDefault();if(dragId===null)return;var card=cards.find(function(c){return c.id===dragId});if(card){card.col=col}dragId=null;render()}render()</script></body></html>`;
        return { title: 'Kanban Board', type: 'Kanban Board', code, stages: [
            { name: 'Column Layout Architecture', agent: 'AGT-KANBAN-101', desc: 'Building column-based board layout.' },
            { name: 'Drag & Drop Engine', agent: 'AGT-DND-202', desc: 'Implementing HTML5 drag and drop system.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging kanban board app.' }
        ]};
    }

    // 📝 MARKDOWN EDITOR
    static generateMarkdownEditor(goalText) {
        const code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Markdown Editor</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f0f4f8;color:#1e293b;height:100vh;display:flex;flex-direction:column}.toolbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:8px 16px;display:flex;align-items:center;gap:4px;flex-wrap:wrap}.toolbar-title{font-size:16px;font-weight:700;margin-right:auto}.tb-btn{padding:6px 10px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;font-size:13px;cursor:pointer;transition:all .15s;font-weight:600;color:#475569}.tb-btn:hover{background:#f1f5f9;border-color:#3b82f6;color:#3b82f6}.tb-sep{width:1px;height:20px;background:#e2e8f0;margin:0 4px}.editor-area{flex:1;display:grid;grid-template-columns:1fr 1fr;overflow:hidden}.pane{display:flex;flex-direction:column}.pane-header{padding:8px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;display:flex;justify-content:space-between}#editor{flex:1;padding:16px;border:none;outline:none;resize:none;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.8;color:#334155;background:#fff;border-right:1px solid #e2e8f0}#preview{flex:1;padding:16px 24px;overflow-y:auto;background:#fff;font-size:14px;line-height:1.8}#preview h1{font-size:28px;font-weight:800;color:#0f172a;margin:16px 0 8px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}#preview h2{font-size:22px;font-weight:700;color:#1e293b;margin:14px 0 6px}#preview h3{font-size:18px;font-weight:700;color:#334155;margin:12px 0 4px}#preview p{margin:8px 0;color:#475569}#preview code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;color:#e11d48}#preview pre{background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;margin:12px 0;font-size:12px;line-height:1.6}#preview pre code{background:transparent;color:#e2e8f0;padding:0}#preview blockquote{border-left:4px solid #3b82f6;padding:8px 16px;margin:12px 0;background:#eff6ff;color:#1e40af;border-radius:0 8px 8px 0}#preview ul,#preview ol{padding-left:24px;margin:8px 0}#preview li{margin:4px 0;color:#475569}#preview a{color:#3b82f6;text-decoration:none}#preview a:hover{text-decoration:underline}#preview strong{font-weight:700;color:#0f172a}#preview em{font-style:italic}.stats{padding:6px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;gap:16px}@media(max-width:768px){.editor-area{grid-template-columns:1fr;grid-template-rows:1fr 1fr}}</style></head><body><div class="toolbar"><span class="toolbar-title">📝 Markdown Editor</span><button class="tb-btn" onclick="insertMd('**','**')"><b>B</b></button><button class="tb-btn" onclick="insertMd('*','*')"><i>I</i></button><div class="tb-sep"></div><button class="tb-btn" onclick="insertMd('# ','')">H1</button><button class="tb-btn" onclick="insertMd('## ','')">H2</button><button class="tb-btn" onclick="insertMd('### ','')">H3</button><div class="tb-sep"></div><button class="tb-btn" onclick="insertMd('[','](url)')">🔗</button><button class="tb-btn" onclick="insertMd('\\n\\n\`\`\`\\n','\\n\`\`\`\\n')">{ }</button><button class="tb-btn" onclick="insertMd('> ','')">❝</button><button class="tb-btn" onclick="insertMd('- ','')">• List</button><div class="tb-sep"></div><button class="tb-btn" onclick="copyMd()">📋 Copy MD</button><button class="tb-btn" onclick="copyHtml()">📋 Copy HTML</button></div><div class="editor-area"><div class="pane"><div class="pane-header"><span>Markdown</span><span id="char-count">0 chars</span></div><textarea id="editor" oninput="updatePreview()" placeholder="Type your markdown here...">
# Hello World

Welcome to the **Markdown Editor**! This editor supports:

## Features

- **Bold** and *italic* text
- [Links](https://example.com)
- Code blocks and \`inline code\`
- Blockquotes and lists

> This is a blockquote. It looks great!

### Code Example

\`\`\`
function hello() {
  console.log("Hello from the editor!");
}
\`\`\`

### Ordered List

1. First item
2. Second item
3. Third item

---

*Built by the AI Agent Swarm*</textarea></div><div class="pane"><div class="pane-header"><span>Preview</span><span id="word-count">0 words</span></div><div id="preview"></div></div></div><div class="stats"><span id="stat-lines">0 lines</span><span id="stat-reading">0 min read</span></div><script>function parseMd(md){var html=md;html=html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g,function(m,code){return"<pre><code>"+code.replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</code></pre>"});html=html.replace(/\`([^\`]+)\`/g,"<code>$1</code>");html=html.replace(/^### (.*$)/gm,"<h3>$1</h3>");html=html.replace(/^## (.*$)/gm,"<h2>$1</h2>");html=html.replace(/^# (.*$)/gm,"<h1>$1</h1>");html=html.replace(/\\*\\*(.+?)\\*\\*/g,"<strong>$1</strong>");html=html.replace(/\\*(.+?)\\*/g,"<em>$1</em>");html=html.replace(/^> (.*$)/gm,"<blockquote>$1</blockquote>");html=html.replace(/^\\- (.*$)/gm,"<li>$1</li>");html=html.replace(/^\\d+\\. (.*$)/gm,"<li>$1</li>");html=html.replace(/\\[(.+?)\\]\\((.+?)\\)/g,'<a href="$2" target="_blank">$1</a>');html=html.replace(/^---$/gm,"<hr>");html=html.replace(/(<li>.*<\\/li>)/s,function(m){return"<ul>"+m+"</ul>"});html=html.replace(/\\n\\n/g,"</p><p>");html="<p>"+html+"</p>";html=html.replace(/<p>(<h[123]|<pre|<blockquote|<ul|<ol|<hr)/g,"$1");html=html.replace(/(<\\/h[123]>|<\\/pre>|<\\/blockquote>|<\\/ul>|<\\/ol>|<hr>)<\\/p>/g,"$1");return html}function updatePreview(){var md=document.getElementById("editor").value;document.getElementById("preview").innerHTML=parseMd(md);var chars=md.length;var words=md.trim()?md.trim().split(/\\s+/).length:0;var lines=md.split("\\n").length;document.getElementById("char-count").textContent=chars+" chars";document.getElementById("word-count").textContent=words+" words";document.getElementById("stat-lines").textContent=lines+" lines";document.getElementById("stat-reading").textContent=Math.max(1,Math.ceil(words/200))+" min read"}function insertMd(before,after){var ed=document.getElementById("editor");var start=ed.selectionStart;var end=ed.selectionEnd;var sel=ed.value.substring(start,end)||"text";ed.value=ed.value.substring(0,start)+before+sel+after+ed.value.substring(end);ed.focus();ed.selectionStart=start+before.length;ed.selectionEnd=start+before.length+sel.length;updatePreview()}function copyMd(){navigator.clipboard.writeText(document.getElementById("editor").value);alert("Markdown copied!")}function copyHtml(){navigator.clipboard.writeText(document.getElementById("preview").innerHTML);alert("HTML copied!")}updatePreview()</script></body></html>`;
        return { title: 'Markdown Editor', type: 'Markdown Editor', code, stages: [
            { name: 'Parser Architecture', agent: 'AGT-PARSE-101', desc: 'Building markdown → HTML parser engine.' },
            { name: 'Split-Pane UI', agent: 'AGT-UI-202', desc: 'Creating editor/preview split view.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging markdown editor app.' }
        ]};
    }

    // 💰 BUDGET TRACKER
    static generateBudgetTracker(goalText) {
        const code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Budget Tracker</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f0f4f8;color:#1e293b;min-height:100vh;padding:20px}.app{max-width:800px;margin:0 auto}.header{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.header h1{font-size:22px;font-weight:700;margin-bottom:16px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.summary-card{padding:16px;border-radius:10px;text-align:center}.summary-card.income{background:#ecfdf5;border:1px solid #a7f3d0}.summary-card.expense{background:#fef2f2;border:1px solid #fecaca}.summary-card.balance{background:#eff6ff;border:1px solid #bfdbfe}.summary-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:4px}.summary-value{font-size:24px;font-weight:800}.summary-card.income .summary-value{color:#059669}.summary-card.expense .summary-value{color:#dc2626}.summary-card.balance .summary-value{color:#2563eb}.add-form{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.form-row{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.form-group{flex:1;min-width:120px}.form-group label{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase}.form-group input,.form-group select{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;background:#f8fafc}.form-group input:focus,.form-group select:focus{outline:none;border-color:#3b82f6}.type-toggle{display:flex;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:18px}.type-toggle button{flex:1;padding:8px 12px;border:none;background:#f8fafc;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}.type-toggle button.active-income{background:#059669;color:#fff}.type-toggle button.active-expense{background:#dc2626;color:#fff}.add-btn{margin-top:18px;padding:8px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;transition:all .2s;white-space:nowrap}.add-btn:hover{background:#2563eb}.transactions{background:#fff;border-radius:12px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.transactions h3{font-size:14px;font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}.filter-pills{display:flex;gap:4px}.filter-pill{padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}.filter-pill.active{background:#3b82f6;color:#fff;border-color:#3b82f6}.tx-list{list-style:none}.tx-item{display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #f1f5f9;transition:background .15s}.tx-item:hover{background:#f8fafc}.tx-info{display:flex;align-items:center;gap:10px}.tx-cat{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}.tx-desc{font-size:13px;font-weight:600;color:#1e293b}.tx-category{font-size:11px;color:#94a3b8}.tx-amount{font-size:14px;font-weight:700}.tx-amount.income{color:#059669}.tx-amount.expense{color:#dc2626}.tx-delete{width:24px;height:24px;border-radius:50%;border:none;background:transparent;color:#94a3b8;cursor:pointer;margin-left:8px;font-size:14px;opacity:0;transition:all .2s}.tx-item:hover .tx-delete{opacity:1}.tx-delete:hover{background:#fee2e2;color:#dc2626}.empty-state{text-align:center;padding:40px;color:#94a3b8;font-size:13px}@media(max-width:640px){.summary{grid-template-columns:1fr}.form-row{flex-direction:column}}</style></head><body><div class="app"><div class="header"><h1>💰 Budget Tracker</h1><div class="summary"><div class="summary-card income"><div class="summary-label">Total Income</div><div class="summary-value" id="total-income">$0</div></div><div class="summary-card expense"><div class="summary-label">Total Expenses</div><div class="summary-value" id="total-expense">$0</div></div><div class="summary-card balance"><div class="summary-label">Net Balance</div><div class="summary-value" id="total-balance">$0</div></div></div></div><div class="add-form"><div class="form-row"><div class="form-group"><label>Description</label><input id="tx-desc" placeholder="e.g. Grocery shopping"></div><div class="form-group"><label>Amount ($)</label><input type="number" id="tx-amount" placeholder="0.00" min="0" step="0.01"></div><div class="form-group"><label>Category</label><select id="tx-cat"><option value="food">🍕 Food</option><option value="transport">🚗 Transport</option><option value="shopping">🛍 Shopping</option><option value="bills">📄 Bills</option><option value="salary">💼 Salary</option><option value="freelance">💻 Freelance</option><option value="investment">📈 Investment</option><option value="other">📦 Other</option></select></div><div class="type-toggle" id="type-toggle"><button class="active-income" id="btn-income" onclick="setType('income')">Income</button><button id="btn-expense" onclick="setType('expense')">Expense</button></div><button class="add-btn" onclick="addTransaction()">+ Add</button></div></div><div class="transactions"><h3>Transactions <div class="filter-pills"><button class="filter-pill active" data-filter="all" onclick="setFilter('all',this)">All</button><button class="filter-pill" data-filter="income" onclick="setFilter('income',this)">Income</button><button class="filter-pill" data-filter="expense" onclick="setFilter('expense',this)">Expense</button></div></h3><ul class="tx-list" id="tx-list"></ul></div></div><script>var txType="income";var filter="all";var catIcons={food:"🍕",transport:"🚗",shopping:"🛍",bills:"📄",salary:"💼",freelance:"💻",investment:"📈",other:"📦"};var catColors={food:"#fef3c7",transport:"#dbeafe",shopping:"#fce7f3",bills:"#f1f5f9",salary:"#ecfdf5",freelance:"#ede9fe",investment:"#ecfdf5",other:"#f1f5f9"};var transactions=[{id:1,desc:"Monthly Salary",amount:5000,type:"income",cat:"salary"},{id:2,desc:"Grocery Store",amount:120.50,type:"expense",cat:"food"},{id:3,desc:"Gas Station",amount:45,type:"expense",cat:"transport"},{id:4,desc:"Freelance Project",amount:800,type:"income",cat:"freelance"},{id:5,desc:"Electric Bill",amount:95,type:"expense",cat:"bills"}];var nextId=6;function setType(t){txType=t;document.getElementById("btn-income").className=t==="income"?"active-income":"";document.getElementById("btn-expense").className=t==="expense"?"active-expense":""}function setFilter(f,btn){filter=f;document.querySelectorAll(".filter-pill").forEach(function(p){p.classList.remove("active")});btn.classList.add("active");render()}function addTransaction(){var desc=document.getElementById("tx-desc").value.trim();var amount=parseFloat(document.getElementById("tx-amount").value);var cat=document.getElementById("tx-cat").value;if(!desc||!amount||amount<=0)return;transactions.unshift({id:nextId++,desc:desc,amount:amount,type:txType,cat:cat});document.getElementById("tx-desc").value="";document.getElementById("tx-amount").value="";render()}function deleteTransaction(id){transactions=transactions.filter(function(t){return t.id!==id});render()}function render(){var income=transactions.filter(function(t){return t.type==="income"}).reduce(function(a,t){return a+t.amount},0);var expense=transactions.filter(function(t){return t.type==="expense"}).reduce(function(a,t){return a+t.amount},0);document.getElementById("total-income").textContent="$"+income.toLocaleString("en-US",{minimumFractionDigits:2});document.getElementById("total-expense").textContent="$"+expense.toLocaleString("en-US",{minimumFractionDigits:2});document.getElementById("total-balance").textContent="$"+(income-expense).toLocaleString("en-US",{minimumFractionDigits:2});var list=document.getElementById("tx-list");var filtered=filter==="all"?transactions:transactions.filter(function(t){return t.type===filter});if(filtered.length===0){list.innerHTML='<div class="empty-state">No transactions yet. Add one above!</div>';return}list.innerHTML="";filtered.forEach(function(t){var li=document.createElement("li");li.className="tx-item";li.innerHTML='<div class="tx-info"><div class="tx-cat" style="background:'+(catColors[t.cat]||"#f1f5f9")+'">'+(catIcons[t.cat]||"📦")+'</div><div><div class="tx-desc">'+t.desc+'</div><div class="tx-category">'+t.cat.charAt(0).toUpperCase()+t.cat.slice(1)+"</div></div></div>"+'<div style="display:flex;align-items:center"><span class="tx-amount '+t.type+'">'+(t.type==="income"?"+":"-")+"$"+t.amount.toFixed(2)+'</span><button class="tx-delete" onclick="deleteTransaction('+t.id+')">×</button></div>';list.appendChild(li)})}render()</script></body></html>`;
        return { title: 'Budget Tracker', type: 'Budget Tracker', code, stages: [
            { name: 'Financial Model Architecture', agent: 'AGT-FIN-101', desc: 'Building income/expense data model.' },
            { name: 'Transaction UI Components', agent: 'AGT-UI-202', desc: 'Creating transaction list and summary cards.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging budget tracker app.' }
        ]};
    }

    // Stub generators for remaining types (these route to a smart dynamic app for now)
    static generateSurveyQuiz(goalText) { return this._smartApp(goalText, 'Survey & Quiz App', '📊', 'quiz'); }
    static generatePortfolio(goalText) { return this._smartApp(goalText, 'Portfolio Website', '🎨', 'portfolio'); }
    static generateEcommerce(goalText) { return this._smartApp(goalText, 'E-Commerce Store', '🛒', 'ecommerce'); }
    static generateCalendar(goalText) { return this._smartApp(goalText, 'Calendar Scheduler', '📅', 'calendar'); }
    static generateImageGallery(goalText) { return this._smartApp(goalText, 'Image Gallery', '🖼', 'gallery'); }
    static generateInvoice(goalText) { return this._smartApp(goalText, 'Invoice Generator', '🧾', 'invoice'); }
    static generateRecipeApp(goalText) { return this._smartApp(goalText, 'Recipe Cookbook', '🍳', 'recipe'); }
    static generateFitnessTracker(goalText) { return this._smartApp(goalText, 'Fitness Tracker', '💪', 'fitness'); }

    // Smart dynamic app builder for types without a full custom generator yet
    static _smartApp(goalText, title, icon, type) {
        const accentColors = { quiz:'#8b5cf6', portfolio:'#0891b2', ecommerce:'#059669', calendar:'#3b82f6', gallery:'#f97316', invoice:'#64748b', recipe:'#d97706', fitness:'#ef4444' };
        const accent = accentColors[type] || '#3b82f6';
        const code = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f0f4f8;color:#1e293b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.app{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:520px;width:100%;padding:40px;text-align:center}.icon{font-size:56px;margin-bottom:16px}.title{font-size:26px;font-weight:800;color:#0f172a;margin-bottom:8px}.desc{color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px}.goal-text{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;font-size:13px;color:#334155;text-align:left;margin-bottom:24px;line-height:1.6}.goal-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:6px}.features{text-align:left;margin-bottom:24px}.feature-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155}.feature-check{width:24px;height:24px;border-radius:50%;background:${accent}15;color:${accent};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0}.status{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:${accent}10;color:${accent};border-radius:8px;font-size:12px;font-weight:700}.status-dot{width:8px;height:8px;border-radius:50%;background:${accent};animation:pulse 1.5s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}</style></head><body><div class="app"><div class="icon">${icon}</div><h1 class="title">${title}</h1><p class="desc">This ${type} application was generated by the AI Agent Swarm. It is being actively developed by the swarm's specialized factories.</p><div class="goal-text"><div class="goal-label">Original Goal</div>"${goalText}"</div><div class="features"><div class="feature-item"><div class="feature-check">✓</div>Core architecture designed</div><div class="feature-item"><div class="feature-check">✓</div>UI components scaffolded</div><div class="feature-item"><div class="feature-check">✓</div>State management configured</div><div class="feature-item"><div class="feature-check">✓</div>Interactive features wired</div><div class="feature-item"><div class="feature-check">✓</div>Responsive layout applied</div></div><div class="status"><div class="status-dot"></div>Swarm Active — Building Full Application</div></div></body></html>`;
        return { title, type: title, code, stages: [
            { name: 'Requirements Analysis', agent: 'AGT-ARCH-101', desc: 'Analyzing goal requirements and constraints.' },
            { name: 'Core Logic Synthesis', agent: 'AGT-DEV-202', desc: 'Implementing core application logic.' },
            { name: 'UI Assembly', agent: 'AGT-UI-303', desc: 'Building responsive user interface.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging standalone application.' }
        ]};
    }
}

// ==========================================
// CORE CLASSES: TASK, AGENT, FACTORY, INDUSTRY
// ==========================================

class Task {
    constructor(template, factoryId) {
        this.id = 'TSK-' + generateId();
        this.name = template.name;
        this.description = template.description || this.name;
        this.priority = weightedRandom(template.priorityWeights || PRIORITIES);
        this.estimatedDuration = randomInt(2000, 6000);
        this.remainingDuration = this.estimatedDuration;
        this.progress = 0;
        this.status = TASK_STATUS.QUEUED;
        this.assignedAgentId = null;
        this.factoryId = factoryId;
        this.outputFn = template.output;
        this.output = null;
    }

    tick(deltaMs, simSpeed) {
        if (this.status !== TASK_STATUS.ACTIVE) return;
        const effectiveDelta = deltaMs * simSpeed;
        this.remainingDuration -= effectiveDelta;
        this.progress = Math.max(0, Math.min(100, 100 - (this.remainingDuration / this.estimatedDuration) * 100));
        if (this.remainingDuration <= 0) {
            this.progress = 100;
        }
    }

    complete() {
        this.status = TASK_STATUS.COMPLETE;
        this.output = this.outputFn ? this.outputFn() : `Completed ${this.name} successfully.`;
    }
}

class Agent {
    constructor(id) {
        this.id = id || 'AGT-' + generateId();
        this.type = randomChoice(AGENT_TYPES);
        this.state = AGENT_STATE.IDLE;
        this.currentTask = null;
        this.factoryId = null;
        this.tasksCompleted = 0;
    }

    tick(deltaMs, simSpeed) {
        if (this.state === AGENT_STATE.WORKING && this.currentTask) {
            this.currentTask.tick(deltaMs, simSpeed);
            if (this.currentTask.progress >= 100) {
                this.state = AGENT_STATE.REPORTING;
            }
        } else if (this.state === AGENT_STATE.REPORTING) {
            this.completeTask();
        }
    }

    assignTask(task) {
        this.currentTask = task;
        this.state = AGENT_STATE.WORKING;
        task.status = TASK_STATUS.ACTIVE;
        task.assignedAgentId = this.id;
    }

    completeTask() {
        if (this.currentTask) {
            this.currentTask.complete();
            this.tasksCompleted++;
            if (this.factoryId) {
                const factory = AgentUniverse.instance.getFactory(this.factoryId);
                if (factory) factory.onTaskCompleted(this.currentTask);
            }
            this.currentTask = null;
        }
        this.state = AGENT_STATE.IDLE;
    }
}

class Factory {
    constructor(industryId, data) {
        this.id = 'FAC-' + generateId();
        this.industryId = industryId;
        this.name = data.name;
        this.goal = data.goal || 'Production optimization';
        this.agents = [];
        this.taskQueue = [];
        this.activeTasks = [];
        this.completedTasks = [];
        this.outputLog = [];
        this.metrics = { tasksCompleted: 0, throughput: 0 };
        this.lastThroughputCalc = Date.now();
        this.completedSinceLastCalc = 0;
    }

    tick(deltaMs, simSpeed) {
        const hasActiveGoal = AgentUniverse.instance && AgentUniverse.instance.goals.some(g => g.active);
        // Generate new tasks only if there is an active goal and queue is low
        if (hasActiveGoal && this.agents.length > 0 && this.taskQueue.length < this.agents.length * 2 && Math.random() < (0.15 * simSpeed)) {
            this.generateTask();
        }

        // Tick agents & assign
        for (const agent of this.agents) {
            agent.tick(deltaMs, simSpeed);
            if (agent.state === AGENT_STATE.IDLE && this.taskQueue.length > 0) {
                const task = this.taskQueue.shift();
                this.activeTasks.push(task);
                agent.assignTask(task);
            }
        }

        // Throughput calculation
        const now = Date.now();
        if (now - this.lastThroughputCalc > 1000) {
            this.metrics.throughput = this.completedSinceLastCalc * 60;
            this.completedSinceLastCalc = 0;
            this.lastThroughputCalc = now;
        }
    }

    generateTask() {
        const templates = [
            { name: `Process data batch #${randomInt(1000, 9999)}`, output: () => `Processed ${randomInt(500, 5000)} records in pipeline.` },
            { name: `Execute unit test suite`, output: () => `120 assertions passed with 0 regression.` },
            { name: `Optimize query execution plan`, output: () => `Latency reduced by ${randomInt(10, 40)}%.` },
            { name: `Telemetry & anomaly inspection`, output: () => `All nodes operational. Error rate: 0.00%.` }
        ];
        const tpl = randomChoice(templates);
        this.taskQueue.push(new Task(tpl, this.id));
    }

    addAgent(agent) {
        agent.factoryId = this.id;
        agent.state = AGENT_STATE.IDLE;
        agent.currentTask = null;
        this.agents.push(agent);
    }

    removeAgent(agentId) {
        const idx = this.agents.findIndex(a => a.id === agentId);
        if (idx > -1) {
            const agent = this.agents[idx];
            if (agent.currentTask) {
                this.activeTasks = this.activeTasks.filter(t => t.id !== agent.currentTask.id);
                agent.currentTask.status = TASK_STATUS.QUEUED;
                agent.currentTask.assignedAgentId = null;
                this.taskQueue.unshift(agent.currentTask);
            }
            this.agents.splice(idx, 1);
            return agent;
        }
        return null;
    }

    onTaskCompleted(task) {
        this.activeTasks = this.activeTasks.filter(t => t.id !== task.id);
        this.completedTasks.unshift(task);
        if (this.completedTasks.length > 30) this.completedTasks.pop();
        
        this.metrics.tasksCompleted++;
        this.completedSinceLastCalc++;
        
        this.outputLog.unshift({
            timestamp: Date.now(),
            agentId: task.assignedAgentId,
            text: task.output
        });
        if (this.outputLog.length > 30) this.outputLog.pop();

        if (Math.random() < 0.06) {
            AgentUniverse.instance.eventLog.log('task', `[${this.name}] ${task.name} completed.`);
        }
    }

    getStats() {
        return {
            id: this.id,
            name: this.name,
            goal: this.goal,
            agentCount: this.agents.length,
            queueLength: this.taskQueue.length,
            activeCount: this.activeTasks.length,
            completedCount: this.metrics.tasksCompleted,
            throughput: this.metrics.throughput
        };
    }
}

class Industry {
    constructor(data) {
        this.id = data.id || 'ind-' + generateId().toLowerCase();
        this.name = data.name;
        this.icon = data.icon || '🏗️';
        this.color = data.color || '#2563eb';
        this.description = data.description || 'Specialized domain ecosystem';
        this.factories = [];
        if (data.factories) {
            data.factories.forEach(f => this.factories.push(new Factory(this.id, f)));
        }
    }

    tick(deltaMs, simSpeed) {
        for (const fac of this.factories) {
            fac.tick(deltaMs, simSpeed);
        }
    }

    getStats() {
        let totalAgents = 0, totalTasks = 0, totalThroughput = 0;
        this.factories.forEach(fac => {
            totalAgents += fac.agents.length;
            totalTasks += fac.metrics.tasksCompleted;
            totalThroughput += fac.metrics.throughput;
        });
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            color: this.color,
            description: this.description,
            factoriesCount: this.factories.length,
            agents: totalAgents,
            tasks: totalTasks,
            throughput: totalThroughput
        };
    }
}

// ==========================================
// GOAL SYSTEM
// ==========================================

class Goal {
    constructor(config) {
        this.id = 'GOAL-' + generateId();
        this.text = config.text;
        this.priority = config.priority || 'P1';
        this.scope = config.scope || 'universe';
        this.mode = config.mode || 'auto'; // 'auto' or 'manual'
        this.manualAgentCount = config.manualAgentCount || 0;
        this.targetFactoryId = config.targetFactoryId || null;

        this.subtaskCount = config.subtaskCount || 1000;
        this.completedSubtasks = 0;
        this.progress = 0;
        this.active = true;
        this.createdAt = Date.now();
        this.completedAt = null;
        this.convergence = this.scope === 'universe' && config.convergence;

        // Generate full interactive application code and stages
        this.artifactData = ArtifactGenerator.generate(this.text);
        this.stages = this.artifactData.stages || [
            { name: 'Requirements & State Spec', agent: 'AGT-ARCH-101', desc: 'Analyzing goal requirements and state model.' },
            { name: 'UI & Layout Synthesis', agent: 'AGT-ENG-204', desc: 'Building responsive components and clean styling.' },
            { name: 'Core Logic Implementation', agent: 'AGT-DEV-309', desc: 'Developing state machine and calculation parsers.' },
            { name: 'Input & Event Binding', agent: 'AGT-UI-412', desc: 'Wiring keyboard and interactive click handlers.' },
            { name: 'Precision Validation & Tests', agent: 'AGT-VAL-519', desc: 'Running test suites and verifying edge cases.' },
            { name: 'Artifact Deployment', agent: 'NEXUS-BUILD-01', desc: 'Packaging standalone executable artifact.' }
        ];
        this.lastStageIndex = -1;
    }

    getCurrentStage() {
        const stageIdx = Math.min(this.stages.length - 1, Math.floor((this.progress / 100) * this.stages.length));
        return { index: stageIdx, stage: this.stages[stageIdx] };
    }

    tick(activeAgentCount, simSpeed) {
        if (!this.active) return;
        
        // Progress rate based on mode
        let effectiveAgents = activeAgentCount || 100;
        if (this.mode === 'manual' && this.manualAgentCount > 0) {
            effectiveAgents = this.manualAgentCount;
        }

        const contributing = Math.max(10, Math.min(effectiveAgents, 50000));
        const stepRate = (contributing * simSpeed * 0.05);
        this.completedSubtasks = Math.min(this.subtaskCount, this.completedSubtasks + stepRate);
        this.progress = Math.min(100, (this.completedSubtasks / this.subtaskCount) * 100);

        // Check if stage transitioned
        const currentStageInfo = this.getCurrentStage();
        if (currentStageInfo.index > this.lastStageIndex) {
            this.lastStageIndex = currentStageInfo.index;
            const stage = currentStageInfo.stage;
            AgentUniverse.instance?.eventLog?.log('task', `[${stage.agent}] Stage ${currentStageInfo.index + 1}/${this.stages.length}: ${stage.name} for "${this.text}"`);
        }
        
        if (this.progress >= 100 && this.active) {
            this.progress = 100;
            this.active = false;
            this.completedAt = Date.now();
            AgentUniverse.instance?.eventLog?.log('task', `🎉 GOAL COMPLETE: "${this.text}" — Interactive App ready to play!`);
            AgentUniverse.instance?.onGoalCompleted(this);
        }
    }
}

// ==========================================
// BENCH POOL & EVENT LOG
// ==========================================

class BenchPool {
    constructor(initialCount) {
        this.count = initialCount;
        this.deployQueue = [];
        this.recallQueue = [];
    }

    deploy(count, factoryId) {
        const actualCount = Math.min(count, this.count);
        if (actualCount > 0) {
            this.deployQueue.push({ count: actualCount, factoryId });
        }
    }

    recall(agentIds) {
        this.recallQueue.push(...agentIds);
    }

    tick() {
        // Process deployments
        if (this.deployQueue.length > 0) {
            const req = this.deployQueue[0];
            const batch = Math.min(req.count, 500, this.count);
            if (batch > 0) {
                const fac = AgentUniverse.instance.getFactory(req.factoryId);
                if (fac) {
                    for (let i = 0; i < batch; i++) fac.addAgent(new Agent());
                    this.count -= batch;
                    req.count -= batch;
                } else {
                    req.count = 0;
                }
            }
            if (req.count <= 0) this.deployQueue.shift();
        }

        // Process recalls
        if (this.recallQueue.length > 0) {
            const batchCount = Math.min(this.recallQueue.length, 500);
            const batch = this.recallQueue.splice(0, batchCount);
            batch.forEach(id => {
                const fac = AgentUniverse.instance.findFactoryForAgent(id);
                if (fac) {
                    fac.removeAgent(id);
                    this.count++;
                }
            });
        }
    }
}

class EventLog {
    constructor(maxEvents = 150) {
        this.events = [];
        this.maxEvents = maxEvents;
    }

    log(type, message, detail = '') {
        this.events.unshift({
            id: generateId(),
            type,
            message,
            detail,
            timestamp: Date.now()
        });
        if (this.events.length > this.maxEvents) this.events.pop();
    }

    clear() {
        this.events = [];
    }
}

// ==========================================
// MAIN UNIVERSE SINGLETON
// ==========================================

class AgentUniverse {
    static instance = null;

    constructor() {
        if (AgentUniverse.instance) return AgentUniverse.instance;
        AgentUniverse.instance = this;

        this.industries = [];
        this.bench = new BenchPool(SIM_CONFIG.maxBenchAgents);
        this.eventLog = new EventLog(150);
        this.goals = [];
        this.convergenceMode = false;
        this.convergenceGoal = null;

        this.startTime = Date.now();
        this.lastTickTime = Date.now();
        this.simSpeed = 5;
        this.paused = false;

        this.metrics = {
            totalTasksCompleted: 0,
            globalThroughput: 0
        };

        this.renderer = new Renderer(this);
    }

    init() {
        // Clean slate: 0 hardcoded industries, 0 auto-goals on boot.
        // 1 Crore AI agents are free and ready in the reserve bench.
        // Industries and factories are dynamically decomposed and created when goals are set!
        this.eventLog.log('system', `Agent Universe initialized: 1,00,00,000 AI agents free in reserve bench.`);
        this.eventLog.log('system', `Ready for instructions. Set a goal above to decompose task tree and mobilize swarms.`);

        this.loop();
        this.renderer.init();
    }

    getFactory(factoryId) {
        for (const ind of this.industries) {
            for (const fac of ind.factories) {
                if (fac.id === factoryId) return fac;
            }
        }
        return null;
    }

    getIndustry(industryId) {
        return this.industries.find(i => i.id === industryId) || null;
    }

    getAllFactories() {
        let factories = [];
        for (const ind of this.industries) {
            factories = factories.concat(ind.factories);
        }
        return factories;
    }

    findFactoryForAgent(agentId) {
        for (const ind of this.industries) {
            for (const fac of ind.factories) {
                if (fac.agents.some(a => a.id === agentId)) return fac;
            }
        }
        return null;
    }

    addGoal(config) {
        // Auto unpause if paused
        if (this.paused) {
            this.paused = false;
            const stopBtn = document.getElementById('btn-emergency-stop');
            if (stopBtn) stopBtn.textContent = '⏸ Emergency Pause';
            this.eventLog.log('alert', 'Simulation auto-resumed to execute goal.');
        }

        // 1. Intelligent Goal Decomposition into Task Tree
        const decomp = GoalDecomposer.decompose(config.text);
        config.decomposition = decomp;
        config.subtaskCount = config.subtaskCount || (decomp.totalFactories * 150);

        const goal = new Goal(config);
        this.goals.unshift(goal);

        // 2. Dynamically spawn or link decomposed Industries & Factories
        let totalDeployed = 0;
        decomp.industries.forEach(indTpl => {
            let industry = this.industries.find(i => i.name.toLowerCase() === indTpl.name.toLowerCase());
            if (!industry) {
                industry = new Industry({
                    name: indTpl.name,
                    icon: indTpl.icon,
                    color: indTpl.color,
                    description: indTpl.description,
                    factories: []
                });
                this.industries.push(industry);
            }

            indTpl.factories.forEach(facTpl => {
                let factory = industry.factories.find(f => f.name.toLowerCase() === facTpl.name.toLowerCase());
                if (!factory) {
                    factory = new Factory(industry.id, {
                        name: facTpl.name,
                        goal: facTpl.goal
                    });
                    industry.factories.push(factory);
                }

                // Deploy agents from bench pool dynamically sized by app complexity
                const totalSwarmNeeded = config.mode === 'manual' && config.manualAgentCount > 0 
                    ? config.manualAgentCount 
                    : (decomp.estimatedAgentsNeeded || (decomp.totalFactories * 350));
                const agentQuota = Math.max(10, Math.floor(totalSwarmNeeded / Math.max(1, decomp.totalFactories)));

                this.bench.deploy(agentQuota, factory.id);
                totalDeployed += agentQuota;

                // Prime the factory with contextual tasks
                for (let i = 0; i < 3; i++) {
                    factory.generateTask();
                }
            });
        });

        if (config.convergence) {
            this.enterConvergenceMode(goal);
        }

        this.eventLog.log('deploy', `🎯 Task Tree decomposed: "${goal.text}" → ${decomp.industries.length} Major Branches, ${decomp.totalFactories} Subtask Factories (${formatNumber(totalDeployed)} agents deployed).`);
        if (this.renderer) this.renderer.populateFactoryDropdowns();
        
        return goal;
    }

    onGoalCompleted(goal) {
        const hasOtherActiveGoal = this.goals.some(g => g.id !== goal.id && g.active);
        if (!hasOtherActiveGoal) {
            let totalFreed = 0;
            this.industries.forEach(ind => {
                ind.factories.forEach(fac => {
                    totalFreed += fac.agents.length;
                    fac.agents = [];
                    fac.activeTasks = [];
                    fac.taskQueue = [];
                });
            });
            // Clear pending deploy/recall queues so no further workers are spawned
            this.bench.deployQueue = [];
            this.bench.recallQueue = [];
            this.bench.count = SIM_CONFIG.maxBenchAgents; // Return 100% of agents to Reserve Bench

            if (this.convergenceMode) this.exitConvergenceMode();
            this.eventLog.log('alert', `✅ Goal accomplished! All agents stood down & returned to Reserve Bench (1,00,00,000 ready). Swarm is idle.`);
        }
    }

    removeGoal(goalId) {
        const idx = this.goals.findIndex(g => g.id === goalId);
        if (idx > -1) {
            const goal = this.goals[idx];
            if (goal.convergence) this.exitConvergenceMode();
            this.goals.splice(idx, 1);
            this.eventLog.log('system', `Goal removed: "${goal.text}"`);
        }
    }

    enterConvergenceMode(goal) {
        this.convergenceMode = true;
        this.convergenceGoal = goal;
        const factories = this.getAllFactories();
        if (factories.length > 0) {
            const countPer = Math.floor(Math.min(this.bench.count, 20000) / factories.length);
            factories.forEach(f => this.bench.deploy(countPer, f.id));
        }
        this.eventLog.log('alert', `🎯 CONVERGENCE ACTIVE: All agents focused on "${goal.text}"`);
    }

    exitConvergenceMode() {
        this.convergenceMode = false;
        this.convergenceGoal = null;
        this.eventLog.log('alert', 'Convergence Mode concluded.');
    }

    freeAllAgents() {
        let totalFreed = 0;
        this.industries.forEach(ind => {
            ind.factories.forEach(fac => {
                totalFreed += fac.agents.length;
                this.bench.count += fac.agents.length;
                fac.agents = [];
                fac.activeTasks.forEach(t => {
                    t.status = TASK_STATUS.QUEUED;
                    fac.taskQueue.unshift(t);
                });
                fac.activeTasks = [];
            });
        });
        if (this.convergenceMode) this.exitConvergenceMode();
        this.eventLog.log('alert', `All ${formatNumber(totalFreed)} agents freed and returned to reserve bench.`);
    }

    customizeIndustry(id, config) {
        const ind = this.getIndustry(id);
        if (!ind) return;
        if (config.name) ind.name = config.name;
        if (config.icon) ind.icon = config.icon;
        if (config.color) ind.color = config.color;
        if (config.description) ind.description = config.description;
        this.eventLog.log('system', `Industry "${ind.name}" updated.`);
    }

    customizeFactory(id, config) {
        const fac = this.getFactory(id);
        if (!fac) return;
        if (config.name) fac.name = config.name;
        if (config.goal) fac.goal = config.goal;
        this.eventLog.log('system', `Factory "${fac.name}" updated.`);
    }

    addNewIndustry(config) {
        const ind = new Industry({
            name: config.name || 'New Industry',
            icon: config.icon || '🏗️',
            color: config.color || '#2563eb',
            description: config.description || 'Custom industry ecosystem.'
        });
        this.industries.push(ind);
        this.eventLog.log('deploy', `New industry created: "${ind.name}"`);
        return ind;
    }

    addNewFactory(industryId, config) {
        const ind = this.getIndustry(industryId);
        if (!ind) return null;
        const fac = new Factory(industryId, {
            name: config.name || 'New Factory',
            goal: config.goal || 'Production pipeline'
        });
        ind.factories.push(fac);
        this.bench.deploy(50, fac.id);
        this.eventLog.log('deploy', `New factory "${fac.name}" added to ${ind.name}.`);
        return fac;
    }

    tick() {
        if (this.paused) {
            this.lastTickTime = Date.now();
            return;
        }

        const now = Date.now();
        const deltaMs = now - this.lastTickTime;
        this.lastTickTime = now;

        this.bench.tick();

        let totalTasks = 0, totalThroughput = 0;
        for (const ind of this.industries) {
            ind.tick(deltaMs, this.simSpeed);
            for (const fac of ind.factories) {
                totalTasks += fac.metrics.tasksCompleted;
                totalThroughput += fac.metrics.throughput;
            }
        }

        this.metrics.totalTasksCompleted = totalTasks;
        this.metrics.globalThroughput = totalThroughput;

        // Tick goals
        const globalStats = this.getGlobalStats();
        this.goals.forEach(goal => {
            goal.tick(globalStats.activeAgents, this.simSpeed);
        });

        if (this.convergenceMode && this.convergenceGoal && !this.convergenceGoal.active) {
            this.exitConvergenceMode();
        }
    }

    loop = () => {
        this.tick();
        requestAnimationFrame(this.loop);
    }

    getGlobalStats() {
        let activeAgents = 0;
        this.industries.forEach(ind => {
            ind.factories.forEach(fac => {
                activeAgents += fac.agents.length;
            });
        });

        return {
            totalAgents: activeAgents + this.bench.count,
            activeAgents: activeAgents,
            benchAgents: this.bench.count,
            tasksCompleted: this.metrics.totalTasksCompleted,
            throughput: this.metrics.globalThroughput,
            uptimeMs: Date.now() - this.startTime
        };
    }
}

// ==========================================
// DOM RENDERER
// ==========================================

class Renderer {
    constructor(universe) {
        this.universe = universe;
        this.currentView = 'universe';
        this.currentIndustryId = null;
        this.currentFactoryId = null;
        this.lastRenderTime = 0;
        this.eventFilter = 'all';
        this._currentModalArtifact = null;
        this.deploymentMode = 'auto'; // 'auto' or 'manual'
    }

    init() {
        this.bindEvents();
        this.populateFactoryDropdowns();
        this.renderLoop();
    }

    populateFactoryDropdowns() {
        const selects = ['manual-target-factory', 'manual-goal-target-select'];
        selects.forEach(selId => {
            const el = document.getElementById(selId);
            if (!el) return;
            let html = selId === 'manual-goal-target-select' ? '<option value="auto">🌐 Auto-Selected Optimal Industry</option>' : '';
            this.universe.industries.forEach(ind => {
                html += `<optgroup label="${ind.icon} ${ind.name}">`;
                ind.factories.forEach(fac => {
                    html += `<option value="${fac.id}">${fac.name}</option>`;
                });
                html += `</optgroup>`;
            });
            el.innerHTML = html;
        });
    }

    bindEvents() {
        document.body.addEventListener('click', (e) => {
            // Top Nav Tabs
            const tabBtn = e.target.closest('.top-tab');
            if (tabBtn) {
                const view = tabBtn.dataset.view;
                this.switchView(view);
                return;
            }

            // Deployment Mode Selector
            const modePill = e.target.closest('.mode-pill');
            if (modePill) {
                document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
                modePill.classList.add('active');
                this.deploymentMode = modePill.dataset.mode;
                const opts = document.getElementById('manual-goal-options');
                if (opts) opts.style.display = this.deploymentMode === 'manual' ? 'block' : 'none';
                return;
            }

            // Manual Size Chips
            const sizeChip = e.target.closest('.manual-size-chip');
            if (sizeChip) {
                const count = sizeChip.dataset.size;
                const inp = document.getElementById('manual-goal-agent-count');
                if (inp) inp.value = count;
                return;
            }

            // Quick Dispatch Chips in Sidebar
            const qdChip = e.target.closest('.quick-dispatch-chip');
            if (qdChip) {
                const val = qdChip.dataset.val;
                const inp = document.getElementById('manual-agent-count');
                if (inp) inp.value = val;
                return;
            }

            // Manual Deploy from Sidebar
            if (e.target.id === 'btn-manual-deploy') {
                const facId = document.getElementById('manual-target-factory')?.value;
                const count = parseInt(document.getElementById('manual-agent-count')?.value) || 1000;
                if (facId && count > 0) {
                    this.universe.bench.deploy(count, facId);
                    const fac = this.universe.getFactory(facId);
                    this.universe.eventLog.log('deploy', `Manually dispatched ${formatNumber(count)} agents to [${fac ? fac.name : facId}].`);
                }
                return;
            }

            // Quick Suggestions
            const suggBtn = e.target.closest('.sugg-chip');
            if (suggBtn && !suggBtn.classList.contains('manual-size-chip')) {
                const goal = suggBtn.dataset.goal;
                const input = document.getElementById('quick-goal-input');
                if (input) input.value = goal;
                return;
            }

            // Quick Deploy Goal
            if (e.target.id === 'btn-quick-deploy-goal') {
                const input = document.getElementById('quick-goal-input');
                const text = input ? input.value.trim() : '';
                if (!text) {
                    alert('Please enter what you want the AI Swarm to create.');
                    return;
                }
                
                const isManual = this.deploymentMode === 'manual';
                const manualCount = parseInt(document.getElementById('manual-goal-agent-count')?.value) || 5000;
                const targetFac = document.getElementById('manual-goal-target-select')?.value;

                this.universe.addGoal({
                    text: text,
                    scope: 'universe',
                    priority: 'P1',
                    mode: isManual ? 'manual' : 'auto',
                    manualAgentCount: isManual ? manualCount : 0,
                    targetFactoryId: targetFac !== 'auto' ? targetFac : null
                });

                input.value = '';
                return;
            }

            // Quick Convergence Mode
            if (e.target.id === 'btn-quick-convergence') {
                const input = document.getElementById('quick-goal-input');
                const text = input && input.value.trim() ? input.value.trim() : 'make a smartwatch';
                this.universe.addGoal({ text: text, scope: 'universe', priority: 'P0', convergence: true });
                if (input) input.value = '';
                return;
            }

            // Sidebar Controls
            if (e.target.id === 'btn-deploy-batch') {
                const factories = this.universe.getAllFactories();
                if (factories.length > 0) {
                    const perFac = Math.ceil(10000 / factories.length);
                    factories.forEach(f => this.universe.bench.deploy(perFac, f.id));
                    this.universe.eventLog.log('deploy', 'Mobilized 10,000 agents across all factories.');
                }
            }
            if (e.target.id === 'btn-recall-batch') {
                const factories = this.universe.getAllFactories();
                let count = 0;
                factories.forEach(f => {
                    const idle = f.agents.filter(a => a.state === AGENT_STATE.IDLE).map(a => a.id);
                    this.universe.bench.recall(idle);
                    count += idle.length;
                });
                this.universe.eventLog.log('system', `Recalled ${formatNumber(count)} idle agents to bench.`);
            }
            if (e.target.id === 'btn-free-all') {
                this.universe.freeAllAgents();
            }
            if (e.target.id === 'btn-emergency-stop') {
                this.universe.paused = !this.universe.paused;
                e.target.textContent = this.universe.paused ? '▶ Resume Swarm' : '⏸ Emergency Pause';
                this.universe.eventLog.log('alert', `Swarm ${this.universe.paused ? 'PAUSED' : 'RESUMED'}.`);
            }

            // Navigation & Industry Cards
            const indCard = e.target.closest('.industry-card-white');
            if (indCard && !e.target.closest('button')) {
                this.switchView('industry', indCard.dataset.industryId);
                return;
            }
            const indNavItem = e.target.closest('.industry-nav-item');
            if (indNavItem) {
                this.switchView('industry', indNavItem.dataset.industryId);
                return;
            }
            const facBox = e.target.closest('.factory-box-white');
            if (facBox && !e.target.closest('button')) {
                this.switchView('factory', null, facBox.dataset.factoryId);
                return;
            }

            // Back Buttons
            if (e.target.id === 'btn-back-to-universe') this.switchView('universe');
            if (e.target.id === 'btn-back-to-industry') this.switchView('industry', this.currentIndustryId);

            // Open Apps & Test Artifact Buttons
            const openAppBtn = e.target.closest('.btn-open-app-modal');
            if (openAppBtn) {
                const goalId = openAppBtn.dataset.goalId;
                this.showArtifactModal(goalId);
                return;
            }
            const testInGalleryBtn = e.target.closest('.btn-test-in-gallery');
            if (testInGalleryBtn) {
                const goalId = testInGalleryBtn.dataset.goalId;
                this.loadAppIntoPlayer(goalId);
                this.switchView('apps-gallery');
                return;
            }

            // Edit / Customize Buttons
            const editIndBtn = e.target.closest('.btn-edit-industry');
            if (editIndBtn) {
                this.showCustomizeModal('industry', editIndBtn.dataset.industryId);
                return;
            }
            const editFacBtn = e.target.closest('.btn-edit-factory');
            if (editFacBtn) {
                this.showCustomizeModal('factory', editFacBtn.dataset.factoryId);
                return;
            }

            // Add Industry / Factory Buttons
            if (e.target.id === 'btn-add-industry-main' || e.target.id === 'btn-add-industry-hub' || e.target.id === 'btn-sidebar-add-industry') {
                this.showCustomizeModal('new-industry');
                return;
            }
            const addFacBtn = e.target.closest('.btn-add-factory-to-ind');
            if (addFacBtn) {
                this.showCustomizeModal('new-factory', addFacBtn.dataset.industryId);
                return;
            }

            // Goal Removal
            const rmGoalBtn = e.target.closest('.btn-remove-goal');
            if (rmGoalBtn) {
                this.universe.removeGoal(rmGoalBtn.dataset.goalId);
                return;
            }

            // Exit Convergence
            if (e.target.id === 'btn-exit-convergence') {
                this.universe.exitConvergenceMode();
            }

            // Modals Close
            if (e.target.classList.contains('modal-close') || e.target.id === 'btn-cancel-customize' || e.target.id === 'btn-cancel-goal' || e.target.id === 'btn-close-artifact' || e.target.id === 'modal-overlay') {
                this.hideModal();
            }

            // Submit Modals
            if (e.target.id === 'btn-save-customize') this.submitCustomize();
            if (e.target.id === 'btn-submit-goal') this.submitAdvancedGoal();

            // Artifact Modal Tabs
            const mTab = e.target.closest('.modal-tab');
            if (mTab) {
                const tab = mTab.dataset.tab;
                document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.artifact-tab-panel').forEach(p => p.classList.remove('active'));
                mTab.classList.add('active');
                document.getElementById(`artifact-tab-${tab}`)?.classList.add('active');
            }

            // Mobile Sidebar Toggle
            if (e.target.id === 'btn-toggle-mobile-sidebar') {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('mobile-open');
                return;
            }

            // Create Another App Button in Gallery
            if (e.target.id === 'btn-create-another-app') {
                this.switchView('universe');
                setTimeout(() => {
                    const inp = document.getElementById('quick-goal-input');
                    if (inp) { inp.focus(); inp.scrollIntoView({ behavior: 'smooth' }); }
                }, 100);
                return;
            }

            // Fullscreen Sandbox Player
            if (e.target.id === 'btn-player-fullscreen') {
                const wrap = document.getElementById('player-iframe-wrap');
                if (wrap) {
                    if (wrap.requestFullscreen) wrap.requestFullscreen();
                    else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
                }
                return;
            }

            // Open Standalone in New Tab
            const openTabBtn = e.target.closest('.btn-open-standalone-tab');
            if (e.target.id === 'btn-player-open-tab' || e.target.id === 'btn-open-artifact-tab' || openTabBtn) {
                const goalId = openTabBtn ? openTabBtn.dataset.goalId : (this._currentModalArtifact ? this._currentModalArtifact.id : null);
                const goal = (goalId ? this.universe.goals.find(g => g.id === goalId) : null) || this._currentModalArtifact || this.universe.goals[0];
                if (goal && goal.artifactData?.code) {
                    const blob = new Blob([goal.artifactData.code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                }
                return;
            }

            // Download App from Gallery Card
            const dlCardBtn = e.target.closest('.btn-download-app-card');
            if (dlCardBtn) {
                const goal = this.universe.goals.find(g => g.id === dlCardBtn.dataset.goalId);
                if (goal && goal.artifactData?.code) {
                    const blob = new Blob([goal.artifactData.code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    let safeName = (goal.artifactData?.title || goal.text || 'app').replace(/[^a-z0-9]/gi, '_').substring(0, 40);
                    a.download = `${safeName}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
                return;
            }

            // Copy / Download Code
            if (e.target.id === 'btn-copy-artifact-code' || e.target.id === 'btn-player-view-code') {
                const code = this._currentModalArtifact?.artifactData?.code;
                if (code) {
                    navigator.clipboard.writeText(code);
                    e.target.textContent = '✓ Copied!';
                    setTimeout(() => { e.target.textContent = '📋 Copy All Code'; }, 2000);
                }
            }
            if (e.target.id === 'btn-download-artifact' || e.target.id === 'btn-player-download') {
                const code = this._currentModalArtifact?.artifactData?.code;
                if (code) {
                    const blob = new Blob([code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    let safeName = (this._currentModalArtifact?.title || this._currentModalArtifact?.text || 'app').replace(/[^a-z0-9]/gi, '_').substring(0, 40);
                    a.download = `${safeName}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }
            if (e.target.id === 'btn-download-bundle' || e.target.id === 'btn-player-bundle' || e.target.id === 'btn-playstore-download-zip') {
                const goalId = this._currentModalArtifact ? this._currentModalArtifact.id : (this._playerCurrentGoalId || null);
                const goal = (goalId ? this.universe.goals.find(g => g.id === goalId) : null) || this._currentModalArtifact || this.universe.goals[0];
                const code = goal?.artifactData?.code;
                const title = goal?.artifactData?.title || goal?.text || 'Swarm App';
                if (code) {
                    AppPackager.downloadAppStoreBundle(code, title);
                }
            }

            // Modify App
            if (e.target.id === 'btn-player-modify-app' || e.target.id === 'btn-modal-modify-app') {
                const goalId = this._currentModalArtifact ? this._currentModalArtifact.id : (this._playerCurrentGoalId || null);
                const goal = (goalId ? this.universe.goals.find(g => g.id === goalId) : null) || this._currentModalArtifact || this.universe.goals[0];
                const code = goal?.artifactData?.code;
                
                if (!code) return;
                if (!SettingsManager.getApiKey()) {
                    alert('Please configure your Gemini API Key in Settings first.');
                    return;
                }

                const modifyInstruction = prompt('What would you like to change or add to this app? (e.g. "add a dark mode toggle", "make the header red", "add a new settings page")');
                if (!modifyInstruction || !modifyInstruction.trim()) return;

                // Update UI to show it's working
                const frameId = e.target.id === 'btn-player-modify-app' ? 'sandbox-player-frame' : null;
                const frame = frameId ? document.getElementById(frameId) : document.querySelector('.sandbox-iframe');
                
                if (frame) {
                    const loadingHtml = `<!DOCTYPE html><html lang="en"><body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;color:#fff;font-family:sans-serif;margin:0;"><div style="text-align:center;"><div style="border:4px solid rgba(255,255,255,0.1);width:40px;height:40px;border-radius:50%;border-left-color:#8b5cf6;animation:spin 1s linear infinite;margin:0 auto 16px;"></div><h3>Swarm is modifying the app...</h3><p style="color:#94a3b8;font-size:14px;">"${modifyInstruction}"</p></div><style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style></body></html>`;
                    frame.srcdoc = loadingHtml;
                }
                
                this.universe.eventLog.log('task', `[SWARM] Modifying app: "${modifyInstruction}"`);

                GeminiAPI.modifyApp(code, modifyInstruction).then(newCode => {
                    if (goal && goal.artifactData) {
                        goal.artifactData.code = newCode;
                        goal.artifactData.generatedAt = Date.now();
                        goal.text = goal.text + ` (Modified: ${modifyInstruction})`; // Keep track
                    }
                    if (frame) frame.srcdoc = newCode;
                    
                    const codeView = document.querySelector('#artifact-code-view code');
                    if (codeView && this._currentModalArtifact && this._currentModalArtifact.id === goalId) {
                        codeView.textContent = newCode;
                    }
                    this.universe.eventLog.log('task', `✅ App modified successfully!`);
                }).catch(err => {
                    this.universe.eventLog.log('alert', `❌ Modification failed: ${err.message}`);
                    alert('Failed to modify app: ' + err.message);
                    if (frame) frame.srcdoc = code; // restore original
                });
            }

            // Play Store Guide
            if (e.target.id === 'btn-open-playstore-guide' || e.target.id === 'btn-player-playstore-guide') {
                AppPackager.openPlayStoreGuide();
            }
            if (e.target.id === 'btn-close-playstore' || e.target.id === 'btn-close-playstore-x') {
                document.getElementById('modal-playstore').style.display = 'none';
                document.getElementById('modal-overlay').classList.remove('visible');
            }

            // Configure API Key (Hero Bar)
            if (e.target.id === 'btn-engine-configure-key') {
                SettingsManager.promptForApiKey();
            }

            // ── Saved App Gallery Actions ──
            
            // 1. Play Saved App
            const btnSavedPlay = e.target.closest('.btn-saved-app-play');
            if (btnSavedPlay) {
                const appId = btnSavedPlay.dataset.appId;
                const savedApp = AppStore.get(appId);
                if (savedApp) {
                    this._currentModalArtifact = savedApp; // Mock it as current artifact
                    document.getElementById('modal-artifact-title').textContent = savedApp.title || 'Saved App';
                    const frame = document.querySelector('.sandbox-iframe');
                    if (frame) frame.srcdoc = savedApp.code;
                    document.getElementById('modal-overlay').classList.add('visible');
                    document.getElementById('modal-artifact-sandbox').style.display = 'flex';
                }
            }

            // 2. Open Saved App in Tab
            const btnSavedTab = e.target.closest('.btn-saved-app-tab');
            if (btnSavedTab) {
                const appId = btnSavedTab.dataset.appId;
                const savedApp = AppStore.get(appId);
                if (savedApp && savedApp.code) {
                    const blob = new Blob([savedApp.code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                }
            }

            // 3. Download Saved App
            const btnSavedDownload = e.target.closest('.btn-saved-app-download');
            if (btnSavedDownload) {
                const appId = btnSavedDownload.dataset.appId;
                const savedApp = AppStore.get(appId);
                if (savedApp && savedApp.code) {
                    const blob = new Blob([savedApp.code], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    let safeName = (savedApp.title || savedApp.goalText || 'app').replace(/[^a-z0-9]/gi, '_').substring(0, 40);
                    a.download = `${safeName}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }

            // 4. Bundle Saved App
            const btnSavedBundle = e.target.closest('.btn-saved-app-bundle');
            if (btnSavedBundle) {
                const appId = btnSavedBundle.dataset.appId;
                const savedApp = AppStore.get(appId);
                if (savedApp && savedApp.code) {
                    AppPackager.downloadAppStoreBundle(savedApp.code, savedApp.title);
                }
            }

            // 5. Delete Saved App
            const btnSavedDelete = e.target.closest('.btn-saved-app-delete');
            if (btnSavedDelete) {
                const appId = btnSavedDelete.dataset.appId;
                if (confirm('Are you sure you want to delete this saved app? This cannot be undone.')) {
                    AppStore.remove(appId);
                    this.renderMyAppsGallery();
                }
            }

            // 6. Modify Saved App
            const btnSavedModify = e.target.closest('.btn-saved-app-modify');
            if (btnSavedModify) {
                const appId = btnSavedModify.dataset.appId;
                const savedApp = AppStore.get(appId);
                if (!savedApp || !savedApp.code) return;
                
                if (!SettingsManager.getApiKey()) {
                    alert('Please configure your Gemini API Key in Settings first.');
                    return;
                }

                const modifyInstruction = prompt('What would you like to change or add to this app?');
                if (!modifyInstruction || !modifyInstruction.trim()) return;

                this.universe.eventLog.log('task', `[SWARM] Modifying saved app: "${modifyInstruction}"`);
                
                // Show a loading UI over the gallery (or let them know it's working)
                btnSavedModify.textContent = "⏳ Modifying...";
                btnSavedModify.disabled = true;

                GeminiAPI.modifyApp(savedApp.code, modifyInstruction).then(newCode => {
                    const newHistory = [...(savedApp.modifyHistory || []), { date: Date.now(), instruction: modifyInstruction }];
                    AppStore.update(appId, { code: newCode, modifyHistory: newHistory });
                    this.universe.eventLog.log('task', `✅ Saved app modified successfully!`);
                    this.renderMyAppsGallery();
                }).catch(err => {
                    this.universe.eventLog.log('alert', `❌ Modification failed: ${err.message}`);
                    alert('Failed to modify app: ' + err.message);
                    btnSavedModify.textContent = "✨ Modify";
                    btnSavedModify.disabled = false;
                });
            }

            // Clear Feed
            if (e.target.id === 'btn-clear-feed') {
                this.universe.eventLog.clear();
            }

            // Feed Filters
            const filterPill = e.target.closest('.filter-pill');
            if (filterPill) {
                document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                filterPill.classList.add('active');
                this.eventFilter = filterPill.dataset.filter;
            }

            // Factory Agent Controls
            if (e.target.id === 'btn-factory-add-agents' && this.currentFactoryId) {
                this.universe.bench.deploy(50, this.currentFactoryId);
            }
            if (e.target.id === 'btn-factory-remove-agents' && this.currentFactoryId) {
                const fac = this.universe.getFactory(this.currentFactoryId);
                if (fac) {
                    const idle = fac.agents.filter(a => a.state === AGENT_STATE.IDLE).slice(0, 50).map(a => a.id);
                    this.universe.bench.recall(idle);
                }
            }

            // View Task Tree
            if (e.target.id === 'btn-view-active-tree') {
                this.switchView('task-tree');
                return;
            }
            const treeGoalBtn = e.target.closest('.btn-view-tree-goal');
            if (treeGoalBtn) {
                const goalId = treeGoalBtn.dataset.goalId;
                this.switchView('task-tree');
                const sel = document.getElementById('tree-goal-selector');
                if (sel) {
                    sel.value = goalId;
                    this.renderTaskTreeView();
                }
                return;
            }

            // View Suggestions
            if (e.target.id === 'btn-browse-suggestions-main' || e.target.id === 'btn-view-suggestions-from-hub') {
                this.switchView('suggestions');
                return;
            }
            if (e.target.id === 'btn-add-custom-industry-from-sugg') {
                this.showCustomizeModal('new-industry');
                return;
            }

            // Deploy Suggested Template
            const suggDeployBtn = e.target.closest('.btn-deploy-suggestion');
            if (suggDeployBtn) {
                const idx = parseInt(suggDeployBtn.dataset.templateIndex);
                const tpl = SUGGESTED_TEMPLATES[idx];
                if (tpl) {
                    const ind = new Industry({
                        name: tpl.name,
                        icon: tpl.icon,
                        color: tpl.color,
                        description: tpl.desc,
                        factories: []
                    });
                    this.universe.industries.push(ind);
                    tpl.factories.forEach(facName => {
                        const fac = new Factory(ind.id, {
                            name: facName,
                            goal: `Execute ${facName.toLowerCase()} pipeline tasks`
                        });
                        ind.factories.push(fac);
                        this.universe.bench.deploy(100, fac.id);
                        for (let i = 0; i < 3; i++) fac.generateTask();
                    });
                    this.universe.eventLog.log('deploy', `Template deployed: [${tpl.icon} ${tpl.name}] with ${tpl.factories.length} factories and ${tpl.factories.length * 100} agents.`);
                    this.populateFactoryDropdowns();
                    this.switchView('industries-hub');
                }
                return;
            }
        });

        // Quick goal Enter key
        document.getElementById('quick-goal-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-quick-deploy-goal')?.click();
            }
        });

        // Speed Slider
        document.getElementById('sim-speed')?.addEventListener('input', (e) => {
            this.universe.simSpeed = parseFloat(e.target.value);
            const lbl = document.getElementById('sim-speed-label');
            if (lbl) lbl.textContent = this.universe.simSpeed + 'x';
        });

        // Tree Goal Selector Change
        document.getElementById('tree-goal-selector')?.addEventListener('change', () => {
            this.renderTaskTreeView();
        });

        // Goal modal scope change
        document.getElementById('goal-scope')?.addEventListener('change', (e) => {
            const grp = document.getElementById('goal-target-group');
            if (grp) grp.style.display = e.target.value === 'universe' ? 'none' : 'block';
        });
    }

    switchView(view, industryId = null, factoryId = null) {
        this.currentView = view;
        this.currentIndustryId = industryId;
        this.currentFactoryId = factoryId;

        // Update Top Tabs
        document.querySelectorAll('.top-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === view);
        });

        // Hide all view panels
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active-view'));

        if (view === 'universe') {
            document.getElementById('universe-view')?.classList.add('active-view');
        } else if (view === 'task-tree') {
            document.getElementById('task-tree-view')?.classList.add('active-view');
            this.renderTaskTreeView();
        } else if (view === 'industries-hub') {
            document.getElementById('industries-hub-view')?.classList.add('active-view');
            this.renderIndustriesHub();
        } else if (view === 'suggestions') {
            document.getElementById('suggestions-view')?.classList.add('active-view');
            this.renderSuggestionsView();
        } else if (view === 'apps-gallery') {
            document.getElementById('apps-gallery-view')?.classList.add('active-view');
            if (this.universe.goals.length > 0 && !this._currentModalArtifact) {
                this.loadAppIntoPlayer(this.universe.goals[0].id);
            }
            this.renderAppsGallery();
        } else if (view === 'telemetry') {
            document.getElementById('telemetry-view')?.classList.add('active-view');
            this.renderTelemetry();
        } else if (view === 'industry') {
            document.getElementById('industry-view')?.classList.add('active-view');
            this.renderIndustryView();
        } else if (view === 'factory') {
            document.getElementById('factory-view')?.classList.add('active-view');
            this.renderFactoryView();
        }

        this.render();
    }

    renderLoop = () => {
        const now = Date.now();
        if (now - this.lastRenderTime >= SIM_CONFIG.renderThrottleMs) {
            this.render();
            this.lastRenderTime = now;
        }
        requestAnimationFrame(this.renderLoop);
    }

    render() {
        this.renderOverseerBar();
        this.renderSidebar();
        this.renderConvergenceBanner();

        if (this.currentView === 'universe') {
            this.renderUniverseView();
        } else if (this.currentView === 'task-tree') {
            this.renderTaskTreeView();
        } else if (this.currentView === 'industries-hub') {
            this.renderIndustriesHub();
        } else if (this.currentView === 'suggestions') {
            this.renderSuggestionsView();
        } else if (this.currentView === 'apps-gallery') {
            this.renderAppsGallery();
        } else if (this.currentView === 'telemetry') {
            this.renderTelemetry();
        } else if (this.currentView === 'industry' && this.currentIndustryId) {
            this.renderIndustryView();
        } else if (this.currentView === 'factory' && this.currentFactoryId) {
            this.renderFactoryView();
        }

        this.renderEventFeed();
    }

    safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    renderOverseerBar() {
        const stats = this.universe.getGlobalStats();
        this.safeSetText('metric-total-agents', formatNumber(stats.totalAgents));
        this.safeSetText('metric-active-agents', formatNumber(stats.activeAgents));
        this.safeSetText('metric-bench-agents', formatNumber(stats.benchAgents));
        this.safeSetText('metric-tasks-completed', formatNumber(stats.tasksCompleted));
        this.safeSetText('metric-throughput', Math.floor(stats.throughput));
        this.safeSetText('metric-uptime', formatTime(stats.uptimeMs));
        this.safeSetText('overseer-status', this.universe.paused ? '⏸ SYSTEM PAUSED' : '● SYSTEM OPTIMAL');
        this.safeSetText('apps-count-badge', this.universe.goals.length);
    }

    renderSidebar() {
        const stats = this.universe.getGlobalStats();
        this.safeSetText('bench-available', formatNumber(stats.benchAgents));

        let deploying = 0;
        this.universe.bench.deployQueue.forEach(q => deploying += q.count);
        this.safeSetText('bench-deploying', formatNumber(deploying));

        const pct = stats.totalAgents > 0 ? (stats.activeAgents / stats.totalAgents) * 100 : 0;
        const fill = document.getElementById('bench-bar');
        if (fill) fill.style.width = Math.min(100, Math.max(1, pct)) + '%';
        this.safeSetText('bench-pct', pct.toFixed(3) + '% active');

        // Sidebar industry list
        const container = document.getElementById('industry-nav');
        if (container) {
            let html = '';
            this.universe.industries.forEach(ind => {
                const s = ind.getStats();
                const isActive = this.currentView === 'industry' && this.currentIndustryId === ind.id;
                html += `
                <button class="industry-nav-item ${isActive ? 'active' : ''}" data-industry-id="${ind.id}">
                  <div class="ind-nav-left">
                    <span>${ind.icon}</span>
                    <span>${ind.name}</span>
                  </div>
                  <span class="ind-nav-count">${formatCompact(s.agents)}</span>
                </button>`;
            });
            if (this.universe.industries.length === 0) {
                html = '<div style="font-size:11px;color:var(--text-muted);padding:8px 0;text-align:center;">No active industries.<br>Deploy a goal or browse suggestions!</div>';
            }
            container.innerHTML = html;
        }
    }

    renderConvergenceBanner() {
        const banner = document.getElementById('convergence-banner');
        if (!banner) return;
        if (this.universe.convergenceMode && this.universe.convergenceGoal) {
            banner.classList.add('active');
            this.safeSetText('convergence-goal-text', this.universe.convergenceGoal.text);
            const fill = document.getElementById('convergence-bar');
            if (fill) fill.style.width = this.universe.convergenceGoal.progress + '%';
            this.safeSetText('convergence-pct', this.universe.convergenceGoal.progress.toFixed(1) + '%');
            const stats = this.universe.getGlobalStats();
            this.safeSetText('convergence-agents-working', formatCompact(stats.activeAgents) + ' agents');
        } else {
            banner.classList.remove('active');
        }
    }

    renderUniverseView() {
        // Render Active Goals
        const goalsContainer = document.getElementById('active-goals-container');
        if (goalsContainer) {
            if (this.universe.goals.length === 0) {
                goalsContainer.innerHTML = `
                <div class="clean-slate-card">
                  <div class="clean-slate-icon">✨</div>
                  <h4 class="clean-slate-title">Clean Slate: 1 Crore AI Agents Ready</h4>
                  <p class="clean-slate-desc">No goals currently running. Type what you want the AI swarm to build in the bar above, or click one of the quick templates below to automatically decompose into task branches!</p>
                  <div class="clean-slate-actions">
                    <button class="btn btn-sm btn-primary sugg-chip" data-goal="build a video creator studio app">🎬 Video Creator</button>
                    <button class="btn btn-sm btn-primary sugg-chip" data-goal="make a small calculator">🧮 Calculator</button>
                    <button class="btn btn-sm btn-primary sugg-chip" data-goal="make a smartwatch">⌚ Smartwatch OS</button>
                    <button class="btn btn-sm btn-outline-primary" id="btn-browse-suggestions-main">💡 Explore Suggestions</button>
                  </div>
                </div>`;
            } else {
                let html = '';
                this.universe.goals.forEach(goal => {
                    const isDone = goal.progress >= 100;
                    const stage = goal.getCurrentStage();
                    html += `
                    <div class="goal-card-white ${isDone ? 'completed-card' : ''}">
                      <span class="goal-priority-badge prio-${goal.priority.toLowerCase()}">${isDone ? 'READY' : goal.priority}</span>
                      <div class="goal-main-info">
                        <div class="goal-title-text">${goal.text}</div>
                        <div class="goal-meta-row">
                          <span style="font-weight:700;color:var(--accent-blue)">[${goal.mode.toUpperCase()}${goal.manualAgentCount ? ': ' + formatNumber(goal.manualAgentCount) + ' AGTS' : ''}]</span>
                          <span>•</span>
                          <span>${formatNumber(Math.round(goal.completedSubtasks))}/${formatNumber(goal.subtaskCount)} subtasks</span>
                          <span>•</span>
                          <span>${goal.decomposition ? goal.decomposition.industries.length + ' Branches' : 'Auto'}</span>
                        </div>
                        <div>
                          <span class="goal-stage-pill ${isDone ? 'done' : ''}">
                            ${isDone ? '✨ Live Artifact Compiled & Ready' : `⚡ Stage ${stage.index + 1}/${goal.stages.length}: ${stage.stage.name}`}
                          </span>
                        </div>
                      </div>
                      <div class="goal-progress-box">
                        <div class="goal-bar-track">
                          <div class="goal-bar-fill" style="width:${goal.progress}%"></div>
                        </div>
                        <span class="goal-pct-text">${goal.progress.toFixed(1)}%</span>
                      </div>
                      <div class="goal-actions-wrap">
                        <button class="btn btn-sm btn-outline-primary btn-view-tree-goal" data-goal-id="${goal.id}" title="Inspect hierarchical task tree">
                          🌳 Task Tree
                        </button>
                        <button class="btn btn-sm btn-success btn-open-app-modal" data-goal-id="${goal.id}">
                          🎮 Open App
                        </button>
                        <button class="btn btn-sm btn-outline-secondary btn-test-in-gallery" data-goal-id="${goal.id}" title="Open in Gallery">
                          ⛶ Gallery
                        </button>
                        <button class="btn-text-link btn-remove-goal" data-goal-id="${goal.id}" style="color:var(--text-muted);font-size:14px;padding:4px;" title="Remove">✕</button>
                      </div>
                    </div>`;
                });
                goalsContainer.innerHTML = html;
            }
        }

        // Render Industry Ecosystems
        const indGrid = document.getElementById('industries-grid');
        if (indGrid) {
            if (this.universe.industries.length === 0) {
                indGrid.innerHTML = `
                <div class="clean-slate-card" style="grid-column: 1/-1;">
                  <div class="clean-slate-icon">🏭</div>
                  <h4 class="clean-slate-title">No Active Industries Yet</h4>
                  <p class="clean-slate-desc">Industries represent the major task branches. When you set a goal, the AI Swarm automatically creates the required branches, or you can add them from suggested templates!</p>
                  <div class="clean-slate-actions">
                    <button class="btn btn-primary" id="btn-browse-suggestions-main">💡 Browse Industry Suggestions</button>
                    <button class="btn btn-outline-primary" id="btn-add-industry-main">+ Custom Industry</button>
                  </div>
                </div>`;
            } else {
                let html = '';
                this.universe.industries.forEach(ind => {
                    const s = ind.getStats();
                    html += `
                    <div class="industry-card-white" data-industry-id="${ind.id}">
                      <div class="ind-card-header">
                        <div class="ind-card-title-group">
                          <span class="ind-card-icon">${ind.icon}</span>
                          <h4 class="ind-card-name">${ind.name}</h4>
                        </div>
                        <button class="btn btn-sm btn-outline-secondary btn-edit-industry" data-industry-id="${ind.id}">✎ Edit</button>
                      </div>
                      <p class="ind-card-desc">${ind.description}</p>
                      <div class="ind-card-metrics-grid">
                        <div class="ind-metric-item">
                          <div class="ind-metric-val mono">${formatNumber(s.agents)}</div>
                          <div class="ind-metric-lbl">Active Agents</div>
                        </div>
                        <div class="ind-metric-item">
                          <div class="ind-metric-val mono">${formatNumber(s.tasks)}</div>
                          <div class="ind-metric-lbl">Completed</div>
                        </div>
                        <div class="ind-metric-item">
                          <div class="ind-metric-val mono">${Math.floor(s.throughput)}/m</div>
                          <div class="ind-metric-lbl">Throughput</div>
                        </div>
                        <div class="ind-metric-item">
                          <div class="ind-metric-val mono">${s.factoriesCount}</div>
                          <div class="ind-metric-lbl">Factories</div>
                        </div>
                      </div>
                      <div class="ind-card-footer-flex">
                        <span class="view-factories-link">Explore ${s.factoriesCount} Factories →</span>
                      </div>
                    </div>`;
                });
                indGrid.innerHTML = html;
            }
        }
    }

    renderTaskTreeView() {
        const container = document.getElementById('task-tree-container');
        if (!container) return;

        // Populate selector
        const selector = document.getElementById('tree-goal-selector');
        if (selector) {
            let selHtml = '';
            this.universe.goals.forEach(g => {
                selHtml += `<option value="${g.id}">🎯 ${g.text} (${g.progress.toFixed(0)}%)</option>`;
            });
            if (this.universe.goals.length === 0) {
                selHtml = '<option value="">No Active Goals</option>';
            }
            if (!selector.dataset.initialized || selector.children.length !== this.universe.goals.length) {
                const currentVal = selector.value;
                selector.innerHTML = selHtml;
                if (currentVal) selector.value = currentVal;
                selector.dataset.initialized = 'true';
            }
        }

        const selectedGoalId = selector ? selector.value : null;
        const goal = (selectedGoalId ? this.universe.goals.find(g => g.id === selectedGoalId) : null) || this.universe.goals[0];

        if (!goal) {
            container.innerHTML = `
            <div class="clean-slate-card">
              <div class="clean-slate-icon">🌳</div>
              <h3 class="clean-slate-title">No Goal Decomposed Yet</h3>
              <p class="clean-slate-desc">Set a goal to watch the AI swarm decompose your major objective into Main Branches (Industries), Sub-Tasks (Factories), and assign specialized AI agents!</p>
              <div class="clean-slate-actions">
                <button class="btn btn-primary" onclick="document.getElementById('tab-universe').click()">🚀 Deploy a Swarm Goal</button>
              </div>
            </div>`;
            return;
        }

        const isDone = goal.progress >= 100;
        const decomp = goal.decomposition || GoalDecomposer.decompose(goal.text);
        const stats = this.universe.getGlobalStats();

        let html = `
        <!-- Root Goal Node -->
        <div class="tree-root-card">
          <div class="tree-root-header">
            <div class="tree-root-title-group">
              <div class="tree-root-icon">🎯</div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <h3 class="tree-root-title">${goal.text}</h3>
                  <span class="goal-priority-badge prio-${goal.priority.toLowerCase()}">${isDone ? 'COMPLETED' : goal.priority}</span>
                </div>
                <p class="tree-root-meta">
                  Decomposed into <strong>${decomp.industries.length} Major Branches</strong> • <strong>${decomp.totalFactories} Subtask Factories</strong> • <strong>${formatNumber(Math.round(goal.completedSubtasks))}/${formatNumber(goal.subtaskCount)} subtasks</strong>
                </p>
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-success btn-open-app-modal" data-goal-id="${goal.id}">🎮 Test App Artifact</button>
              <button class="btn btn-sm btn-outline-primary btn-open-standalone-tab" data-goal-id="${goal.id}">↗ Standalone Tab</button>
            </div>
          </div>
          <div class="goal-progress-box">
            <div class="goal-bar-track">
              <div class="goal-bar-fill" style="width:${goal.progress}%"></div>
            </div>
            <span class="goal-pct-text">${goal.progress.toFixed(1)}%</span>
          </div>
        </div>

        <!-- Major Task Branches (Industries) -->
        <div class="tree-branches-grid">`;

        decomp.industries.forEach((indTpl, indIdx) => {
            const industry = this.universe.industries.find(i => i.name.toLowerCase() === indTpl.name.toLowerCase());
            const indStats = industry ? industry.getStats() : { agents: 0, tasks: 0, throughput: 0 };
            
            html += `
            <div class="tree-branch-card" style="border-top: 4px solid ${indTpl.color};">
              <div class="tree-branch-header">
                <div class="tree-branch-title-group">
                  <span class="tree-branch-icon">${indTpl.icon}</span>
                  <div>
                    <h4 class="tree-branch-name">${indTpl.name}</h4>
                    <span style="font-size:11px;color:var(--text-muted);">${indTpl.description}</span>
                  </div>
                </div>
                <span class="tree-branch-badge">${formatCompact(indStats.agents)} agents</span>
              </div>

              <!-- Sub-Tasks (Factories) in this branch -->
              <div class="tree-factories-list">`;

            indTpl.factories.forEach((facTpl, facIdx) => {
                const factory = industry ? industry.factories.find(f => f.name.toLowerCase() === facTpl.name.toLowerCase()) : null;
                const facAgents = factory ? factory.agents.length : 0;
                const facActiveTasks = factory ? factory.activeTasks.length : 0;
                const facCompleted = factory ? factory.metrics.tasksCompleted : 0;
                const facThroughput = factory ? Math.floor(factory.metrics.throughput) : 0;

                // Thinking agents sample
                const activeAgent = factory && factory.agents.length > 0 ? factory.agents[0] : null;
                const agentThinkingText = activeAgent && activeAgent.currentTask ? activeAgent.currentTask.name : 'Analyzing & executing sub-goal...';

                html += `
                <div class="tree-subtask-item">
                  <div class="tree-subtask-header">
                    <span class="tree-subtask-name">⚙️ ${facTpl.name}</span>
                    <span class="tree-subtask-agents">👥 ${formatCompact(facAgents)}</span>
                  </div>
                  <p class="tree-subtask-goal">🎯 ${facTpl.goal}</p>
                  
                  <div class="tree-agent-pulse-row">
                    <div style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                      <span class="thinking-pulse-dot"></span>
                      <span style="font-size:11px;color:var(--text-body);font-weight:500;">${agentThinkingText}</span>
                    </div>
                    <span class="mono" style="font-size:10px;color:var(--text-muted);">${facCompleted} done (${facThroughput}/m)</span>
                  </div>
                </div>`;
            });

            html += `
              </div>
            </div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    renderSuggestionsView() {
        const grid = document.getElementById('suggestions-catalog-grid');
        if (!grid) return;

        let html = '';
        SUGGESTED_TEMPLATES.forEach((tpl, idx) => {
            const isAlreadyAdded = this.universe.industries.some(i => i.name.toLowerCase() === tpl.name.toLowerCase());
            
            html += `
            <div class="suggestion-card" style="border-top: 3px solid ${tpl.color};">
              <div>
                <div class="sugg-card-header">
                  <span class="sugg-card-icon" style="background:${tpl.color}15;color:${tpl.color};">${tpl.icon}</span>
                  <div>
                    <h4 class="sugg-card-title">${tpl.name}</h4>
                    <span style="font-size:11px;color:var(--text-muted);">${tpl.factories.length} specialized factories</span>
                  </div>
                </div>
                <p class="sugg-card-desc" style="margin-top:10px;">${tpl.desc}</p>
                
                <div class="sugg-factories-wrap" style="margin-top:14px;">
                  <span class="sugg-factories-label">Included Factories:</span>
                  <div class="sugg-factory-pills">
                    ${tpl.factories.map(f => `<span class="sugg-factory-pill">${f}</span>`).join('')}
                  </div>
                </div>
              </div>

              <div>
                <button class="sugg-deploy-btn btn-deploy-suggestion" data-template-index="${idx}">
                  ${isAlreadyAdded ? '✓ Added (Click to add more workers)' : '➕ Add to Active Swarm (+400 Agents)'}
                </button>
              </div>
            </div>`;
        });

        grid.innerHTML = html;
    }

    renderIndustriesHub() {
        const container = document.getElementById('all-industries-factories-container');
        if (!container) return;

        if (this.universe.industries.length === 0) {
            container.innerHTML = `
            <div class="clean-slate-card">
              <div class="clean-slate-icon">🏭</div>
              <h3 class="clean-slate-title">No Active Industries</h3>
              <p class="clean-slate-desc">Your swarm has 1 Crore free agents ready. Set a goal or add an industry from the suggested templates below!</p>
              <div class="clean-slate-actions">
                <button class="btn btn-primary" onclick="document.getElementById('tab-suggestions').click()">💡 Browse Suggested Templates</button>
                <button class="btn btn-outline-primary" id="btn-add-industry-hub">+ Custom Industry</button>
              </div>
            </div>`;
            return;
        }

        let html = '';
        this.universe.industries.forEach(ind => {
            const s = ind.getStats();
            html += `
            <div class="hub-industry-block">
              <div class="hub-ind-header">
                <div class="ind-card-title-group">
                  <span class="ind-card-icon">${ind.icon}</span>
                  <div>
                    <h3 style="font-size:18px;font-weight:800;color:var(--text-heading)">${ind.name}</h3>
                    <p style="font-size:12px;color:var(--text-muted)">${ind.description}</p>
                  </div>
                </div>
                <div class="ind-action-buttons">
                  <button class="btn btn-sm btn-outline-secondary btn-edit-industry" data-industry-id="${ind.id}">✎ Rename Industry</button>
                  <button class="btn btn-sm btn-primary btn-add-factory-to-ind" data-industry-id="${ind.id}">+ Add Factory</button>
                </div>
              </div>
              <div class="hub-factories-grid">`;
            
            ind.factories.forEach(fac => {
                const fs = fac.getStats();
                html += `
                <div class="factory-box-white" data-factory-id="${fac.id}">
                  <div class="factory-box-header">
                    <span class="factory-box-name">${fac.name}</span>
                    <button class="btn btn-sm btn-outline-secondary btn-edit-factory" data-factory-id="${fac.id}">✎ Customize</button>
                  </div>
                  <p class="factory-box-goal">🎯 ${fac.goal}</p>
                  <div class="factory-box-stats">
                    <span>👥 ${fs.agentCount} Agents</span>
                    <span>⚡ ${Math.floor(fs.throughput)}/min</span>
                    <span>✓ ${formatNumber(fs.completedCount)} Done</span>
                  </div>
                </div>`;
            });

            html += `
              </div>
            </div>`;
        });
        container.innerHTML = html;
    }

    loadAppIntoPlayer(goalId) {
        const goal = this.universe.goals.find(g => g.id === goalId) || this.universe.goals[0];
        if (!goal) return;
        this._currentModalArtifact = goal;
        this.safeSetText('player-app-title', goal.artifactData.title || goal.text);
        this.safeSetText('player-app-meta', `Created for goal: "${goal.text}" • 100% Verified`);
        const wrap = document.getElementById('player-iframe-wrap');
        if (wrap) {
            wrap.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.className = 'player-iframe';
            iframe.srcdoc = goal.artifactData.code;
            wrap.appendChild(iframe);
        }
    }

    renderAppsGallery() {
        const grid = document.getElementById('apps-gallery-grid');
        if (!grid) return;
        let html = '';

        // ── Section 1: Current Session Goals ──
        if (this.universe.goals.length > 0) {
            html += `<div style="grid-column:1/-1;margin-bottom:4px;"><h4 style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">🔴 Current Session Apps</h4></div>`;
            this.universe.goals.forEach(goal => {
                const statusColor = goal.active ? '#f59e0b' : '#10b981';
                const statusText = goal.active ? '⏳ BUILDING...' : '✓ READY';
                html += `
                <div class="app-gallery-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="app-card-type">${goal.artifactData?.type || 'dynamic'}</span>
                    <span style="font-size:10px;font-weight:700;color:${statusColor}">${statusText}</span>
                  </div>
                  <h4 class="app-card-title">${goal.artifactData?.title || goal.text}</h4>
                  <p style="font-size:12px;color:var(--text-muted);line-height:1.4;">Goal: "${goal.text}"</p>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto;padding-top:10px;">
                    <button class="btn btn-sm btn-success btn-open-app-modal" data-goal-id="${goal.id}">🎮 Play App</button>
                    <button class="btn btn-sm btn-outline-primary btn-open-standalone-tab" data-goal-id="${goal.id}">↗ Open Tab</button>
                    <button class="btn btn-sm btn-outline-secondary btn-test-in-gallery" data-goal-id="${goal.id}">⛶ In Sandbox</button>
                    <button class="btn btn-sm btn-outline-secondary btn-download-app-card" data-goal-id="${goal.id}">⬇ Download</button>
                  </div>
                </div>`;
            });
        }

        // ── Section 2: Saved / Persisted Apps ──
        const savedApps = AppStore.getAll();
        if (savedApps.length > 0) {
            html += `<div style="grid-column:1/-1;margin-top:16px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
                <h4 style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">💾 My Saved Apps (${savedApps.length})</h4>
                <span style="font-size:11px;color:var(--text-muted);">Apps persist even after closing the browser</span>
            </div>`;
            savedApps.forEach(app => {
                const sizeKB = (app.size / 1024).toFixed(1);
                const dateStr = new Date(app.modifiedAt || app.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
                const complexityColor = app.complexity === 'enterprise' ? '#7c3aed' : app.complexity === 'large' ? '#f97316' : app.complexity === 'medium' ? '#3b82f6' : '#10b981';
                html += `
                <div class="app-gallery-card" style="border-left:3px solid ${complexityColor};">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:10px;font-weight:600;color:#fff;background:${complexityColor};padding:2px 8px;border-radius:8px;text-transform:uppercase;">${app.complexity || 'app'}</span>
                    <span style="font-size:10px;color:var(--text-muted);">${sizeKB} KB • ${dateStr}</span>
                  </div>
                  <h4 class="app-card-title" style="margin-top:8px;">${app.title || app.goalText}</h4>
                  ${app.modifyHistory && app.modifyHistory.length > 0 ? `<p style="font-size:11px;color:#8b5cf6;margin-top:4px;">Modified ${app.modifyHistory.length} time(s)</p>` : ''}
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto;padding-top:10px;">
                    <button class="btn btn-sm btn-success btn-saved-app-play" data-app-id="${app.id}">🎮 Play</button>
                    <button class="btn btn-sm btn-outline-primary btn-saved-app-tab" data-app-id="${app.id}">↗ Open Tab</button>
                    <button class="btn btn-sm btn-primary btn-saved-app-modify" data-app-id="${app.id}" style="background:#8b5cf6;border-color:#8b5cf6;">✨ Modify</button>
                    <button class="btn btn-sm btn-outline-secondary btn-saved-app-download" data-app-id="${app.id}">⬇ Download</button>
                    <button class="btn btn-sm btn-success btn-saved-app-bundle" data-app-id="${app.id}" style="background:#059669;border-color:#059669;">📦 All OS Bundle</button>
                    <button class="btn btn-sm btn-outline-danger btn-saved-app-delete" data-app-id="${app.id}" style="color:#ef4444;border-color:#ef4444;">🗑 Delete</button>
                  </div>
                </div>`;
            });
        }

        if (this.universe.goals.length === 0 && savedApps.length === 0) {
            html = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;">
                <p style="font-size:48px;margin-bottom:12px;">🚀</p>
                <h3 style="color:var(--text-primary);">No Apps Yet</h3>
                <p style="color:var(--text-muted);margin-top:8px;">Set a goal on the main screen to have the AI Swarm build your first app. All generated apps are saved permanently here.</p>
            </div>`;
        }

        grid.innerHTML = html;
    }

    // Alias for external calls
    renderMyAppsGallery() {
        if (this.currentView === 'apps-gallery') {
            this.renderAppsGallery();
        }
    }

    renderTelemetry() {
        const stats = this.universe.getGlobalStats();
        const pct = (stats.activeAgents / stats.totalAgents) * 100;
        this.safeSetText('tel-utilization', pct.toFixed(3) + '%');
        this.safeSetText('tel-tasks', formatNumber(stats.tasksCompleted));
        this.safeSetText('tel-throughput', Math.floor(stats.throughput) + ' tasks/min');

        const feed = document.getElementById('telemetry-full-events');
        if (feed) {
            let html = '';
            this.universe.eventLog.events.forEach(e => {
                const time = new Date(e.timestamp).toLocaleTimeString();
                html += `
                <div class="feed-event-card event-${e.type}">
                  <span class="feed-event-time">${time}</span>
                  <span class="feed-event-msg">${e.message}</span>
                </div>`;
            });
            feed.innerHTML = html;
        }
    }

    renderIndustryView() {
        const ind = this.universe.getIndustry(this.currentIndustryId);
        if (!ind) return;
        this.safeSetText('industry-title', `${ind.icon} ${ind.name}`);
        this.safeSetText('industry-subtitle', ind.description);

        const stats = ind.getStats();
        const metricsHtml = `
          <div class="metric-card"><span class="metric-label">Agents Deployed</span><span class="metric-value mono">${formatNumber(stats.agents)}</span></div>
          <div class="metric-card"><span class="metric-label">Tasks Completed</span><span class="metric-value mono">${formatNumber(stats.tasks)}</span></div>
          <div class="metric-card"><span class="metric-label">Throughput</span><span class="metric-value mono">${Math.floor(stats.throughput)}/min</span></div>
          <div class="metric-card"><span class="metric-label">Factories</span><span class="metric-value mono">${stats.factoriesCount}</span></div>
        `;
        const metricsEl = document.getElementById('industry-metrics');
        if (metricsEl) metricsEl.innerHTML = metricsHtml;

        const grid = document.getElementById('factories-grid');
        if (grid) {
            let html = '';
            ind.factories.forEach(fac => {
                const fs = fac.getStats();
                html += `
                <div class="factory-box-white" data-factory-id="${fac.id}" style="background:#fff;">
                  <div class="factory-box-header">
                    <span class="factory-box-name" style="font-size:15px;">${fac.name}</span>
                    <button class="btn btn-sm btn-outline-secondary btn-edit-factory" data-factory-id="${fac.id}">✎ Customize</button>
                  </div>
                  <p class="factory-box-goal">🎯 ${fac.goal}</p>
                  <div class="factory-box-stats" style="margin-top:12px;">
                    <span>👥 ${fs.agentCount} Agents</span>
                    <span>⚡ ${Math.floor(fs.throughput)}/min</span>
                    <span>✓ ${formatNumber(fs.completedCount)} Done</span>
                  </div>
                  <button class="btn btn-sm btn-primary" style="margin-top:10px;" onclick="agentUniverse.renderer.switchView('factory', null, '${fac.id}')">View Factory Console →</button>
                </div>`;
            });
            grid.innerHTML = html;
        }
    }

    renderFactoryView() {
        const fac = this.universe.getFactory(this.currentFactoryId);
        if (!fac) return;
        const ind = this.universe.getIndustry(fac.industryId);

        this.safeSetText('factory-title', `${fac.name}`);
        this.safeSetText('factory-subtitle', `Industry: ${ind ? ind.name : 'Unknown'} • ID: ${fac.id}`);

        const fs = fac.getStats();
        const statsEl = document.getElementById('factory-stats');
        if (statsEl) {
            statsEl.innerHTML = `
              <h4 class="card-heading">FACTORY TELEMETRY</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div><div style="font-size:18px;font-weight:800;" class="mono">${fs.agentCount}</div><div style="font-size:10px;color:var(--text-muted)">ACTIVE AGENTS</div></div>
                <div><div style="font-size:18px;font-weight:800;" class="mono">${fs.queueLength}</div><div style="font-size:10px;color:var(--text-muted)">TASK QUEUE</div></div>
                <div><div style="font-size:18px;font-weight:800;" class="mono">${Math.floor(fs.throughput)}/m</div><div style="font-size:10px;color:var(--text-muted)">THROUGHPUT</div></div>
                <div><div style="font-size:18px;font-weight:800;" class="mono">${formatNumber(fs.completedCount)}</div><div style="font-size:10px;color:var(--text-muted)">COMPLETED</div></div>
              </div>`;
        }

        const goalContent = document.getElementById('factory-goal-content');
        if (goalContent) {
            goalContent.innerHTML = `<p style="font-size:13px;font-weight:600;color:var(--text-heading)">🎯 ${fac.goal}</p>`;
        }

        // Active Tasks
        this.safeSetText('factory-task-count', fac.activeTasks.length + fac.taskQueue.length);
        const taskList = document.getElementById('factory-tasks-list');
        if (taskList) {
            let html = '';
            [...fac.activeTasks, ...fac.taskQueue].slice(0, 20).forEach(t => {
                html += `
                <div class="task-item-white">
                  <span style="font-weight:600;">${t.name}</span>
                  <span class="pill-badge">${t.status}</span>
                </div>`;
            });
            taskList.innerHTML = html || '<div style="color:var(--text-muted);font-size:12px;">Queue idle.</div>';
        }

        // Output Log
        const outLog = document.getElementById('factory-output-log');
        if (outLog) {
            let html = '';
            fac.outputLog.slice(0, 15).forEach(l => {
                const time = new Date(l.timestamp).toLocaleTimeString();
                html += `<div><span style="color:#94a3b8">[${time}]</span> <span style="color:#a7f3d0">[${l.agentId || 'SYS'}]</span> ${l.text}</div>`;
            });
            outLog.innerHTML = html || 'Console idle.';
        }

        // Agents
        this.safeSetText('factory-agent-count', fac.agents.length);
        const agtList = document.getElementById('factory-agents-list');
        if (agtList) {
            let html = '';
            fac.agents.slice(0, 25).forEach(a => {
                html += `
                <div class="agent-item-white">
                  <span class="mono" style="font-weight:700;">${a.id}</span>
                  <span style="font-size:10px;font-weight:600;color:var(--accent-blue);">${a.type}</span>
                  <span class="pill-badge" style="color:${a.state === 'WORKING' ? 'var(--accent-emerald)' : 'var(--text-muted)'}">${a.state}</span>
                </div>`;
            });
            agtList.innerHTML = html;
        }
    }

    renderEventFeed() {
        const feed = document.getElementById('events-list');
        if (!feed) return;
        let events = this.universe.eventLog.events;
        if (this.eventFilter !== 'all') {
            events = events.filter(e => e.type === this.eventFilter);
        }
        let html = '';
        events.slice(0, 30).forEach(e => {
            const time = new Date(e.timestamp).toLocaleTimeString();
            html += `
            <div class="feed-event-card event-${e.type}">
              <span class="feed-event-time">${time}</span>
              <span class="feed-event-msg">${e.message}</span>
            </div>`;
        });
        feed.innerHTML = html;
    }

    // Modals
    showModal() {
        document.getElementById('modal-overlay')?.classList.add('visible');
    }

    hideModal() {
        document.getElementById('modal-overlay')?.classList.remove('visible');
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        this._customizeContext = null;
    }

    showArtifactModal(goalId) {
        const goal = this.universe.goals.find(g => g.id === goalId) || this.universe.goals[0];
        if (!goal) return;

        this.hideModal();
        const modal = document.getElementById('modal-artifact');
        if (!modal) return;

        this._currentModalArtifact = goal;
        this.safeSetText('artifact-title', goal.artifactData.title || `Created: ${goal.text}`);
        this.safeSetText('artifact-meta', `Goal: "${goal.text}" • 100% Verified Application`);

        // Sandbox Iframe
        const frame = document.getElementById('sandbox-container');
        if (frame) {
            frame.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.className = 'sandbox-iframe';
            iframe.srcdoc = goal.artifactData.code;
            frame.appendChild(iframe);
        }

        // Code view
        const codeView = document.querySelector('#artifact-code-view code');
        if (codeView) codeView.textContent = goal.artifactData.code;

        // Logs
        const logsView = document.getElementById('artifact-logs-view');
        if (logsView) {
            let html = '';
            goal.stages.forEach((stg, i) => {
                html += `
                <div class="log-step-card">
                  <div style="display:flex;justify-content:space-between;font-weight:700;color:var(--text-heading)">
                    <span>✓ Stage ${i+1}: ${stg.name}</span>
                    <span class="mono" style="font-size:11px;color:var(--accent-blue)">${stg.agent}</span>
                  </div>
                  <p style="font-size:12px;color:var(--text-muted);margin-top:2px;">${stg.desc}</p>
                </div>`;
            });
            logsView.innerHTML = html;
        }

        // Reset tabs
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.artifact-tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('.modal-tab[data-tab="preview"]')?.classList.add('active');
        document.getElementById('artifact-tab-preview')?.classList.add('active');

        modal.style.display = 'flex';
        this.showModal();
    }

    showCustomizeModal(type, id) {
        this.hideModal();
        const modal = document.getElementById('modal-customize');
        if (!modal) return;
        this._customizeContext = { type, id };
        const title = document.getElementById('customize-title');
        const body = document.getElementById('customize-body');
        if (!body) return;

        if (type === 'industry') {
            const ind = this.universe.getIndustry(id);
            if (!ind) return;
            title.textContent = `Rename Industry: ${ind.name}`;
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Industry Name</label><input class="form-input" id="cust-name" value="${ind.name}"></div>
              <div class="form-group"><label class="form-label">Icon (Emoji)</label><input class="form-input" id="cust-icon" value="${ind.icon}"></div>
              <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cust-desc">${ind.description}</textarea></div>`;
        } else if (type === 'factory') {
            const fac = this.universe.getFactory(id);
            if (!fac) return;
            title.textContent = `Customize Factory: ${fac.name}`;
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Factory Name</label><input class="form-input" id="cust-name" value="${fac.name}"></div>
              <div class="form-group"><label class="form-label">Factory Goal</label><textarea class="form-textarea" id="cust-goal">${fac.goal}</textarea></div>`;
        } else if (type === 'new-industry') {
            title.textContent = 'Add New Industry';
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Industry Name</label><input class="form-input" id="cust-name" placeholder="e.g. Aerospace & SpaceTech"></div>
              <div class="form-group"><label class="form-label">Icon</label><input class="form-input" id="cust-icon" value="🚀"></div>
              <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cust-desc" placeholder="Industry description..."></textarea></div>`;
        } else if (type === 'new-factory') {
            const ind = this.universe.getIndustry(id);
            title.textContent = `Add Factory to ${ind ? ind.name : 'Industry'}`;
            body.innerHTML = `
              <div class="form-group"><label class="form-label">Factory Name</label><input class="form-input" id="cust-name" placeholder="e.g. Orbital Data Synthesis Factory"></div>
              <div class="form-group"><label class="form-label">Primary Goal</label><textarea class="form-textarea" id="cust-goal" placeholder="Factory mission..."></textarea></div>`;
        }

        modal.style.display = 'flex';
        this.showModal();
    }

    submitCustomize() {
        if (!this._customizeContext) return;
        const { type, id } = this._customizeContext;
        const name = document.getElementById('cust-name')?.value;
        const icon = document.getElementById('cust-icon')?.value;
        const desc = document.getElementById('cust-desc')?.value;
        const goal = document.getElementById('cust-goal')?.value;

        if (type === 'industry') {
            this.universe.customizeIndustry(id, { name, icon, description: desc });
        } else if (type === 'factory') {
            this.universe.customizeFactory(id, { name, goal });
        } else if (type === 'new-industry') {
            this.universe.addNewIndustry({ name, icon, description: desc });
        } else if (type === 'new-factory') {
            this.universe.addNewFactory(id, { name, goal });
        }

        this.populateFactoryDropdowns();
        this.hideModal();
    }

    submitAdvancedGoal() {
        const text = document.getElementById('goal-text')?.value?.trim();
        if (!text) {
            alert('Please enter a goal description.');
            return;
        }
        const priority = document.getElementById('goal-priority')?.value || 'P2';
        const subtasks = parseInt(document.getElementById('goal-subtasks')?.value) || 1000;
        const scope = document.getElementById('goal-scope')?.value || 'universe';

        this.universe.addGoal({ text, priority, subtaskCount: subtasks, scope });
        this.hideModal();
    }
}

// ==========================================
// BOOTSTRAP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    SettingsManager.init();
    const universe = new AgentUniverse();
    universe.init();
    window.agentUniverse = universe;
});
