import { _electron as electron, test, expect } from "@playwright/test";

// NOTE: Run `yarn build` before running this test to ensure dist-electron/main/index.js exists.
test("breadcrumb displays and navigates correctly in Electron", async () => {
    // Launch your Electron app from the built main process
    const electronApp = await electron.launch({
        args: ["dist-electron/main/index.js"],
    });

    // Get the first window
    const window = await electronApp.firstWindow();

    // Wait for the breadcrumb to appear
    await expect(window.getByText("Users")).toBeVisible();
    await expect(window.getByText("albert.li")).toBeVisible();

    // Click on a breadcrumb part and verify navigation
    await window.getByText("Users").click();

    // Add more assertions as needed

    // Close the app
    await electronApp.close();
});
