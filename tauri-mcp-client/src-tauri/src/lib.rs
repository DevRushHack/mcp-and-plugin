use std::process::Command;
use tauri::Manager;
use serde::{Deserialize, Serialize};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
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
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_bun_installation,
            install_bun,
            install_mcp_server,
            start_mcp_server,
            check_mcp_server_installation,
            get_mcp_server_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
