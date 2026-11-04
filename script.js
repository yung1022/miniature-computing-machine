(function() {
  function handleGrindCheck() {
    console.log('HTTP 428 detected: Waiting 1 second before fetching equation...');
    
    // 1-second delay between receiving HTTP 428 and fetching/processing the equation
    setTimeout(() => {
      // 1. Run showGrindCheck() if it exists
      if (typeof window.showGrindCheck === 'function') {
        window.showGrindCheck();
      }

      // Allow a brief moment for the DOM element to render
      setTimeout(() => {
        // 2. Get checkQuestion text content
        const questionEl = document.getElementById('checkQuestion') || document.getElementById('grindCheckQuestion') || window.checkQuestion;
        if (!questionEl) {
          console.error('Check question element not found.');
          return;
        }
        
        const questionText = questionEl.textContent.trim();
        console.log('Question found:', questionText);

        // 3. Solve the arithmetic question (supports x + y or x - y)
        const match = questionText.match(/(-?\d+)\s*([+\-])\s*(-?\d+)/);
        if (!match) {
          console.error('Could not parse arithmetic expression from:', questionText);
          return;
        }

        const x = parseInt(match[1], 10);
        const operator = match[2];
        const y = parseInt(match[3], 10);
        let answer = (operator === '+') ? (x + y) : (x - y);
        console.log(`Solved: ${x} ${operator} ${y} = ${answer}`);

        // 4. Set answer value
        const answerEl = document.getElementById('checkAnswer') || 
                         document.getElementById('grindCheckAnswer') || 
                         document.querySelector('#checkBox input') || 
                         window.checkAnswer;
                         
        if (!answerEl) {
          console.error('Check answer input element not found.');
          return;
        }

        answerEl.value = answer;
        answerEl.dispatchEvent(new Event('input', { bubbles: true }));
        answerEl.dispatchEvent(new Event('change', { bubbles: true }));

        // 5. Run submission function
        setTimeout(() => {
          if (typeof window.submitGrindCheck === 'function') {
            window.submitGrindCheck();
            console.log('Submitted grind check successfully.');
          } else if (typeof window.sumbitGrindCheck === 'function') {
            window.sumbitGrindCheck();
            console.log('Submitted grind check successfully (using typo variant).');
          } else {
            const submitBtn = document.querySelector('#checkBox button, #checkBox input[type="submit"]');
            if (submitBtn) {
              submitBtn.click();
              console.log('Clicked submit button inside checkBox.');
            } else {
              console.error('Submission function or button not found.');
            }
          }
        }, 200);

      }, 200);

    }, 1000); // 1000ms = 1 second wait
  }

  // --- Network Interceptors for HTTP 428 ---
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    if (response.status === 428) {
      handleGrindCheck();
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.addEventListener('load', function() {
      if (this.status === 428) {
        handleGrindCheck();
      }
    });
    return originalOpen.apply(this, arguments);
  };

  console.log('HTTP 428 Grind Check Interceptor active with a 1-second delay.');
})();

console.log("script.js started on", window.location.href);

setInterval(() => {
  console.log("script.js heartbeat", new Date().toISOString());
}, 10000);
