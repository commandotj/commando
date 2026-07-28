package main

import "testing"

func TestFocusMainWindowNilSafe(t *testing.T) {
	t.Helper()
	focusMainWindow(nil)
}

func TestIdentityForModeProduction(t *testing.T) {
	got := identityForMode(true)
	want := appIdentity{
		Name:       "Commando",
		BundleID:   "me.systembug.commando",
		InstanceID: "me.systembug.commando",
	}

	if got != want {
		t.Fatalf("identityForMode(true) = %#v, want %#v", got, want)
	}
}

func TestIdentityForModeDevelopment(t *testing.T) {
	got := identityForMode(false)
	want := appIdentity{
		Name:       "Commando Dev",
		BundleID:   "me.systembug.commando.dev",
		InstanceID: "me.systembug.commando.dev",
	}

	if got != want {
		t.Fatalf("identityForMode(false) = %#v, want %#v", got, want)
	}
}
