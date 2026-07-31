package services

import "github.com/systembug/commando/internal/file"

type (
	DirectoryEntry     = file.Entry
	ListDirectoryOptions = file.ListOptions
	NavigationResult   = file.NavigationResult
)

// FileService exposes filesystem operations to the Wails UI.
type FileService struct{}

func (f *FileService) ListDir(path string, options ListDirectoryOptions) ([]DirectoryEntry, error) {
	return file.ListDir(path, options)
}

func (f *FileService) Navigate(path string, _ bool) (NavigationResult, error) {
	return file.Navigate(path)
}

func (f *FileService) GetHomeDir() (string, error) {
	return file.HomeDir()
}

func (f *FileService) ParentDir(path string) (string, error) {
	return file.ParentDir(path)
}

func (f *FileService) GoToParent(path string) (NavigationResult, error) {
	return file.GoToParent(path)
}
