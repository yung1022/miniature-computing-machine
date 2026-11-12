(() => {
  const START_DELAY_MS = 300;
  
  // === CONFIGURABLE SETTINGS & INTERVALS (in milliseconds) ===
  const INTERVAL_ITEM19_MS = 4800;   // How often Item 19 runs
  const INTERVAL_BOOST_MS = 153600;   // How often Boost runs (e.g., every 2 seconds)
  const INTERVAL_COLLAB_MS = 301000;  // How often Collab runs (e.g., every 1 second)
  
  // Configurable Auth Password for HTTP 401 handling
  const AUTH_PASSWORD = window.INJECTED_AUTH_PASSWORD;
 

  // Target channel IDs array for Collab command (shuffled on start and reshuffled when exhausted)
  const TARGET_CHANNEL_IDS = ["UCjrii0S-8k6sfc_ds3V-mRg","UCHGCm5vwMUmfT6KnsCQY6Aw","UC7xekFOa6e9C4zReMA7485w","UCNQsjFMCytyH81nEpNN2YtQ","UCXlRi76oMC8T4vlVB2FYjsw","UCe76be8EuemfxZT4DSzYBZA","UCt6KDg7ftGLz-ftgvH2DtwA","UCXYnf-nl_sStB8nMbwWNNYg","UCoif5spcZemcWy1XTFSRumg"];
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

  // Clear any existing independent intervals/timeouts to prevent collisions
  if (window._autoGrindItem19Interval) clearInterval(window._autoGrindItem19Interval);
  if (window._autoGrindItem19Timeout) clearTimeout(window._autoGrindItem19Timeout);
  if (window._autoGrindBoostInterval) clearInterval(window._autoGrindBoostInterval);
  if (window._autoGrindBoostTimeout) clearTimeout(window._autoGrindBoostTimeout);
  if (window._autoGrindCollabInterval) clearInterval(window._autoGrindCollabInterval);
  if (window._autoGrindCollabTimeout) clearTimeout(window._autoGrindCollabTimeout);
  if (window.stopAutoGrind) delete window.stopAutoGrind;

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

  // Standard command executor for Item 19 and Boost
  function executeStandardCommand(def) {
    if (!def) return;
    const cmd = { type: def.type, gain: def.gain, label: def.label };
    const btn = document.createElement('button');
    const labelEl = document.createElement('span');
    labelEl.textContent = cmd.label;
    btn.appendChild(labelEl);

    if (typeof window.doCommand !== 'function') {
      console.error('doCommand() not present on this page yet.');
      return;
    }

    try {
      window.doCommand(cmd, btn, labelEl);
    } catch (err) {
      console.error('doCommand threw:', err);
    }
  }

  // Start Item 19 Loop
  if (item19Def) {
    window._autoGrindItem19Timeout = setTimeout(() => {
      window._autoGrindItem19Interval = setInterval(() => {
        executeStandardCommand(item19Def);
      }, INTERVAL_ITEM19_MS);
      console.log(`Item 19 loop started (${INTERVAL_ITEM19_MS}ms).`);
    }, START_DELAY_MS);
  }

  // Start Boost Loop
  if (boostDef) {
    window._autoGrindBoostTimeout = setTimeout(() => {
      window._autoGrindBoostInterval = setInterval(() => {
        executeStandardCommand(boostDef);
      }, INTERVAL_BOOST_MS);
      console.log(`Boost loop started (${INTERVAL_BOOST_MS}ms).`);
    }, START_DELAY_MS);
  }

  // Start Collab Loop using the shuffled channel ID rotation
  if (collabDef) {
    window._autoGrindCollabTimeout = setTimeout(() => {
      window._autoGrindCollabInterval = setInterval(() => {
        if (typeof window.doCommand !== 'function') {
          console.error('doCommand() not present on this page yet.');
          return;
        }

        try {
          const targetId = getNextChannelId();
          const collabObj = Object.assign({}, collabDef, { extra: { to: targetId } });
          const collabButton = document.createElement('button');
          const labelEl = document.createElement('span');
          labelEl.textContent = collabDef.label || 'Collab';
          collabButton.appendChild(labelEl);

          window.doCommand(collabObj, collabButton);
        } catch (err) {
          console.error('doCommand (collab) threw:', err);
        }
      }, INTERVAL_COLLAB_MS);
      console.log(`Collab loop started (${INTERVAL_COLLAB_MS}ms) with shuffled channel ID rotation.`);
    }, START_DELAY_MS);
  }

  // --- HTTP 401 Interceptor and Handler ---
  function handleAuth401() {
    console.log('HTTP 401 detected: Filling password and solving captcha...');
    
    setTimeout(() => {
      // 1. Set auth password input
      const passwordEl = document.getElementById('authPasswordInput') || window.authPasswordInput;
      if (passwordEl) {
        passwordEl.value = AUTH_PASSWORD;
        passwordEl.dispatchEvent(new Event('input', { bubbles: true }));
        passwordEl.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Auth password filled.');
      } else {
        console.error('authPasswordInput element not found.');
      }

      // 2. Get captcha question text
      const questionEl = document.getElementById('captchaQuestion') || window.captchaQuestion;
      if (!questionEl) {
        console.error('captchaQuestion element not found.');
        return;
      }
      
      const questionText = questionEl.textContent.trim();
      console.log('Captcha question found:', questionText);

      // 3. Solve arithmetic question (supports x + y or x - y)
      const match = questionText.match(/(-?\d+)\s*([+\-])\s*(-?\d+)/);
      if (!match) {
        console.error('Could not parse arithmetic expression from:', questionText);
        return;
      }

      const x = parseInt(match[1], 10);
      const operator = match[2];
      const y = parseInt(match[3], 10);
      let answer = (operator === '+') ? (x + y) : (x - y);
      console.log(`Solved captcha: ${x} ${operator} ${y} = ${answer}`);

      // 4. Set captcha answer input value
      const answerEl = document.getElementById('captchaAnswerInput') || window.captchaAnswerInput;
      if (!answerEl) {
        console.error('captchaAnswerInput element not found.');
        return;
      }

      answerEl.value = answer;
      answerEl.dispatchEvent(new Event('input', { bubbles: true }));
      answerEl.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('Captcha answer filled.');

      // 5. Automatically click submit button if available
      setTimeout(() => {
        const submitBtn = document.querySelector('#authBox button, #captchaBox button, form button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          console.log('Submitted authentication form.');
        }
      }, 200);

    }, 200);
  }

  // Intercept fetch() for status 401
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    if (response.status === 401) {
      handleAuth401();
    }
    return response;
  };

  // Intercept XMLHttpRequest for status 401
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.addEventListener('load', function() {
      if (this.status === 401) {
        handleAuth401();
      }
    });
    return originalOpen.apply(this, arguments);
  };
  // ----------------------------------------

  // Unified stop function to clear all loops and listeners cleanly
  window.stopAutoGrind = () => {
    if (window._autoGrindItem19Timeout) clearTimeout(window._autoGrindItem19Timeout);
    if (window._autoGrindItem19Interval) clearInterval(window._autoGrindItem19Interval);
    if (window._autoGrindBoostTimeout) clearTimeout(window._autoGrindBoostTimeout);
    if (window._autoGrindBoostInterval) clearInterval(window._autoGrindBoostInterval);
    if (window._autoGrindCollabTimeout) clearTimeout(window._autoGrindCollabTimeout);
    if (window._autoGrindCollabInterval) clearInterval(window._autoGrindCollabInterval);
    
    delete window._autoGrindItem19Timeout;
    delete window._autoGrindItem19Interval;
    delete window._autoGrindBoostTimeout;
    delete window._autoGrindBoostInterval;
    delete window._autoGrindCollabTimeout;
    delete window._autoGrindCollabInterval;
    delete window.stopAutoGrind;
    
    console.log('All auto-grind loops and interceptors stopped.');
  };
})();
