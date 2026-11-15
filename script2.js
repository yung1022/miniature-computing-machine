(() => {
  const START_DELAY_MS = 300;
  
  // === CONFIGURABLE INTERVALS (delay AFTER each response) & SETTINGS ===
  const INTERVAL_ITEM19_MS = 4100;   // Delay after Item 19 response
  const INTERVAL_BOOST_MS = 150100;   // Delay after Boost response
  const INTERVAL_COLLAB_MS = 600500;  // Delay after Collab response
  
  // Auth Password for HTTP 401 handling (reads from injected global or fallback)
  const AUTH_PASSWORD = window.INJECTED_AUTH_PASSWORD; 

  // Target channel IDs array for Collab command (shuffled on start and reshuffled when exhausted)
  const TARGET_CHANNEL_IDS = [
    "UCjrii0S-8k6sfc_ds3V-mRg",
    "UCHGCm5vwMUmfT6KnsCQY6Aw"
  ];
  // =========================================================

  function extractConst(name, scriptsText) {
    const re = new RegExp('const\\s+' + name + '\\s*=\\s*([\\s\\S]*?);');
    const m = scriptsText.match(re);
    if (!m) return null;
    try {
      return (new Function('return ' + m[1]))();
    } catch (e) {
      return null;
    }
  }

  // 1. Fetch Item 19 definition
  function getItem19() {
    if (window.CONTENT_COMMANDS && Array.isArray(window.CONTENT_COMMANDS)) {
      if (window.CONTENT_COMMANDS[19]) return window.CONTENT_COMMANDS[19];
    }
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const content = extractConst('CONTENT_COMMANDS', scriptsText) || [];
    return content[19] || null;
  }

  // 2. Fetch BOOST_COMMAND definition
  function getBoostCommand() {
    if (window.BOOST_COMMAND && typeof window.BOOST_COMMAND === 'object' && !Array.isArray(window.BOOST_COMMAND)) {
      return window.BOOST_COMMAND;
    }
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const boost = extractConst('BOOST_COMMAND', scriptsText);
    return (boost && typeof boost === 'object' && !Array.isArray(boost)) ? boost : null;
  }

  // 3. Fetch COLLAB_COMMAND definition
  function getCollabCommand() {
    if (window.COLLAB_COMMAND && typeof window.COLLAB_COMMAND === 'object' && !Array.isArray(window.COLLAB_COMMAND)) {
      return window.COLLAB_COMMAND;
    }
    const scriptsText = Array.from(document.scripts).map(s => s.textContent || '').join('\n');
    const collab = extractConst('COLLAB_COMMAND', scriptsText);
    return (collab && typeof collab === 'object' && !Array.isArray(collab)) ? collab : null;
  }

  const item19Def = getItem19();
  const boostDef = getBoostCommand();
  const collabDef = getCollabCommand();

  if (!item19Def && !boostDef && !collabDef) {
    console.error('No commands found (Item 19, BOOST_COMMAND, or COLLAB_COMMAND) — run this after the page has fully loaded.');
    return;
  }

  // Set active flag and clean up any old stop functions
  window._autoGrindActive = true;
  if (window.stopAutoGrind) delete window.stopAutoGrind;

  // --- Network Request Completion Tracker ---
  let responseListeners = [];
  function notifyResponseReceived() {
    while (responseListeners.length > 0) {
      const resolve = responseListeners.shift();
      resolve();
    }
  }

  function waitForNextResponse() {
    return new Promise(resolve => {
      responseListeners.push(resolve);
    });
  }
  // ----------------------------------------

  // --- Shuffle Logic for Target Channel IDs ---
  let shuffledChannels = [];
  let channelIndex = 0;

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getNextChannelId() {
    if (shuffledChannels.length === 0 || channelIndex >= shuffledChannels.length) {
      shuffledChannels = shuffle(TARGET_CHANNEL_IDS);
      channelIndex = 0;
      console.log('[Collab] Reshuffled channel IDs order:', shuffledChannels);
    }
    const currentId = shuffledChannels[channelIndex];
    channelIndex++;
    return currentId;
  }
  // -------------------------------------------

  // --- Sequential Async Loop Runner ---
  async function runSequentialLoop(name, getDef, intervalMs, customExecutor) {
    // Initial start delay
    await new Promise(resolve => setTimeout(resolve, START_DELAY_MS));

    while (window._autoGrindActive) {
      const def = getDef();
      if (def) {
        try {
          const responsePromise = waitForNextResponse();
          
          if (typeof customExecutor === 'function') {
            customExecutor(def);
          } else {
            // Default standard command executor (Item 19 / Boost)
            const cmd = { type: def.type, gain: def.gain, label: def.label };
            const btn = document.createElement('button');
            const labelEl = document.createElement('span');
            labelEl.textContent = cmd.label;
            btn.appendChild(labelEl);

            if (typeof window.doCommand === 'function') {
              window.doCommand(cmd, btn, labelEl);
            }
          }

          // Wait until the network request has sent and received a result
          await responsePromise;
        } catch (err) {
          console.error(`[${name}] Error during execution:`, err);
        }
      }

      // Wait for the configured interval delay AFTER the response is received
      if (!window._autoGrindActive) break;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    console.log(`[${name}] Loop terminated.`);
  }
  // ------------------------------------

  // Start Item 19 Loop
  if (item19Def) {
    runSequentialLoop('Item19', () => item19Def, INTERVAL_ITEM19_MS);
    console.log(`Item 19 sequential loop initiated.`);
  }

  // Start Boost Loop
  if (boostDef) {
    runSequentialLoop('Boost', () => boostDef, INTERVAL_BOOST_MS);
    console.log(`Boost sequential loop initiated.`);
  }

  // Start Collab Loop
  if (collabDef) {
    runSequentialLoop('Collab', () => collabDef, INTERVAL_COLLAB_MS, (def) => {
      if (typeof window.doCommand !== 'function') return;
      const targetId = getNextChannelId();
      const collabObj = Object.assign({}, def, { extra: { to: targetId } });
      const collabButton = document.createElement('button');
      const labelEl = document.createElement('span');
      labelEl.textContent = def.label || 'Collab';
      collabButton.appendChild(labelEl);

      window.doCommand(collabObj, collabButton);
    });
    console.log(`Collab sequential loop initiated with shuffled channel rotation.`);
  }

  // --- HTTP 428 Interceptor and Handler ---
  function handleGrindCheck() {
    console.log('HTTP 428 detected: Waiting 1 second before fetching equation...');
    
    setTimeout(() => {
      if (typeof window.showGrindCheck === 'function') {
        window.showGrindCheck();
      }

      setTimeout(() => {
        const questionEl = document.getElementById('checkQuestion') || document.getElementById('grindCheckQuestion') || window.checkQuestion;
        if (!questionEl) return;
        
        const questionText = questionEl.textContent.trim();
        const match = questionText.match(/(-?\d+)\s*([+\-])\s*(-?\d+)/);
        if (!match) return;

        const x = parseInt(match[1], 10);
        const operator = match[2];
        const y = parseInt(match[3], 10);
        let answer = (operator === '+') ? (x + y) : (x - y);

        const answerEl = document.getElementById('checkAnswer') || 
                         document.getElementById('grindCheckAnswer') || 
                         document.querySelector('#checkBox input') || 
                         window.checkAnswer;
                         
        if (!answerEl) return;

        answerEl.value = answer;
        answerEl.dispatchEvent(new Event('input', { bubbles: true }));
        answerEl.dispatchEvent(new Event('change', { bubbles: true }));

        setTimeout(() => {
          if (typeof window.submitGrindCheck === 'function') {
            window.submitGrindCheck();
          } else if (typeof window.sumbitGrindCheck === 'function') {
            window.sumbitGrindCheck();
          } else {
            const submitBtn = document.querySelector('#checkBox button, #checkBox input[type="submit"]');
            if (submitBtn) submitBtn.click();
          }
        }, 200);
      }, 200);
    }, 1000);
  }

  // --- HTTP 401 Interceptor and Handler ---
  function handleAuth401() {
    console.log('HTTP 401 detected: Filling password and solving captcha...');
    
    setTimeout(() => {
      const passwordEl = document.getElementById('authPasswordInput') || window.authPasswordInput;
      if (passwordEl) {
        passwordEl.value = AUTH_PASSWORD;
        passwordEl.dispatchEvent(new Event('input', { bubbles: true }));
        passwordEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const questionEl = document.getElementById('captchaQuestion') || window.captchaQuestion;
      if (!questionEl) return;
      
      const questionText = questionEl.textContent.trim();
      const match = questionText.match(/(-?\d+)\s*([+\-])\s*(-?\d+)/);
      if (!match) return;

      const x = parseInt(match[1], 10);
      const operator = match[2];
      const y = parseInt(match[3], 10);
      let answer = (operator === '+') ? (x + y) : (x - y);

      const answerEl = document.getElementById('captchaAnswerInput') || window.captchaAnswerInput;
      if (!answerEl) return;

      answerEl.value = answer;
      answerEl.dispatchEvent(new Event('input', { bubbles: true }));
      answerEl.dispatchEvent(new Event('change', { bubbles: true }));

      setTimeout(() => {
        const submitBtn = document.querySelector('#authBox button, #captchaBox button, form button[type="submit"], input[type="submit"]');
        if (submitBtn) submitBtn.click();
      }, 200);
    }, 200);
  }

  // Intercept fetch() for status codes and request completion tracking
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      if (response.status === 428) handleGrindCheck();
      if (response.status === 401) handleAuth401();
      return response;
    } finally {
      notifyResponseReceived();
    }
  };

  // Intercept XMLHttpRequest for status codes and request completion tracking
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.addEventListener('loadend', function() {
      if (this.status === 428) handleGrindCheck();
      if (this.status === 401) handleAuth401();
      notifyResponseReceived();
    });
    return originalOpen.apply(this, arguments);
  };
  // ----------------------------------------

  // Unified stop function to clear all loops cleanly
  window.stopAutoGrind = () => {
    window._autoGrindActive = false;
    responseListeners = [];
    delete window.stopAutoGrind;
    console.log('All sequential auto-grind loops and interceptors stopped.');
  };
})();
