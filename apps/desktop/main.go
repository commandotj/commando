package main

import (
	"embed"
	"log"
	"runtime"

	"github.com/systembug/commando/apps/desktop/services"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func focusMainWindow(window *application.WebviewWindow) {
	if window == nil {
		return
	}
	if !window.IsVisible() {
		window.Show()
	}
	if window.IsMinimised() {
		window.Restore()
	}
	window.Focus()
}

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	identity := currentAppIdentity()
	desktopRuntime := services.NewRuntime(nil, runtime.NumCPU())

	var mainWindow *application.WebviewWindow

	fileService := &services.FileService{}
	copyService := services.NewCopyService(desktopRuntime)
	driveService := &services.DriveService{}
	syncService := services.NewSyncService(desktopRuntime)

	app := application.New(application.Options{
		Name:        identity.Name,
		Description: "Dual-pane folder sync file manager",
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: identity.InstanceID,
			OnSecondInstanceLaunch: func(data application.SecondInstanceData) {
				log.Printf("second instance blocked: args=%v cwd=%s", data.Args, data.WorkingDir)
				focusMainWindow(mainWindow)
			},
		},
		Services: []application.Service{
			application.NewService(fileService),
			application.NewService(copyService),
			application.NewService(driveService),
			application.NewService(syncService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	desktopRuntime.Events = func(name string, payload any) {
		app.Event.Emit(name, payload)
	}

	mainWindow = app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  identity.Name,
		Width:  1280,
		Height: 800,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(12, 14, 20),
		URL:              "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
