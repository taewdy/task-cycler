// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::State;

// State to hold our task queue
struct TaskState {
    tasks: Mutex<Vec<String>>,
}

#[tauri::command]
fn get_tasks(state: State<TaskState>) -> Vec<String> {
    let tasks = state.tasks.lock().unwrap();
    tasks.clone()
}

#[tauri::command]
fn add_task(task: String, state: State<TaskState>) -> Result<(), String> {
    let mut tasks = state.tasks.lock().unwrap();
    tasks.push(task);
    Ok(())
}

#[tauri::command]
fn cycle_task(index: usize, state: State<TaskState>) -> Result<(), String> {
    let mut tasks = state.tasks.lock().unwrap();

    if index < tasks.len() {
        let task = tasks.remove(index);
        tasks.push(task);
        Ok(())
    } else {
        Err("Invalid index".to_string())
    }
}

#[tauri::command]
fn update_task(index: usize, task: String, state: State<TaskState>) -> Result<(), String> {
    let mut tasks = state.tasks.lock().unwrap();
    if index < tasks.len() {
        tasks[index] = task;
        Ok(())
    } else {
        Err("Invalid index".to_string())
    }
}

#[tauri::command]
fn mark_done(index: usize, state: State<TaskState>) -> Result<(), String> {
    let mut tasks = state.tasks.lock().unwrap();

    if index < tasks.len() {
        tasks.remove(index);
        Ok(())
    } else {
        Err("Invalid index".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TaskState {
            tasks: Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            add_task,
            update_task,
            cycle_task,
            mark_done
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
