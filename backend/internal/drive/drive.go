package drive

import (
	"os"
	"path/filepath"
	"sort"
)

// Info describes a mount point or volume.
type Info struct {
	Device      string              `json:"device"`
	Description string              `json:"description"`
	Size        int64               `json:"size"`
	Mountpoints []map[string]string `json:"mountpoints"`
	IsSystem    bool                `json:"isSystem"`
	IsRemovable bool                `json:"isRemovable"`
	IsReady     bool                `json:"isReady"`
	Label       string              `json:"label,omitempty"`
}

// List returns home and mounted volumes.
func List() ([]Info, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	drives := []Info{
		{
			Device:      "home",
			Description: "Home",
			Mountpoints: []map[string]string{{"path": home}},
			IsSystem:    true,
			IsRemovable: false,
			IsReady:     true,
			Label:       "Home",
		},
	}

	volumeRoot := "/Volumes"
	entries, err := os.ReadDir(volumeRoot)
	if err != nil {
		return drives, nil
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		mountPath := filepath.Join(volumeRoot, entry.Name())
		drives = append(drives, Info{
			Device:      entry.Name(),
			Description: entry.Name(),
			Mountpoints: []map[string]string{{"path": mountPath}},
			IsSystem:    false,
			IsRemovable: true,
			IsReady:     true,
			Label:       entry.Name(),
		})
	}

	sort.Slice(drives, func(i, j int) bool {
		return drives[i].Description < drives[j].Description
	})

	return drives, nil
}

// Get returns one drive by device id.
func Get(device string) (Info, error) {
	drives, err := List()
	if err != nil {
		return Info{}, err
	}

	for _, item := range drives {
		if item.Device == device {
			return item, nil
		}
	}

	return Info{}, os.ErrNotExist
}
