package services

import "github.com/systembugtj/commando/internal/drive"

type DriveInfo = drive.Info

// DriveService lists local mount points for the Wails UI.
type DriveService struct{}

func (d *DriveService) ListDrives() ([]DriveInfo, error) {
	return drive.List()
}

func (d *DriveService) GetDriveDetails(device string) (DriveInfo, error) {
	return drive.Get(device)
}
