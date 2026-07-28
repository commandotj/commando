package main

type appIdentity struct {
	Name       string
	BundleID   string
	InstanceID string
}

func identityForMode(production bool) appIdentity {
	if production {
		return appIdentity{
			Name:       "Commando",
			BundleID:   "me.systembug.commando",
			InstanceID: "me.systembug.commando",
		}
	}

	return appIdentity{
		Name:       "Commando Dev",
		BundleID:   "me.systembug.commando.dev",
		InstanceID: "me.systembug.commando.dev",
	}
}

func currentAppIdentity() appIdentity {
	return identityForMode(productionBuild)
}
