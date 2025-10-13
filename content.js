console.log("🚀 YouTube AI Extension loaded!");

let settings = {};
let filterInterval = null;
let observer = null;

// Default settings
const defaultSettings = {
    extensionEnabled: true,
    aiEnabled: true,
    hideKeywords: ['prank', 'react', 'drama', 'exposed', 'clickbait', 'shocking', 'crazy'],
    showKeywords: ['tutorial', 'learn', 'programming', 'coding', 'education', 'guide', 'how to']
};

// Load settings on start
chrome.storage.sync.get(defaultSettings, (result) => {
    settings = result;
    console.log("📋 Settings loaded:", settings);
    initializeFiltering();
});

// React to storage changes
chrome.storage.onChanged.addListener((changes) => {
    for (const key in changes) {
        settings[key] = changes[key].newValue;
    }
    console.log("⚙️ Settings updated:", settings);
    initializeFiltering();
});

// Listen for messages from popup (master toggle)
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'extensionStatusChanged') {
        settings.extensionEnabled = message.enabled;
        console.log(`🔄 Extension ${message.enabled ? 'enabled' : 'disabled'} by user`);
        initializeFiltering();
    }
});

function initializeFiltering() {
    // Stop interval
    if (filterInterval) {
        clearInterval(filterInterval);
        filterInterval = null;
    }
    // Disconnect observer
    if (observer) {
        observer.disconnect();
        observer = null;
    }

    if (!settings.extensionEnabled) {
        console.log("🔇 Extension disabled - no filtering active");
        // restore any hidden videos
        restoreHiddenVideos();
        return;
    }

    console.log("✅ Extension enabled - starting filtering");
    // Run immediately and then poll
    filterYouTubeFeed();
    filterInterval = setInterval(filterYouTubeFeed, 3000);

    // Also observe DOM changes for quicker reaction
    try {
        observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.addedNodes && m.addedNodes.length > 0) {
                    // Debounced scan on new nodes
                    filterYouTubeFeed();
                    break;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
        console.warn('MutationObserver failed:', e);
    }
}

function restoreHiddenVideos() {
    const hidden = document.querySelectorAll('ytd-rich-item-renderer[data-filtered-by-ai][style*="display: none"]');
    hidden.forEach(node => {
        node.style.display = '';
        node.removeAttribute('data-filtered-by-ai');
    });
}

function checkKeywords(title) {
    const t = title.toLowerCase();
    // Always show if showKeywords match
    for (const kw of settings.showKeywords || []) {
        if (t.includes(kw.toLowerCase())) return 'show';
    }
    // Hide if any hideKeywords match
    for (const kw of settings.hideKeywords || []) {
        if (t.includes(kw.toLowerCase())) return 'hide';
    }
    return null; // defer to AI
}

function findTitleIn(video) {
    const selectors = [
        'a#video-title',
        'yt-formatted-string#video-title',
        'a#video-title-link',
        'h3 a',
        '[id="video-title"]'
    ];
    for (const sel of selectors) {
        const el = video.querySelector(sel);
        if (el && el.textContent && el.textContent.trim()) {
            return el.textContent.trim();
        }
    }
    return '';
}

async function filterYouTubeFeed() {
    if (!settings.extensionEnabled) return;

    const containerSelector = 'ytd-rich-item-renderer';
    const items = document.querySelectorAll(containerSelector);
    if (!items || items.length === 0) return;

    const titles = [];
    const elementsForAI = [];

    items.forEach((item) => {
        if (item.hasAttribute('data-filtered-by-ai')) return;

        const title = findTitleIn(item);
        if (!title) return;

        const keywordDecision = checkKeywords(title);
        if (keywordDecision) {
            if (keywordDecision === 'hide') {
                item.style.display = 'none';
            }
            item.setAttribute('data-filtered-by-ai', 'true');
        } else {
            // If AI disabled, mark as processed but leave visible
            if (!settings.aiEnabled) {
                item.setAttribute('data-filtered-by-ai', 'true');
            } else {
                titles.push(title);
                elementsForAI.push(item);
            }
        }
    });

    if (!settings.aiEnabled || titles.length === 0) return;

    try {
        const response = await fetch('http://127.0.0.1:5000/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titles })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const decisions = Array.isArray(data.decisions) ? data.decisions : [];
        decisions.forEach((decision, idx) => {
            const node = elementsForAI[idx];
            if (!node) return;
            if (decision === 'hide') node.style.display = 'none';
            node.setAttribute('data-filtered-by-ai', 'true');
        });
    } catch (err) {
        console.error('❌ AI server request failed:', err);
        // Fallback: mark items to avoid re-sending in tight loop
        elementsForAI.forEach(node => node.setAttribute('data-filtered-by-ai', 'true'));
    }
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
    for (let key in changes) {
        settings[key] = changes[key].newValue;
    }
    console.log("⚙️ Settings updated:", settings);
    initializeFiltering();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extensionStatusChanged') {
        console.log(`🔄 Extension ${message.enabled ? 'enabled' : 'disabled'} by user`);
        settings.extensionEnabled = message.enabled;
        initializeFiltering();
    }
});

function initializeFiltering() {
    // Clear existing interval
    if (filterInterval) {
        clearInterval(filterInterval);
        filterInterval = null;
    }

    if (settings.extensionEnabled) {
        console.log("✅ Extension enabled - Starting video filtering");
        // Start filtering every 3 seconds
        filterInterval = setInterval(filterYouTubeFeed, 3000);
        // Run once immediately
        filterYouTubeFeed();
    } else {
        console.log("🔇 Extension disabled - No filtering active");
        // Optionally restore hidden videos when extension is disabled
        restoreHiddenVideos();
    }
}

function restoreHiddenVideos() {
    const hiddenVideos = document.querySelectorAll('ytd-rich-item-renderer[data-filtered-by-ai][style*="display: none"]');
    hiddenVideos.forEach(video => {
        video.style.display = '';
        console.log("🔄 Restored hidden video");
    });
}

function checkKeywords(title) {
    const titleLower = title.toLowerCase();
    
    // Check if title contains show keywords (always show these)
    for (const keyword of settings.showKeywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
            return 'show';
        }
    }
    
    // Check if title contains hide keywords
    for (const keyword of settings.hideKeywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
            return 'hide';
        }
    }
    
    return null; // No keyword match, use AI
}

async function filterYouTubeFeed() {
    // Double-check extension is still enabled
    if (!settings.extensionEnabled) {
        console.log("🔇 Extension disabled - Stopping filter");
        return;
    }

    if (!settings.aiEnabled) {
        console.log("🔇 AI Filter is disabled");
        return;
    }

    console.log("🔍 Scanning for videos...");
    
    const videoElementSelector = 'ytd-rich-item-renderer'; 
    const videoElements = document.querySelectorAll(videoElementSelector);
    console.log(`📹 Found ${videoElements.length} total video elements`);

    const titles = [];
    const elementsToFilter = [];

    videoElements.forEach((video, index) => {
        if (!video.hasAttribute('data-filtered-by-ai')) {
            let titleText = '';
            let titleElement = null;

            const possibleSelectors = [
                'a#video-title',                      
                'yt-formatted-string#video-title',    
                'a#video-title-link',
                'h3 a',
                '[id="video-title"]'
            ];

            for (const selector of possibleSelectors) {
                titleElement = video.querySelector(selector);
                if (titleElement && titleElement.textContent.trim() !== '') {
                    titleText = titleElement.textContent.trim();
                    break;
                }
            }
            
            if (titleText !== '') {
                const keywordDecision = checkKeywords(titleText);
                
                if (keywordDecision) {
                    // Handle immediately with keywords
                    console.log(`🏷️ Keyword decision for "${titleText}": ${keywordDecision}`);
                    if (keywordDecision === 'hide') {
                        console.log(`🚫 Hiding by keyword: ${titleText}`);
                        video.style.display = 'none';
                    } else {
                        console.log(`✅ Showing by keyword: ${titleText}`);
                    }
                    video.setAttribute('data-filtered-by-ai', 'true');
                } else {
                    // Send to AI for analysis
                    titles.push(titleText);
                    elementsToFilter.push(video);
                }
            }
        }
    });
    
    if (titles.length === 0) {
        console.log("⏭️ No new videos need AI analysis");
        return;
    }

    console.log(`🤖 Sending ${titles.length} titles to AI server...`);

    try {
        const response = await fetch('http://127.0.0.1:5000/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titles: titles })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("🎯 AI response:", data);

        data.decisions.forEach((decision, index) => {
            const videoElement = elementsToFilter[index];
            if (decision === 'hide') {
                console.log(`🚫 AI is hiding: ${titles[index]}`);
                videoElement.style.display = 'none'; 
            } else {
                console.log(`✅ AI is showing: ${titles[index]}`);
            }
            videoElement.setAttribute('data-filtered-by-ai', 'true');
        });
    } catch (error) {
        console.error('❌ Could not connect to the AI filter agent:', error);
        console.log("🏷️ Falling back to keyword-only filtering");
    }
}