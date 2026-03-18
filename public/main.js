const { invoke } = window.__TAURI__.core;

let tasks = [];

// Load tasks on startup
async function loadTasks() {
    try {
        tasks = await invoke('get_tasks');
        renderTasks();
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

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
        taskEl.className = 'task-item' + (index === 0 ? ' active' : '');

        const numLabel = index === 0 ? 'now' : String(index + 1).padStart(2, '0');

        taskEl.innerHTML = `
            <span class="task-number">${numLabel}</span>
            <div class="task-text">${task}</div>
            <div class="task-actions">
                <button class="menu-btn" title="Actions">⋮</button>
                <div class="dropdown-menu hidden">
                    <button class="menu-item edit-item">Edit</button>
                    <button class="menu-item done-item">Done</button>
                </div>
            </div>
        `;

        const textEl = taskEl.querySelector('.task-text');
        const menuBtn = taskEl.querySelector('.menu-btn');
        const dropdown = taskEl.querySelector('.dropdown-menu');

        // Double-click to copy
        textEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(task);
            showCopiedFeedback(textEl);
        });

        // Single click on task body cycles it — but not if user is selecting text
        taskEl.addEventListener('click', (e) => {
            if (!e.target.closest('.task-actions') && !e.target.closest('.edit-input')) {
                if (window.getSelection().toString().length === 0) {
                    cycleTask(index);
                }
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

    // Close menus when clicking elsewhere
    document.addEventListener('click', closeAllMenus, { once: true });
}

function closeAllMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
}

function showCopiedFeedback(el) {
    const original = el.textContent;
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 800);
}

// Start inline editing for a task
function startEdit(index, taskEl) {
    const textEl = taskEl.querySelector('.task-text');
    const actionsEl = taskEl.querySelector('.task-actions');
    const currentText = tasks[index];

    textEl.innerHTML = `<input class="edit-input" value="${currentText.replace(/"/g, '&quot;')}" />`;
    actionsEl.innerHTML = `<button class="save-btn" data-index="${index}">Save</button>`;

    const input = textEl.querySelector('.edit-input');
    input.focus();
    input.select();

    const save = async () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            try {
                await invoke('update_task', { index, task: newText });
                tasks = await invoke('get_tasks');
            } catch (error) {
                console.error('Failed to update task:', error);
            }
        }
        renderTasks();
    };

    actionsEl.querySelector('.save-btn').addEventListener('click', save);
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
            await invoke('add_task', { task: taskText });
            tasks = await invoke('get_tasks');
            input.value = '';
            renderTasks();
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    }
}

// Cycle a task to the bottom
async function cycleTask(index) {
    try {
        await invoke('cycle_task', { index });
        tasks = await invoke('get_tasks');
        renderTasks();
    } catch (error) {
        console.error('Failed to cycle task:', error);
    }
}

// Mark task as done
window.markDone = async function(index) {
    try {
        await invoke('mark_done', { index });
        tasks = await invoke('get_tasks');
        renderTasks();
    } catch (error) {
        console.error('Failed to mark task as done:', error);
    }
};

// Event listeners
document.getElementById('addBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Initialize
loadTasks();
