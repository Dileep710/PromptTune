/* ── Prompt Improver+ · script.js ───────────────────────────────── */

const SYSTEM_PROMPT = `You are a world-class prompt engineering expert. Your job is to analyze a user's raw prompt and return a structured JSON response.

Return ONLY valid JSON with this exact structure:
{
  "improved": "Role: Expert\\nTask: [refined task]\\nConstraints:\\n• [rule 1]\\n• [rule 2]\\n• [rule 3]\\n• [rule 4]\\n• [rule 5]",
  "analysis": {
    "hasRole": true,
    "hasTaskClarity": true,
    "hasConstraints": true
  },
  "reasons": [
    {
      "type": "role",
      "icon": "🎯",
      "title": "Expert Role Assigned",
      "description": "Short explanation of the role added and why it helps"
    },
    {
      "type": "task",
      "icon": "📋",
      "title": "Task Clarified",
      "description": "Short explanation of how the task was made more precise"
    },
    {
      "type": "constraint",
      "icon": "🔒",
      "title": "Constraints Added",
      "description": "Short explanation of constraints or format rules added"
    }
  ]
}

Guidelines for the improved prompt:
- Role: Always start with "Role: Expert" or a specific expert persona
- Task: Refine the user's input into a precise, action-oriented task
- Constraints: Provide exactly 5 bullet points with rules or guidelines

Make the improved prompt significantly more specific, actionable, and powerful than the original.
Return ONLY the JSON object. No markdown fences, no preamble, nothing else.`;


/* ── DOM refs ──────────────────────────────────────────── */
const promptInput   = document.getElementById('promptInput');
const charCount     = document.getElementById('charCount');
const improveBtn    = document.getElementById('improveBtn');
const btnLoader     = document.getElementById('btnLoader');
const resultsSection = document.getElementById('resultsSection');
const beforeContent = document.getElementById('beforeContent');
const afterContent  = document.getElementById('afterContent');
const reasonsGrid   = document.getElementById('reasonsGrid');
const copyBtn       = document.getElementById('copyBtn');
const detRole       = document.getElementById('det-role');
const detTask       = document.getElementById('det-task');
const detConstraint = document.getElementById('det-constraint');
const templateSelect = document.getElementById('templateSelect');
const exampleBtn    = document.getElementById('exampleBtn');
const beforeScore   = document.getElementById('beforeScore');
const afterScore    = document.getElementById('afterScore');

let improvedText = '';
const templates = {
  explain: "Explain quantum computing in simple terms",
  email: "Write a professional email to request a meeting",
  code: "Generate a Python function to sort a list"
};

/* ── Template select ───────────────────────────────────── */
templateSelect.addEventListener('change', () => {
  const selected = templateSelect.value;
  if (selected && templates[selected]) {
    promptInput.value = templates[selected];
    charCount.textContent = promptInput.value.length;
    liveDetect(promptInput.value);
  }
});

/* ── Ex button ── */
exampleBtn.addEventListener('click', () => {
  const examples = [
    "write a blog post about AI",
    "create a marketing plan",
    "design a logo for a startup",
    "explain machine learning",
    "write a cover letter"
  ];
  const randomExample = examples[Math.floor(Math.random() * examples.length)];
  promptInput.value = randomExample;
  charCount.textContent = promptInput.value.length;
  liveDetect(promptInput.value);
});

/* ── Char counter ──────────────────────────────────────── */
promptInput.addEventListener('input', () => {
  charCount.textContent = promptInput.value.length;
  liveDetect(promptInput.value);
});

function liveDetect(text) {
  const lower = text.toLowerCase();
  const hasRole = /\b(as a|act as|you are|role:|expert|specialist|professional)\b/.test(lower);
  const hasTask = text.trim().split(/\s+/).length >= 8;
  const hasConstraint = /\b(only|must|don't|limit|avoid|ensure|format|bullet|list|steps|length)\b/.test(lower);
  setBadge(detRole, hasRole);
  setBadge(detTask, hasTask, 'Task Clarity');
  setBadge(detConstraint, hasConstraint);

  const roleScore = hasRole ? 30 : 0;
  const taskScore = hasTask ? 30 : 0;
  const constraintScore = hasConstraint ? 40 : 0;
  const totalScore = roleScore + taskScore + constraintScore;
  beforeScore.textContent = `Score: ${totalScore}`;
}

function setBadge(el, present, override) {
  if (present) {
    el.classList.remove('missing');
    el.classList.add('present');
    el.textContent = '✓ ' + (override || el.textContent.replace(/[◎✓] ?/, ''));
  } else {
    el.classList.remove('present');
    el.classList.add('missing');
    el.textContent = '◎ ' + (override || el.textContent.replace(/[◎✓] ?/, ''));
  }
}

/* ── Main improve handler ─────── */
improveBtn.addEventListener('click', async () => {
  const raw = promptInput.value.trim();
  if (!raw) { shake(promptInput); return; }

  setLoading(true);

  try {
    const result = await callGROQ(raw);
    renderResults(raw, result);
  } catch (err) {
    console.error(err);
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});

/* ── Call GROQ API ─────── */
async function callGROQ(userPrompt) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are a prompt engineering expert.
Return ONLY valid JSON:
{
 "improved": "Role: Expert\\nTask: [refined]\\nConstraints:\\n• [1]\\n• [2]\\n• [3]\\n• [4]\\n• [5]",
 "analysis": {
   "hasRole": true,
   "hasTaskClarity": true,
   "hasConstraints": true
 },
 "reasons": [
   {"type":"role","icon":"🎯","title":"Role Added","description":"..."},
   {"type":"task","icon":"📋","title":"Task Improved","description":"..."},
   {"type":"constraint","icon":"🔒","title":"Constraints Added","description":"..."}
 ]
}`
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.3
      })
    });

    // API error
    if(!response.ok){
      throw new Error("API error " + response.status);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    console.log("RAW:", text);

    try{
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    }catch (e) {
      console.warn("JSON parse failed → using fallback");
      return fallbackResponse(userPrompt);
    }
  } catch (err) {
    console.error("API FAILED:", err);
    return fallbackResponse(userPrompt);
  }
}
function renderResults(original, data) {
  improvedText = data.improved;
  beforeContent.textContent = '';
  afterContent.textContent  = '';

  typewrite(beforeContent, original, 6);
  setTimeout(() => typewrite(afterContent, data.improved, 3), 300);

  //Update detection badges with API result
  setBadge(detRole, !data.analysis.hasRole, 'Role Added ✓');
  setBadge(detTask, true, 'Task Clear ✓');
  setBadge(detConstraint, true, 'Constraints ✓');

  afterScore.textContent = 'Score: 100';
  reasonsGrid.innerHTML = '';
  (data.reasons || []).forEach((r, i) => {
    const card = document.createElement('div');
    card.className = `reason-card reason-${r.type}`;
    card.innerHTML = `
      <div class="reason-icon">${r.icon}</div>
      <div class="reason-title">${r.title}</div>
      <div class="reason-desc">${r.description}</div>
    `;
    reasonsGrid.appendChild(card);
    setTimeout(() => card.classList.add('show'), 600 + i * 100);
  });
  //Show results
  resultsSection.classList.add('visible');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function typewrite(el, text, speed = 5) {
  el.textContent = '';
  let i = 0;
  const tick = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(tick, speed);
    }
  };
  tick();
}

/*── Copy button ──────*/
copyBtn.addEventListener('click', async () => {
  if (!improvedText) return;
  try {
    await navigator.clipboard.writeText(improvedText);
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = '<span class="copy-icon">✓</span><span class="copy-text">Copied!</span>';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = '<span class="copy-icon">⎘</span><span class="copy-text">Copy</span>';
    }, 2000);
  } catch {
    copyBtn.innerHTML = '<span>Copy failed</span>';
  }
});
function setLoading(on) {
  improveBtn.disabled = on;
  improveBtn.classList.toggle('loading', on);
  btnLoader.classList.toggle('active', on);
  if (on) resultsSection.classList.remove('visible');
}
function shake(el) {
  el.style.animation = 'none';
  el.style.boxShadow = '0 0 0 2px #ff4d4d';
  el.offsetHeight;
  el.style.transition = 'box-shadow 0.5s ease';
  setTimeout(() => { el.style.boxShadow = ''; }, 600);
}

/*── Error toast ────*/
function showError(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: #1a0a0a; border: 1px solid #ff4d4d88; color: #ff6b6b;
    padding: 12px 24px; border-radius: 12px; font-size: 13px;
    font-family: 'DM Mono', monospace; z-index: 9999;
    box-shadow: 0 8px 32px rgba(255,77,77,0.2);
    animation: fadeSlideUp 0.3s ease;
  `;
  toast.textContent = '⚠ ' + msg;

  const style = document.createElement('style');
  style.textContent = `@keyframes fadeSlideUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
function fallbackResponse(input) {
  return {
    improved: `Role: Expert\nTask: ${input}\nConstraints:\n• Provide clear and concise response\n• Use simple language\n• Include examples\n• Structure the answer logically\n• End with a summary`,
    analysis: {
      hasRole: false,
      hasTaskClarity: true,
      hasConstraints: false
    },
    reasons: [
      {
        type: "role",
        icon: "🎯",
        title: "Role Added",
        description: "Added expert role for clarity"
      },
      {
        type: "task",
        icon: "📋",
        title: "Task Clarified",
        description: "Improved task clarity"
      },
      {
        type: "constraint",
        icon: "🔒",
        title: "Constraints Added",
        description: "Added structure for better output"
      }
    ]
  };
}