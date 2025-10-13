document.addEventListener('DOMContentLoaded', async () => {
    const settings = await loadSettings();
    await loadTheme(); // Load theme before updating UI
    updateUI(settings);
    setupEventListeners();
});

async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            extensionEnabled: true,
            aiEnabled: true,
            hideKeywords: ['prank', 'react', 'drama', 'exposed', 'clickbait', 'shocking', 'crazy'],
            showKeywords: ['tutorial', 'learn', 'programming', 'coding', 'education', 'guide', 'how to'],
            darkMode: false 
        }, resolve);
    });
}

async function saveSettings(settings) {
    return new Promise((resolve) => {
        chrome.storage.sync.set(settings, resolve);
    });
}

async function loadTheme() {
    const settings = await loadSettings();
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (settings.darkMode) {
        body.setAttribute('data-theme', 'dark');
        themeToggle.title = 'Switch to light mode';
    } else {
        body.setAttribute('data-theme', 'light');
        themeToggle.title = 'Switch to dark mode';
    }
}

function updateUI(settings) {
    // Update master toggle
    const masterToggle = document.getElementById('masterToggle');
    const masterStatus = document.getElementById('masterStatus');
    const masterToggleContainer = document.getElementById('masterToggleContainer');
    const extensionControls = document.getElementById('extensionControls');
    const statusDescription = document.getElementById('statusDescription');

    masterToggle.classList.toggle('active', settings.extensionEnabled);
    masterStatus.textContent = settings.extensionEnabled ? 'ON' : 'OFF';
    masterStatus.className = `status-text ${settings.extensionEnabled ? 'enabled' : 'disabled'}`;
    
    extensionControls.classList.toggle('disabled', !settings.extensionEnabled);
    
    statusDescription.textContent = settings.extensionEnabled 
        ? 'Extension is actively filtering videos' 
        : 'Extension is disabled - no filtering active';

    if (settings.extensionEnabled) {
        updateKeywordList('hideKeywords', settings.hideKeywords, 'hide');
        updateKeywordList('showKeywords', settings.showKeywords, 'show');
    }
}

function updateKeywordList(containerId, keywords, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    keywords.forEach(keyword => {
        const item = document.createElement('div');
        item.className = 'keyword-item';
        item.innerHTML = `
            <span>${keyword}</span>
            <button class="delete-btn" data-keyword="${keyword}" data-type="${type}">×</button>
        `;
        container.appendChild(item);
    });
}

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', async () => {
        const settings = await loadSettings();
        settings.darkMode = !settings.darkMode;
        await saveSettings(settings);
        await loadTheme(); // Apply new theme
    });

document.getElementById('masterToggle').addEventListener('click', async () => {
    const settings = await loadSettings();
    settings.extensionEnabled = !settings.extensionEnabled;
    await saveSettings(settings);
    updateUI(settings);
    
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (tab.url && tab.url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'extensionStatusChanged',
                enabled: settings.extensionEnabled
            });
        }
    } catch (error) {
        console.log('Could not send message to content script:', error);
    }
});


    // Add hide keyword
    document.getElementById('addHideBtn').addEventListener('click', async () => {
        const settings = await loadSettings();
        if (!settings.extensionEnabled) return;
        
        const input = document.getElementById('hideInput');
        const keyword = input.value.trim().toLowerCase();
        if (keyword) {
            if (!settings.hideKeywords.includes(keyword)) {
                settings.hideKeywords.push(keyword);
                await saveSettings(settings);
                updateUI(settings);
            }
            input.value = '';
        }
    });

    // Add show keyword
    document.getElementById('addShowBtn').addEventListener('click', async () => {
        const settings = await loadSettings();
        if (!settings.extensionEnabled) return;
        
        const input = document.getElementById('showInput');
        const keyword = input.value.trim().toLowerCase();
        if (keyword) {
            if (!settings.showKeywords.includes(keyword)) {
                settings.showKeywords.push(keyword);
                await saveSettings(settings);
                updateUI(settings);
            }
            input.value = '';
        }
    });

    // Delete keywords
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const settings = await loadSettings();
            if (!settings.extensionEnabled) return;
            
            const keyword = e.target.dataset.keyword;
            const type = e.target.dataset.type;
            
            if (type === 'hide') {
                settings.hideKeywords = settings.hideKeywords.filter(k => k !== keyword);
            } else {
                settings.showKeywords = settings.showKeywords.filter(k => k !== keyword);
            }
            
            await saveSettings(settings);
            updateUI(settings);
        }
    });

    // Enter key support
    document.getElementById('hideInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('addHideBtn').click();
    });
    
    document.getElementById('showInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('addShowBtn').click();
    });
}