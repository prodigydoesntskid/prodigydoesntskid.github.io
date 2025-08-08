"use strict";

(() => {
    // --- DOM ELEMENTS ---
    const elements = {
        mainContainer: document.getElementById('mainContainer'),
        tokenInput: document.getElementById('token'),
        channelIdInput: document.getElementById('channelId'),
        userIdInput: document.getElementById('userId'),
        messageInput: document.getElementById('message'),
        errorMessage: document.getElementById('errorMessage'),
        // Modifier Buttons & Groups
        bigBtn: document.getElementById('bigBtn'),
        ladderBtn: document.getElementById('ladderBtn'),
        floodBtn: document.getElementById('floodBtn'),
        pingBtn: document.getElementById('pingBtn'),
        suffixBtn: document.getElementById('suffixBtn'),
        emojifyBtn: document.getElementById('emojifyBtn'),
        uppercaseBtn: document.getElementById('uppercaseBtn'),
        userIdGroup: document.getElementById('userIdGroup'),
        pingTypeGroup: document.getElementById('pingTypeGroup'),
        suffixGroup: document.getElementById('suffixGroup'),
        // Panel Buttons
        settingsBtn: document.getElementById('settingsBtn'),
        notificationsBtn: document.getElementById('notificationsBtn'),
        autotyperBtn: document.getElementById('autotyperBtn'),
        gcChangerBtn: document.getElementById('gcChangerBtn'),
        imageSenderBtn: document.getElementById('imageSenderBtn'),
        // Panels
        settingsPanel: document.getElementById('settingsPanel'),
        notificationsPanel: document.getElementById('notificationsPanel'),
        autotyperPanel: document.getElementById('autotyperPanel'),
        gcChangerPanel: document.getElementById('gcChangerPanel'),
        imageSenderPanel: document.getElementById('imageSenderPanel'),
        // Panel Close Buttons
        closeSettings: document.getElementById('closeSettings'),
        closeNotifications: document.getElementById('closeNotifications'),
        closeAutotyper: document.getElementById('closeAutotyper'),
        closeGcChanger: document.getElementById('closeGcChanger'),
        closeImageSender: document.getElementById('closeImageSender'),
        // Settings Panel
        profilePic: document.getElementById('profilePic'),
        globalName: document.getElementById('globalName'),
        username: document.getElementById('username'),
        hypesquadButtons: document.querySelectorAll('.hypesquad-btn'),
        // Autotyper Panel
        startAutoTyperBtn: document.getElementById('startAutoTyperBtn'),
        stopAutoTyperBtn: document.getElementById('stopAutoTyperBtn'),
        autoChannelIdInput: document.getElementById('autoChannelId'),
        wordlistInput: document.getElementById('wordlist'),
        delayInput: document.getElementById('delay'),
        autoBoldBtn: document.getElementById('autoBoldBtn'),
        autoUppercaseBtn: document.getElementById('autoUppercaseBtn'),
        // GC Changer Panel
        startGcChangerBtn: document.getElementById('startGcChangerBtn'),
        stopGcChangerBtn: document.getElementById('stopGcChangerBtn'),
        gcIdInput: document.getElementById('gcId'),
        gcNamesInput: document.getElementById('gcNames'),
        gcDelayInput: document.getElementById('gcDelay'),
        // Image Sender Panel
        imageChannelIdInput: document.getElementById('imageChannelId'),
        imageMessageInput: document.getElementById('imageMessage'),
        imageFileInput: document.getElementById('imageFile'),
        imagePreview: document.getElementById('imagePreview'),
        sendImageBtn: document.getElementById('sendImageBtn'),
    };

    // --- APPLICATION STATE ---
    let state = {
        token: null,
        modifiers: { big: false, ladder: false, flood: false, ping: false, pingType: 'back', suffix: false, emojify: false, uppercase: false },
        autoTyperModifiers: { bold: false, uppercase: false },
        intervals: { autoTyper: null, gcChanger: null },
        messageQueue: [],
        isProcessingQueue: false,
    };

    // --- UTILITY FUNCTIONS ---
    const showMessage = (message, type = 'error') => {
        elements.errorMessage.textContent = message;
        elements.errorMessage.classList.remove('success', 'error');
        elements.errorMessage.classList.add(type, 'active');
        setTimeout(() => elements.errorMessage.classList.remove('active'), 5000);
        console[type === 'error' ? 'error' : 'log'](message);
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const textToEmoji = (text) => {
        const letterToEmoji = { A: '🇦', B: '🇧', C: '🇨', D: '🇩', E: '🇪', F: '🇫', G: '🇬', H: '🇭', I: '🇮', J: '🇯', K: '🇰', L: '🇱', M: '🇲', N: '🇳', O: '🇴', P: '🇵', Q: '🇶', R: '🇷', S: '🇸', T: '🇹', U: '🇺', V: '🇻', W: '🇼', X: '🇽', Y: '🇾', Z: '🇿', ' ': '  ' };
        return text.toUpperCase().split('').map((char) => letterToEmoji[char] || char).join(' ');
    };

    // --- DISCORD API WRAPPERS ---
    const discordAPI = async (endpoint, options = {}) => {
        const { token = state.token, method = 'GET', body = null } = options;
        if (!token) {
            showMessage('Discord Token is not set.');
            return { success: false, data: null };
        }
        try {
            const headers = {
                Authorization: token,
                'User-Agent': 'ProdigyCord/2.0'
            };
            if (body && !(body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }

            const response = await fetch(`https://discord.com/api/v9${endpoint}`, {
                method,
                headers,
                body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : null,
            });

            if (response.status === 429) {
                const data = await response.json();
                const retryAfter = (data.retry_after || 1) * 1000;
                showMessage(`Rate limited! Waiting ${retryAfter / 1000}s`);
                return { success: false, rateLimit: true, retryAfter };
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `API Error: ${response.status}`);
            }

            if (response.status === 204) { // No content
                return { success: true, data: null };
            }

            return { success: true, data: await response.json() };
        } catch (error) {
            showMessage(`API Error: ${error.message}`);
            return { success: false, data: null };
        }
    };

    // --- CORE FUNCTIONALITY ---
    const validateAndFetchUser = async (token) => {
        const { success, data } = await discordAPI('/users/@me', { token });
        if (success && data) {
            state.token = token;
            elements.tokenInput.value = token;
            elements.profilePic.src = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128` : `https://via.placeholder.com/100x100/202225/39ff14?text=${data.username.charAt(0)}`;
            elements.globalName.textContent = data.global_name || data.username;
            elements.username.textContent = `@${data.username}`;
            showMessage('Token validated successfully.', 'success');
            return true;
        } else {
            showMessage('Invalid Discord Token.');
            return false;
        }
    };
    
    const sendMessage = (channelId, messageContent, useMainModifiers = false) => {
        let finalContent = messageContent;

        if (useMainModifiers) {
            if (state.modifiers.uppercase) finalContent = finalContent.toUpperCase();
            if (state.modifiers.emojify) finalContent = textToEmoji(finalContent);
            if (state.modifiers.ladder) finalContent = finalContent.split(' ').join('\n');
            if (state.modifiers.flood) finalContent = `\n\n\n\n\n\n\n\n\n\n${finalContent}\n\n\n\n\n\n\n\n\n\n`;
            if (state.modifiers.ping) {
                const userId = elements.userIdInput.value.trim();
                if (userId) finalContent = elements.pingType.value === 'front' ? `<@${userId}> ${finalContent}` : `${finalContent} <@${userId}>`;
            }
            if (state.modifiers.suffix) {
                const suffix = elements.suffixGroup.querySelector('input').value.trim();
                if(suffix) finalContent = `${finalContent} ${suffix}`;
            }
            if (state.modifiers.big) finalContent = `# ${finalContent}`;
        }
        
        state.messageQueue.push({ channelId, content: finalContent });
        if (!state.isProcessingQueue) processMessageQueue();
    };

    const processMessageQueue = async () => {
        if (state.isProcessingQueue) return;
        state.isProcessingQueue = true;
        
        while (state.messageQueue.length > 0) {
            const { channelId, content } = state.messageQueue.shift();
            const result = await discordAPI(`/channels/${channelId}/messages`, { method: 'POST', body: { content } });
            
            if (result.rateLimit) {
                state.messageQueue.unshift({ channelId, content }); // Re-add to front
                await sleep(result.retryAfter || 3000);
            }
        }
        state.isProcessingQueue = false;
    };

    // --- FEATURE IMPLEMENTATIONS ---

    const startAutoTyper = () => {
        if (state.intervals.autoTyper) {
            showMessage('Autotyper is already running.');
            return;
        }
        const channelId = elements.autoChannelIdInput.value.trim();
        const wordlist = elements.wordlistInput.value.trim().split('\n').filter(Boolean);
        const delay = parseInt(elements.delayInput.value, 10) * 1000;

        if (!channelId || wordlist.length === 0 || isNaN(delay) || delay < 1000) {
            showMessage('Autotyper requires a valid Channel ID, Wordlist, and a delay of at least 1 second.');
            return;
        }
        
        const run = () => {
            const originalMessage = wordlist[Math.floor(Math.random() * wordlist.length)];
            let modifiedMessage = originalMessage;

            // Apply autotyper-specific modifiers
            if (state.autoTyperModifiers.uppercase) {
                modifiedMessage = modifiedMessage.toUpperCase();
            }
            if (state.autoTyperModifiers.bold) {
                modifiedMessage = `# ${modifiedMessage}`;
            }

            // Send the potentially modified message. `useMainModifiers` is false as we've already applied them.
            sendMessage(channelId, modifiedMessage, false);
        };
        
        state.intervals.autoTyper = setInterval(run, delay);
        showMessage('Autotyper started.', 'success');
        elements.startAutoTyperBtn.disabled = true;
        elements.stopAutoTyperBtn.disabled = false;
    };

    const stopAutoTyper = () => {
        if (state.intervals.autoTyper) {
            clearInterval(state.intervals.autoTyper);
            state.intervals.autoTyper = null;
            showMessage('Autotyper stopped.', 'success');
            elements.startAutoTyperBtn.disabled = false;
            elements.stopAutoTyperBtn.disabled = true;
        }
    };

    const startGcChanger = () => {
        if (state.intervals.gcChanger) {
            showMessage('GC Changer is already running.');
            return;
        }
        const gcId = elements.gcIdInput.value.trim();
        const names = elements.gcNamesInput.value.trim().split('\n').filter(Boolean);
        const delay = parseInt(elements.gcDelayInput.value, 10);

        if (!gcId || names.length === 0 || isNaN(delay) || delay < 1000) {
            showMessage('GC Changer requires a valid GC ID, names, and a delay of at least 1000ms.');
            return;
        }
        
        let currentIndex = 0;
        const run = async () => {
            const name = names[currentIndex];
            const { success } = await discordAPI(`/channels/${gcId}`, { method: 'PATCH', body: { name } });
            if (success) {
                 console.log(`GC name changed to: ${name}`);
            }
            currentIndex = (currentIndex + 1) % names.length;
        };
        
        state.intervals.gcChanger = setInterval(run, delay);
        showMessage('GC Changer started.', 'success');
        elements.startGcChangerBtn.disabled = true;
        elements.stopGcChangerBtn.disabled = false;
    };
    
    const stopGcChanger = () => {
        if (state.intervals.gcChanger) {
            clearInterval(state.intervals.gcChanger);
            state.intervals.gcChanger = null;
            showMessage('GC Changer stopped.', 'success');
            elements.startGcChangerBtn.disabled = false;
            elements.stopGcChangerBtn.disabled = true;
        }
    };
    
    const sendImage = async () => {
        const channelId = elements.imageChannelIdInput.value.trim();
        const file = elements.imageFileInput.files[0];
        
        if (!channelId || !file) {
            showMessage('Channel ID and an image file are required.');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file, file.name);

        const payload = { content: elements.imageMessageInput.value.trim() };
        formData.append('payload_json', JSON.stringify(payload));
        
        showMessage('Uploading image...', 'success');
        const { success } = await discordAPI(`/channels/${channelId}/messages`, {
            method: 'POST',
            body: formData,
        });
        
        if (success) {
            showMessage('Image sent successfully!', 'success');
            elements.imageMessageInput.value = '';
            elements.imageFileInput.value = '';
            elements.imagePreview.classList.remove('active');
            elements.imagePreview.src = '#';
        }
    };
    
    const setHypeSquad = async (houseId) => {
        const { success } = await discordAPI('/hypesquad/online', {
            method: 'POST',
            body: { house_id: houseId }
        });
        if (success) {
            showMessage(`HypeSquad house updated successfully!`, 'success');
        }
    };

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const channelId = elements.channelIdInput.value.trim();
                const message = elements.messageInput.value.trim();
                if (channelId && message) {
                    sendMessage(channelId, message, true);
                    elements.messageInput.value = '';
                } else {
                    showMessage('Channel ID and Message are required to send.');
                }
            }
        });

        const modifierButtons = {
            bigBtn: 'big', ladderBtn: 'ladder', floodBtn: 'flood',
            pingBtn: 'ping', suffixBtn: 'suffix', emojifyBtn: 'emojify', uppercaseBtn: 'uppercase'
        };
        for (const [btnId, modifier] of Object.entries(modifierButtons)) {
            elements[btnId].addEventListener('click', () => {
                state.modifiers[modifier] = !state.modifiers[modifier];
                elements[btnId].classList.toggle('active');
                if (modifier === 'ping') {
                    elements.userIdGroup.style.display = state.modifiers.ping ? 'block' : 'none';
                    elements.pingTypeGroup.style.display = state.modifiers.ping ? 'block' : 'none';
                }
                if (modifier === 'suffix') {
                    elements.suffixGroup.style.display = state.modifiers.suffix ? 'block' : 'none';
                }
            });
        }
        
        const panels = {
            settingsBtn: 'settingsPanel', notificationsBtn: 'notificationsPanel',
            autotyperBtn: 'autotyperPanel', gcChangerBtn: 'gcChangerPanel', imageSenderBtn: 'imageSenderPanel'
        };
        for (const [btnId, panelId] of Object.entries(panels)) {
            elements[btnId].addEventListener('click', () => elements[panelId].classList.add('active'));
            elements[`close${panelId.charAt(0).toUpperCase() + panelId.slice(1, -5)}`].addEventListener('click', () => {
                elements[panelId].classList.remove('active');
                // Stop intervals when panels are closed
                if (panelId === 'autotyperPanel') stopAutoTyper();
                if (panelId === 'gcChangerPanel') stopGcChanger();
            });
        }

        // Autotyper Listeners
        elements.startAutoTyperBtn.addEventListener('click', startAutoTyper);
        elements.stopAutoTyperBtn.addEventListener('click', stopAutoTyper);
        elements.autoBoldBtn.addEventListener('click', () => {
            state.autoTyperModifiers.bold = !state.autoTyperModifiers.bold;
            elements.autoBoldBtn.classList.toggle('active');
        });
        elements.autoUppercaseBtn.addEventListener('click', () => {
            state.autoTyperModifiers.uppercase = !state.autoTyperModifiers.uppercase;
            elements.autoUppercaseBtn.classList.toggle('active');
        });

        // GC Changer Listeners
        elements.startGcChangerBtn.addEventListener('click', startGcChanger);
        elements.stopGcChangerBtn.addEventListener('click', stopGcChanger);
        
        // Image Sender Listeners
        elements.imageFileInput.addEventListener('change', () => {
            const file = elements.imageFileInput.files[0];
            if (file) {
                elements.imagePreview.src = URL.createObjectURL(file);
                elements.imagePreview.classList.add('active');
            } else {
                elements.imagePreview.classList.remove('active');
                elements.imagePreview.src = '#';
            }
        });
        elements.sendImageBtn.addEventListener('click', sendImage);

        // Settings Listeners
        elements.hypesquadButtons.forEach(button => {
            button.addEventListener('click', () => setHypeSquad(button.dataset.hype));
        });
    }

    // --- INITIALIZATION ---
    async function initializeApp() {
        const token = prompt("Please enter your Discord Token to continue:");
        if (token && await validateAndFetchUser(token)) {
             // Successfully initialized
        } else {
            elements.mainContainer.innerHTML = '<h1>Authentication Failed</h1><p style="text-align: center; color: #fff;">Please refresh and provide a valid Discord Token to use the application.</p>';
        }
        setupEventListeners();
    }

    initializeApp();
})();