use std::process::Command;
use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::process::Child;

#[derive(Debug, Serialize, Deserialize)]
pub struct BunStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpServerStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub pid: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FastAPIStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub pid: Option<u32>,
    pub health_check_url: Option<String>,
}

// Global state for FastAPI process
type FastAPIProcess = Arc<Mutex<Option<Child>>>;

// Helper function to get Bun executable path
fn get_bun_path() -> Result<String, String> {
    // First try to find bun in PATH
    if let Ok(bun_path) = which::which("bun") {
        return Ok(bun_path.to_string_lossy().to_string());
    }
    
    // If not in PATH, check common installation locations
    let home_dir = std::env::var("HOME").unwrap_or_default();
    let bun_home_path = format!("{}/.bun/bin/bun", home_dir);
    
    if std::path::Path::new(&bun_home_path).exists() {
        return Ok(bun_home_path);
    }
    
    Err("Bun executable not found".to_string())
}

// Helper function to get Python executable path
fn get_python_path() -> Result<String, String> {
    // Try python3.11 first (preferred), then python3, then python
    for python_cmd in &["python3.11", "python3", "python"] {
        if let Ok(python_path) = which::which(python_cmd) {
            // Verify it's a compatible version
            if let Ok(output) = Command::new(&python_path).arg("--version").output() {
                if output.status.success() {
                    let version_str = String::from_utf8_lossy(&output.stdout);
                    log::info!("Found Python: {} ({})", python_path.display(), version_str.trim());
                    return Ok(python_path.to_string_lossy().to_string());
                }
            }
        }
    }
    
    Err("Python executable not found".to_string())
}

#[tauri::command]
async fn check_bun_installation() -> Result<BunStatus, String> {
    match get_bun_path() {
        Ok(bun_path) => {
            // Try to get version
            if let Ok(output) = Command::new(&bun_path).arg("--version").output() {
                if output.status.success() {
                    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    return Ok(BunStatus {
                        installed: true,
                        version: Some(version),
                        path: Some(bun_path),
                    });
                }
            }
            
            // Bun found but can't get version
            Ok(BunStatus {
                installed: true,
                version: None,
                path: Some(bun_path),
            })
        }
        Err(_) => {
            // Bun not found
            Ok(BunStatus {
                installed: false,
                version: None,
                path: None,
            })
        }
    }
}

#[tauri::command]
async fn install_bun() -> Result<String, String> {
    let install_script = if cfg!(target_os = "windows") {
        "powershell -c \"irm bun.sh/install.ps1 | iex\""
    } else {
        "curl -fsSL https://bun.sh/install | bash"
    };

    match Command::new("sh").arg("-c").arg(install_script).output() {
        Ok(output) => {
            if output.status.success() {
                Ok("Bun installed successfully".to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to install Bun: {}", stderr))
            }
        }
        Err(e) => Err(format!("Error executing install command: {}", e)),
    }
}

#[tauri::command]
async fn install_mcp_server(app_handle: tauri::AppHandle) -> Result<String, String> {
    let home_dir = std::env::var("HOME")
        .map_err(|_| "Failed to get home directory".to_string())?;
    
    let wirecraft_dir = std::path::Path::new(&home_dir).join(".wirecraft");
    let mcp_server_dir = wirecraft_dir.join("mcp-server");
    
    // Create ~/.wirecraft directory if it doesn't exist
    std::fs::create_dir_all(&mcp_server_dir)
        .map_err(|e| format!("Failed to create ~/.wirecraft/mcp-server directory: {}", e))?;

    // Get the bundled MCP server files - check multiple possible locations
    let mut bundled_server_dir = None;
    
    // First try the resource directory (production)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        log::info!("Resource directory: {:?}", resource_dir);
        
        // Check direct path first
        let candidate = resource_dir.join("mcp-server-bundle");
        log::info!("Checking direct resource candidate: {:?}", candidate);
        if candidate.exists() {
            bundled_server_dir = Some(candidate);
        } else {
            // Check the _up_/_up_ path structure we see in the bundle
            let up_candidate = resource_dir.join("_up_").join("_up_").join("mcp-server-bundle");
            log::info!("Checking _up_/_up_ candidate: {:?}", up_candidate);
            if up_candidate.exists() {
                bundled_server_dir = Some(up_candidate);
            }
        }
    }
    
    // If not found, try development path (relative to project root)
    if bundled_server_dir.is_none() {
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        
        log::info!("Current directory: {:?}", current_dir);
        
        // Try relative to project root (go up from src-tauri to tauri-mcp-client, then up to main project)
        let dev_candidate = current_dir.parent() // from src-tauri to tauri-mcp-client
            .and_then(|p| p.parent()) // from tauri-mcp-client to cursor-talk-to-figma-mcp
            .ok_or("Could not find project root directory")?
            .join("mcp-server-bundle");
            
        log::info!("Checking dev candidate: {:?}", dev_candidate);
            
        if dev_candidate.exists() {
            log::info!("Found MCP server bundle at: {:?}", dev_candidate);
            bundled_server_dir = Some(dev_candidate);
        }
    }
    
    // Copy MCP server files to ~/.wirecraft/mcp-server
    match bundled_server_dir {
        Some(source_dir) => {
            copy_dir_recursive(&source_dir, &mcp_server_dir)
                .map_err(|e| format!("Failed to copy MCP server files: {}", e))?;
        }
        None => {
            return Err("MCP server bundle not found in resources or development path".to_string());
        }
    }

    // Install dependencies
    let bun_path = get_bun_path()
        .map_err(|e| format!("Bun not found for dependency installation: {}", e))?;
    let install_output = Command::new(&bun_path)
        .args(&["install"])
        .current_dir(&mcp_server_dir)
        .output()
        .map_err(|e| format!("Failed to run bun install: {}", e))?;

    if !install_output.status.success() {
        let stderr = String::from_utf8_lossy(&install_output.stderr);
        return Err(format!("Failed to install MCP server dependencies: {}", stderr));
    }

    Ok("MCP Server installed successfully to ~/.wirecraft/mcp-server".to_string())
}

#[tauri::command]
async fn start_mcp_server() -> Result<String, String> {
    let home_dir = std::env::var("HOME")
        .map_err(|_| "Failed to get home directory".to_string())?;
    
    let mcp_server_dir = std::path::Path::new(&home_dir).join(".wirecraft").join("mcp-server");
    
    if !mcp_server_dir.exists() {
        return Err("MCP server not installed. Please install it first.".to_string());
    }

    // Get Bun path
    let bun_path = get_bun_path()
        .map_err(|e| format!("Bun not found for starting MCP server: {}", e))?;

    // Start the MCP server
    let server_path = mcp_server_dir.join("server.ts");
    let _child = Command::new(&bun_path)
        .args(&["run", server_path.to_str().unwrap()])
        .current_dir(&mcp_server_dir)
        .spawn()
        .map_err(|e| format!("Failed to start MCP server: {}", e))?;

    // Store the child process ID for later management
    let pid = _child.id();
    
    // Start socket server as well
    let socket_path = mcp_server_dir.join("socket.ts");
    let _socket_child = Command::new(&bun_path)
        .args(&["run", socket_path.to_str().unwrap()])
        .current_dir(&mcp_server_dir)
        .spawn()
        .map_err(|e| format!("Failed to start socket server: {}", e))?;

    Ok(format!("MCP Server started with PID: {}", pid))
}

#[tauri::command]
async fn check_mcp_server_installation() -> Result<bool, String> {
    let home_dir = std::env::var("HOME")
        .map_err(|_| "Failed to get home directory".to_string())?;
    
    let mcp_server_dir = std::path::Path::new(&home_dir).join(".wirecraft").join("mcp-server");
    let server_file = mcp_server_dir.join("server.ts");
    let package_file = mcp_server_dir.join("package.json");
    
    Ok(server_file.exists() && package_file.exists())
}

// Helper function to copy directories recursively
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }
    
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn get_mcp_server_status() -> Result<McpServerStatus, String> {
    // Simple check to see if the server is running on default port
    match std::net::TcpStream::connect("127.0.0.1:3055") {
        Ok(_) => Ok(McpServerStatus {
            running: true,
            port: Some(3055),
            pid: None, // We'd need to store this somewhere to track it
        }),
        Err(_) => Ok(McpServerStatus {
            running: false,
            port: None,
            pid: None,
        }),
    }
}

// FastAPI Server Management Functions

#[tauri::command]
async fn start_fastapi_server(app_handle: tauri::AppHandle) -> Result<String, String> {
    let fastapi_process: FastAPIProcess = app_handle.state::<FastAPIProcess>().inner().clone();
    
    // Check if already running
    {
        let mut process = fastapi_process.lock().unwrap();
        if let Some(child) = process.as_mut() {
            if let Ok(None) = child.try_wait() {
                return Ok("FastAPI server is already running".to_string());
            }
        }
    }

    // Find the FastAPI directory - try multiple locations
    let mut fastapi_dir = None;
    
    // First try getting from current working directory (development)
    if let Ok(current_dir) = std::env::current_dir() {
        log::info!("Current directory: {:?}", current_dir);
        
        // Try relative path from src-tauri directory
        let dev_fastapi_dir = current_dir
            .parent() // from src-tauri to tauri-mcp-client
            .map(|p| p.join("resource/mcp-client-python/api"));
            
        if let Some(dir) = dev_fastapi_dir {
            log::info!("Checking dev FastAPI dir: {:?}", dir);
            if dir.exists() {
                fastapi_dir = Some(dir);
            }
        }
    }
    
    // If not found in dev, try resource directory (production)
    if fastapi_dir.is_none() {
        if let Ok(resource_dir) = app_handle.path().resource_dir() {
            log::info!("Resource directory: {:?}", resource_dir);
            let resource_fastapi_dir = resource_dir
                .parent()
                .map(|p| p.join("resource/mcp-client-python/api"));
                
            if let Some(dir) = resource_fastapi_dir {
                log::info!("Checking resource FastAPI dir: {:?}", dir);
                if dir.exists() {
                    fastapi_dir = Some(dir);
                }
            }
        }
    }

    let fastapi_dir = fastapi_dir.ok_or("FastAPI directory not found. Expected at resource/mcp-client-python/api")?;
    log::info!("Using FastAPI directory: {:?}", fastapi_dir);

    // Check if requirements.txt exists
    let requirements_file = fastapi_dir.join("requirements.txt");
    if !requirements_file.exists() {
        return Err("requirements.txt not found in FastAPI directory".to_string());
    }

    // Get Python path
    let python_path = get_python_path()?;
    log::info!("Using Python: {}", python_path);

    // Create virtual environment if it doesn't exist
    let venv_dir = fastapi_dir.join("venv");
    if !venv_dir.exists() {
        log::info!("Creating Python virtual environment...");
        let output = Command::new(&python_path)
            .args(&["-m", "venv", "venv"])
            .current_dir(&fastapi_dir)
            .output()
            .map_err(|e| format!("Failed to create virtual environment: {}", e))?;

        if !output.status.success() {
            return Err(format!("Failed to create virtual environment: {}", 
                String::from_utf8_lossy(&output.stderr)));
        }
        log::info!("Virtual environment created successfully");
    } else {
        log::info!("Virtual environment already exists");
    }

    // Get the Python executable from the virtual environment
    let venv_python = if cfg!(windows) {
        venv_dir.join("Scripts/python.exe")
    } else {
        venv_dir.join("bin/python")
    };

    if !venv_python.exists() {
        return Err(format!("Virtual environment Python not found at: {:?}", venv_python));
    }

    // Install dependencies
    log::info!("Installing FastAPI dependencies...");
    let pip_install = Command::new(&venv_python)
        .args(&["-m", "pip", "install", "-r", "requirements.txt"])
        .current_dir(&fastapi_dir)
        .output()
        .map_err(|e| format!("Failed to install dependencies: {}", e))?;

    if !pip_install.status.success() {
        log::warn!("Pip install had issues: {}", String::from_utf8_lossy(&pip_install.stderr));
        // Don't fail here, continue to try starting the server
    } else {
        log::info!("Dependencies installed successfully");
    }

    // Install the parent package if pyproject.toml exists
    let parent_dir = fastapi_dir.parent().unwrap();
    if parent_dir.join("pyproject.toml").exists() {
        log::info!("Installing parent package...");
        let parent_install = Command::new(&venv_python)
            .args(&["-m", "pip", "install", "-e", "."])
            .current_dir(parent_dir)
            .output();
        
        match parent_install {
            Ok(output) => {
                if output.status.success() {
                    log::info!("Parent package installed successfully");
                } else {
                    log::warn!("Parent package install had issues: {}", String::from_utf8_lossy(&output.stderr));
                }
            }
            Err(e) => log::warn!("Failed to install parent package: {}", e),
        }
    }

    // Check if main.py exists
    let main_py = fastapi_dir.join("main.py");
    if !main_py.exists() {
        return Err("main.py not found in FastAPI directory".to_string());
    }

    // Start the FastAPI server
    log::info!("Starting FastAPI server...");
    let mut child = Command::new(&venv_python)
        .arg("main.py")
        .current_dir(&fastapi_dir)
        .spawn()
        .map_err(|e| format!("Failed to start FastAPI server: {}", e))?;

    let pid = child.id();
    log::info!("FastAPI server started with PID: {}", pid);
    
    // Store the process
    {
        let mut process = fastapi_process.lock().unwrap();
        *process = Some(child);
    }

    Ok(format!("FastAPI server started with PID: {}", pid))
}

#[tauri::command]
async fn stop_fastapi_server(app_handle: tauri::AppHandle) -> Result<String, String> {
    let fastapi_process: FastAPIProcess = app_handle.state::<FastAPIProcess>().inner().clone();
    
    let mut process = fastapi_process.lock().unwrap();
    if let Some(mut child) = process.take() {
        match child.kill() {
            Ok(_) => {
                let _ = child.wait();
                Ok("FastAPI server stopped".to_string())
            }
            Err(e) => Err(format!("Failed to stop FastAPI server: {}", e))
        }
    } else {
        Ok("FastAPI server is not running".to_string())
    }
}

#[tauri::command]
async fn get_fastapi_server_status(app_handle: tauri::AppHandle) -> Result<FastAPIStatus, String> {
    let fastapi_process: FastAPIProcess = app_handle.state::<FastAPIProcess>().inner().clone();
    
    let mut process = fastapi_process.lock().unwrap();
    if let Some(child) = process.as_mut() {
        match child.try_wait() {
            Ok(None) => {
                // Process is still running
                Ok(FastAPIStatus {
                    running: true,
                    port: Some(8000),
                    pid: Some(child.id()),
                    health_check_url: Some("http://localhost:8000/health".to_string()),
                })
            }
            Ok(Some(_)) => {
                // Process has exited
                *process = None;
                Ok(FastAPIStatus {
                    running: false,
                    port: None,
                    pid: None,
                    health_check_url: None,
                })
            }
            Err(e) => Err(format!("Failed to check process status: {}", e))
        }
    } else {
        Ok(FastAPIStatus {
            running: false,
            port: None,
            pid: None,
            health_check_url: None,
        })
    }
}

#[tauri::command]
async fn check_fastapi_health() -> Result<bool, String> {
    // Try to make a health check request
    use std::time::Duration;
    
    tokio::time::timeout(Duration::from_secs(5), async {
        // Simple TCP connection check
        tokio::net::TcpStream::connect("127.0.0.1:8000").await
    })
    .await
    .map(|result| result.is_ok())
    .unwrap_or(false)
    .then_some(true)
    .ok_or_else(|| "Health check failed".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(FastAPIProcess::new(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Auto-setup on app launch
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                std::thread::sleep(std::time::Duration::from_secs(2));
                
                // Check if Bun is installed, install if not
                if let Ok(bun_status) = check_bun_installation().await {
                    if !bun_status.installed {
                        log::info!("Bun not found, attempting to install...");
                        if let Err(e) = install_bun().await {
                            log::error!("Failed to install Bun: {}", e);
                            return;
                        }
                    }
                }

                // Check if MCP server is installed, install if not
                if let Ok(is_installed) = check_mcp_server_installation().await {
                    if !is_installed {
                        log::info!("MCP server not found, installing to ~/.wirecraft...");
                        match install_mcp_server(app_handle.clone()).await {
                            Ok(msg) => log::info!("Auto-installed MCP server: {}", msg),
                            Err(e) => {
                                log::error!("Failed to auto-install MCP server: {}", e);
                                return;
                            }
                        }
                    }
                }

                // Start MCP server
                match start_mcp_server().await {
                    Ok(msg) => log::info!("Auto-started MCP server: {}", msg),
                    Err(e) => log::error!("Failed to auto-start MCP server: {}", e),
                }

                // Start FastAPI server
                match start_fastapi_server(app_handle.clone()).await {
                    Ok(msg) => log::info!("Auto-started FastAPI server: {}", msg),
                    Err(e) => log::error!("Failed to auto-start FastAPI server: {}", e),
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_bun_installation,
            install_bun,
            install_mcp_server,
            start_mcp_server,
            check_mcp_server_installation,
            get_mcp_server_status,
            start_fastapi_server,
            stop_fastapi_server,
            get_fastapi_server_status,
            check_fastapi_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
