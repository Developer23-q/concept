import type { ProjectTemplate } from '@/types';

const MANIFEST_JSON = JSON.stringify(
  {
    name: 'My App',
    short_name: 'App',
    start_url: 'index.html',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    icons: []
  },
  null,
  2
);

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank project',
    description: 'An empty canvas with the three files every project needs.',
    files: [
      {
        path: 'index.html',
        kind: 'html',
        content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <h1>Hello, Concept!</h1>
  <p>Edit index.html, style.css, and script.js to get started.</p>
  <script src="script.js"></script>
</body>
</html>
`
      },
      { path: 'style.css', kind: 'css', content: `body {\n  font-family: sans-serif;\n  padding: 24px;\n}\n` },
      { path: 'script.js', kind: 'js', content: `console.log("Hello from script.js");\n` },
      { path: 'manifest.json', kind: 'json', content: MANIFEST_JSON }
    ]
  },
  {
    id: 'todo',
    name: 'To-do list',
    description: 'A working task list with add, complete, and delete.',
    files: [
      {
        path: 'index.html',
        kind: 'html',
        content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>To-Do List</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <h1>To-Do List</h1>
    <form id="todo-form">
      <input id="todo-input" type="text" placeholder="What needs doing?" />
      <button type="submit" id="add-btn">Add</button>
    </form>
    <ul id="todo-list"></ul>
  </main>
  <script src="script.js"></script>
</body>
</html>
`
      },
      {
        path: 'style.css',
        kind: 'css',
        content: `body { font-family: system-ui, sans-serif; background: #f5f5f7; margin: 0; padding: 32px 16px; }\nmain { max-width: 420px; margin: 0 auto; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }\nform { display: flex; gap: 8px; margin-bottom: 16px; }\ninput { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }\nbutton { padding: 10px 16px; border: none; background: #e8a33d; color: #1a1d29; border-radius: 8px; font-weight: 600; cursor: pointer; }\nul { list-style: none; padding: 0; margin: 0; }\nli { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid #eee; }\nli.done span { text-decoration: line-through; color: #999; }\nli button.remove { margin-left: auto; background: none; color: #c00; font-weight: normal; }\n`
      },
      {
        path: 'script.js',
        kind: 'js',
        content: `const form = document.getElementById("todo-form");\nconst input = document.getElementById("todo-input");\nconst list = document.getElementById("todo-list");\n\nform.addEventListener("submit", (e) => {\n  e.preventDefault();\n  const text = input.value.trim();\n  if (!text) return;\n  addTodo(text);\n  input.value = "";\n});\n\nfunction addTodo(text) {\n  const li = document.createElement("li");\n  const span = document.createElement("span");\n  span.textContent = text;\n  span.addEventListener("click", () => li.classList.toggle("done"));\n\n  const removeBtn = document.createElement("button");\n  removeBtn.textContent = "Delete";\n  removeBtn.className = "remove";\n  removeBtn.addEventListener("click", () => li.remove());\n\n  li.appendChild(span);\n  li.appendChild(removeBtn);\n  list.appendChild(li);\n}\n`
      },
      { path: 'manifest.json', kind: 'json', content: MANIFEST_JSON }
    ]
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'A simple working calculator with a button grid.',
    files: [
      {
        path: 'index.html',
        kind: 'html',
        content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Calculator</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="calculator">
    <input id="display" type="text" readonly value="0" />
    <div class="grid">
      <button data-val="7">7</button><button data-val="8">8</button><button data-val="9">9</button><button data-op="/">÷</button>
      <button data-val="4">4</button><button data-val="5">5</button><button data-val="6">6</button><button data-op="*">×</button>
      <button data-val="1">1</button><button data-val="2">2</button><button data-val="3">3</button><button data-op="-">−</button>
      <button data-val="0">0</button><button id="clear">C</button><button id="equals">=</button><button data-op="+">+</button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>
`
      },
      {
        path: 'style.css',
        kind: 'css',
        content: `body { display: flex; justify-content: center; padding-top: 40px; background: #1a1d29; font-family: system-ui, sans-serif; }\n.calculator { background: #22273a; padding: 16px; border-radius: 16px; width: 260px; }\n#display { width: 100%; box-sizing: border-box; font-size: 28px; padding: 12px; margin-bottom: 12px; border-radius: 8px; border: none; text-align: right; }\n.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }\nbutton { padding: 16px 0; font-size: 18px; border: none; border-radius: 8px; background: #333952; color: white; cursor: pointer; }\nbutton[data-op] { background: #e8a33d; color: #1a1d29; }\n#equals { background: #e8a33d; color: #1a1d29; grid-column: span 1; }\n`
      },
      {
        path: 'script.js',
        kind: 'js',
        content: `const display = document.getElementById("display");\nlet current = "0";\nlet operator = null;\nlet previous = null;\n\ndocument.querySelectorAll("button[data-val]").forEach((btn) => {\n  btn.addEventListener("click", () => {\n    current = current === "0" ? btn.dataset.val : current + btn.dataset.val;\n    display.value = current;\n  });\n});\n\ndocument.querySelectorAll("button[data-op]").forEach((btn) => {\n  btn.addEventListener("click", () => {\n    previous = parseFloat(current);\n    operator = btn.dataset.op;\n    current = "0";\n  });\n});\n\ndocument.getElementById("equals").addEventListener("click", () => {\n  if (operator === null || previous === null) return;\n  const next = parseFloat(current);\n  let result = next;\n  if (operator === "+") result = previous + next;\n  if (operator === "-") result = previous - next;\n  if (operator === "*") result = previous * next;\n  if (operator === "/") result = previous / next;\n  display.value = String(result);\n  current = String(result);\n  operator = null;\n  previous = null;\n});\n\ndocument.getElementById("clear").addEventListener("click", () => {\n  current = "0";\n  operator = null;\n  previous = null;\n  display.value = current;\n});\n`
      },
      { path: 'manifest.json', kind: 'json', content: MANIFEST_JSON }
    ]
  },
  {
    id: 'portfolio',
    name: 'Portfolio page',
    description: 'A single-page personal portfolio layout.',
    files: [
      {
        path: 'index.html',
        kind: 'html',
        content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Portfolio</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>Jordan Rivera</h1>
    <p>Frontend developer &amp; vibe coder</p>
  </header>
  <section id="projects">
    <h2>Projects</h2>
    <div class="cards">
      <div class="card"><h3>Project One</h3><p>A short description goes here.</p></div>
      <div class="card"><h3>Project Two</h3><p>A short description goes here.</p></div>
    </div>
  </section>
  <script src="script.js"></script>
</body>
</html>
`
      },
      {
        path: 'style.css',
        kind: 'css',
        content: `body { margin: 0; font-family: system-ui, sans-serif; background: #f7f7f5; color: #1a1d29; }\nheader { padding: 64px 24px; text-align: center; background: #1a1d29; color: white; }\nheader p { color: #e8a33d; }\n#projects { max-width: 720px; margin: 0 auto; padding: 48px 24px; }\n.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }\n.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }\n@media (max-width: 560px) { .cards { grid-template-columns: 1fr; } }\n`
      },
      { path: 'script.js', kind: 'js', content: `console.log("Portfolio loaded");\n` },
      { path: 'manifest.json', kind: 'json', content: MANIFEST_JSON }
    ]
  }
];

export function getTemplate(id: string): ProjectTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
