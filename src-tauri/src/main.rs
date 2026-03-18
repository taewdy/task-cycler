// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::{Manager, State};

#[derive(Clone, PartialEq, Serialize, Deserialize)]
struct Task {
    text: String,
    persisted: bool,
}

struct TaskState {
    tasks: Mutex<Vec<Task>>,
    data_path: OnceLock<PathBuf>,
}

impl TaskState {
    fn with_tasks_mut<F>(&self, f: F) -> Result<Vec<Task>, String>
    where
        F: FnOnce(&mut Vec<Task>) -> Result<(), String>,
    {
        let mut tasks = self.tasks.lock().unwrap_or_else(|e| e.into_inner());
        let had_persisted: Vec<_> = tasks
            .iter()
            .filter(|t| t.persisted)
            .cloned()
            .collect();
        f(&mut tasks)?;
        let now_persisted: Vec<_> = tasks
            .iter()
            .filter(|t| t.persisted)
            .cloned()
            .collect();
        if had_persisted != now_persisted {
            self.save(&now_persisted);
        }
        Ok(tasks.clone())
    }

    fn save(&self, persisted: &[Task]) {
        if let Some(path) = self.data_path.get() {
            match serde_json::to_string_pretty(persisted) {
                Ok(json) => {
                    if let Err(e) = fs::write(path, json) {
                        eprintln!("Failed to save tasks: {e}");
                    }
                }
                Err(e) => eprintln!("Failed to serialize tasks: {e}"),
            }
        }
    }
}

fn load_tasks(path: &PathBuf) -> Vec<Task> {
    if let Ok(json) = fs::read_to_string(path) {
        if let Ok(tasks) = serde_json::from_str::<Vec<Task>>(&json) {
            return tasks;
        }
    }
    Vec::new()
}

#[tauri::command]
fn get_tasks(state: State<TaskState>) -> Vec<Task> {
    let tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
    tasks.clone()
}

#[tauri::command]
fn add_task(task: String, state: State<TaskState>) -> Result<Vec<Task>, String> {
    state.with_tasks_mut(|tasks| {
        tasks.push(Task {
            text: task,
            persisted: false,
        });
        Ok(())
    })
}

#[tauri::command]
fn cycle_task(index: usize, state: State<TaskState>) -> Result<Vec<Task>, String> {
    state.with_tasks_mut(|tasks| {
        if index < tasks.len() {
            let task = tasks.remove(index);
            tasks.push(task);
            Ok(())
        } else {
            Err("Invalid index".to_string())
        }
    })
}

#[tauri::command]
fn update_task(index: usize, task: String, state: State<TaskState>) -> Result<Vec<Task>, String> {
    state.with_tasks_mut(|tasks| {
        if index < tasks.len() {
            tasks[index].text = task;
            Ok(())
        } else {
            Err("Invalid index".to_string())
        }
    })
}

#[tauri::command]
fn mark_done(index: usize, state: State<TaskState>) -> Result<Vec<Task>, String> {
    state.with_tasks_mut(|tasks| {
        if index < tasks.len() {
            tasks.remove(index);
            Ok(())
        } else {
            Err("Invalid index".to_string())
        }
    })
}

#[tauri::command]
fn toggle_persist(index: usize, state: State<TaskState>) -> Result<Vec<Task>, String> {
    state.with_tasks_mut(|tasks| {
        if index < tasks.len() {
            tasks[index].persisted = !tasks[index].persisted;
            Ok(())
        } else {
            Err("Invalid index".to_string())
        }
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TaskState {
            tasks: Mutex::new(Vec::new()),
            data_path: OnceLock::new(),
        })
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            fs::create_dir_all(&data_dir).expect("failed to create app data dir");
            let data_path = data_dir.join("tasks.json");
            let state = app.state::<TaskState>();
            let loaded = load_tasks(&data_path);
            state
                .data_path
                .set(data_path)
                .expect("data_path already set");
            *state.tasks.lock().unwrap() = loaded;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            add_task,
            update_task,
            cycle_task,
            mark_done,
            toggle_persist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
