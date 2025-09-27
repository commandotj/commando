// Helper to split path for breadcrumb
export const splitPath = (path: string): string[] =>
  path.split(/[\\/]/).filter(Boolean);

// Helper to join paths (cross-platform)
export function joinPath(currentPath: string, name: string): string {
  // Remove trailing slashes
  const cleanPath = currentPath.replace(/[\\/]+$/, "");

  if (cleanPath.match(/^([A-Za-z]:)?\\/)) {
    return cleanPath + "\\" + name; // Windows
  }
  return cleanPath + "/" + name; // Unix
}

// Helper to format file size
export const formatSize = (size?: number): string => {
  if (size === undefined || size === null) return "";
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(2) + " " + units[i];
};
