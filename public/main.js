const { invoke } = window.__TAURI__.core;

let tasks = [];
let selected = new Set();

// Generic command helper — mutations return updated task list
async function runCommand(command, args = {}) {
    const updated = await invoke(command, args);
    tasks = updated;
    renderTasks();
}

// Load tasks on startup
async function loadTasks() {
    try {
        tasks = await invoke('get_tasks');
        renderTasks();
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

// Close all open dropdown menus
function closeAllMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
}

// Single persistent listener for closing menus
document.addEventListener('click', closeAllMenus);

// Render tasks to the UI
function renderTasks() {
    const taskQueue = document.getElementById('taskQueue');

    if (tasks.length === 0) {
        taskQueue.innerHTML = '<div class="empty-state">No tasks yet. Add one above!</div>';
        return;
    }

    taskQueue.innerHTML = '';
    tasks.forEach((task, index) => {
        // Insert divider + queue label between active and queued tasks
        if (index === 1) {
            const divider = document.createElement('div');
            divider.className = 'queue-divider';
            taskQueue.appendChild(divider);
            const label = document.createElement('div');
            label.className = 'section-label';
            label.textContent = 'up next';
            taskQueue.appendChild(label);
        }

        const taskEl = document.createElement('div');
        let classes = 'task-item';
        if (index === 0) classes += ' active';
        if (selected.has(index)) classes += ' selected';
        taskEl.className = classes;

        const numLabel = index === 0 ? 'now' : String(index + 1).padStart(2, '0');

        taskEl.innerHTML = `
            ${task.persisted ? '<span class="persist-indicator" title="Persisted">●</span>' : ''}
            <span class="task-number">${numLabel}</span>
            <div class="task-text"></div>
            <div class="task-actions">
                <button class="menu-btn" title="Actions">⋮</button>
                <div class="dropdown-menu hidden">
                    <button class="menu-item edit-item">Edit</button>
                    <button class="menu-item done-item">Done</button>
                </div>
            </div>
        `;
        taskEl.querySelector('.task-text').textContent = task.text;

        const textEl = taskEl.querySelector('.task-text');
        const menuBtn = taskEl.querySelector('.menu-btn');
        const dropdown = taskEl.querySelector('.dropdown-menu');

        // Double-click to copy
        textEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(task.text);
            showCopiedFeedback(textEl);
        });

        // Click on task body: Cmd+Click toggles selection, plain click cycles
        taskEl.addEventListener('click', (e) => {
            if (e.target.closest('.task-actions') || e.target.closest('.edit-input')) return;
            if (window.getSelection().toString().length > 0) return;

            if (e.metaKey) {
                // Cmd+Click: toggle selection
                if (selected.has(index)) {
                    selected.delete(index);
                } else {
                    selected.add(index);
                }
                renderTasks();
            } else {
                // Plain click: clear selection and cycle
                selected.clear();
                cycleTask(index);
            }
        });

        // Three-dots menu toggle
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllMenus();
            dropdown.classList.toggle('hidden');
        });

        taskEl.querySelector('.edit-item').addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.add('hidden');
            startEdit(index, taskEl);
        });

        taskEl.querySelector('.done-item').addEventListener('click', (e) => {
            e.stopPropagation();
            markDone(index);
        });

        taskQueue.appendChild(taskEl);
    });
}

function showCopiedFeedback(el) {
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 800);
}

// Start inline editing for a task
function startEdit(index, taskEl) {
    const textEl = taskEl.querySelector('.task-text');
    const actionsEl = taskEl.querySelector('.task-actions');
    const currentText = tasks[index].text;

    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = currentText;
    textEl.textContent = '';
    textEl.appendChild(input);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save';
    actionsEl.textContent = '';
    actionsEl.appendChild(saveBtn);

    input.focus();
    input.select();

    const save = async () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            try {
                await runCommand('update_task', { index, task: newText });
                return;
            } catch (error) {
                console.error('Failed to update task:', error);
            }
        }
        renderTasks();
    };

    saveBtn.addEventListener('click', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') renderTasks();
    });
}

// Add a new task
async function addTask() {
    const input = document.getElementById('taskInput');
    const taskText = input.value.trim();

    if (taskText) {
        try {
            await runCommand('add_task', { task: taskText });
            input.value = '';
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    }
}

async function cycleTask(index) {
    try {
        await runCommand('cycle_task', { index });
    } catch (error) {
        console.error('Failed to cycle task:', error);
    }
}

async function markDone(index) {
    try {
        await runCommand('mark_done', { index });
    } catch (error) {
        console.error('Failed to mark task as done:', error);
    }
}

async function togglePersist(index) {
    try {
        await runCommand('toggle_persist', { index });
    } catch (error) {
        console.error('Failed to toggle persist:', error);
    }
}

// Cmd+K: toggle persist on selected tasks, then clear selection
// Escape: clear selection
document.addEventListener('keydown', async (e) => {
    if (e.key === 'k' && e.metaKey) {
        e.preventDefault();
        if (selected.size === 0) return;
        for (const index of selected) {
            await togglePersist(index);
        }
        selected.clear();
        renderTasks();
    }
    if (e.key === 'Escape') {
        if (selected.size > 0) {
            selected.clear();
            renderTasks();
        }
    }
});

// Event listeners
document.getElementById('addBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Initialize
loadTasks();
