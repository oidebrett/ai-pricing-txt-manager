import os

def ensure_data_directory():
    """Ensure the data directory exists in the project root."""
    # Get the current directory (backend)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Navigate to the project root (one level up)
    project_root = os.path.dirname(current_dir)
    
    # Create the data directory if it doesn't exist
    data_dir = os.path.join(project_root, "data")
    os.makedirs(data_dir, exist_ok=True)
    
    print(f"Data directory ensured at: {data_dir}")
    return data_dir

if __name__ == "__main__":
    ensure_data_directory()