import { test, expect, type Page } from "@playwright/test";
async function addFlight(page: Page) {
  await page.goto("#/add");
  await page.getByLabel("Flight number", { exact: true }).fill("QA101");
  await page.getByLabel("Airline", { exact: true }).fill("QA Airline");
  await page.getByLabel("Departure airport", { exact: true }).fill("EVN");
  await page.getByRole("button", { name: /EVN.*Zvartnots/ }).click();
  await page.getByLabel("Arrival airport", { exact: true }).fill("LCA");
  await page.getByRole("button", { name: /LCA.*Larnaca/ }).click();
  await page
    .getByLabel("Scheduled departure", { exact: true })
    .fill("2025-01-03T00:00");
  await page
    .getByLabel("Scheduled arrival", { exact: true })
    .fill("2025-01-03T00:00");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Completed");
  await page.getByRole("button", { name: "Save flight", exact: true }).evaluate(el=>el.scrollIntoView({block:"center"}));
  await page.getByRole("button", { name: "Save flight", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "QA101", exact: true }),
  ).toBeVisible();
}
test("startup, navigation, mobile bounds and map initialization", async ({
  page,
}) => {
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "Your journeys" }),
  ).toBeVisible();
  await expect(page.getByText("A world of journeys ahead.")).toBeVisible();
  await page.screenshot({
    path: "test-results/home-iphone.png",
    fullPage: true,
  });
  for (const [tab, heading] of [
    ["Map", "The world below"],
    ["Airports", "Airports"],
    ["Passport", "FlyHrag Passport"],
    ["Settings", "Settings"],
    ["Home", "Your journeys"],
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: tab, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.goto("#/map");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  const nav = await page.getByRole("navigation").boundingBox();
  expect(nav!.y + nav!.height).toBeLessThanOrEqual(933);
  await page.screenshot({
    path: "test-results/mobile-home-map.png",
    fullPage: true,
  });
});
test("flight creation, editing, Passport and deletion", async ({ page }) => {
  await addFlight(page);
  await expect(page.getByText("2h 0m", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit flight", exact: true }).click();
  await page
    .getByLabel("Personal notes", { exact: true })
    .fill("My window seat");
  await page.getByRole("button", { name: "Save changes" }).evaluate(el=>el.scrollIntoView({block:"center"}));
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("My window seat", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Passport" })
    .click();
  await expect(
    page.getByRole("button", { name: "1 Completed flights" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /QA Airline.*QA101/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete flight" }).evaluate(el=>el.scrollIntoView({block:"center"}));
  await page.getByRole("button", { name: "Delete flight" }).click();
  await expect(page.getByText("A world of journeys ahead.")).toBeVisible();
});
test("airport search and favorite persists", async ({ page }) => {
  await page.goto("#/airports");
  await page.getByRole("textbox", { name: "Search airports" }).fill("Yerevan");
  await page.getByRole("button", { name: "Favorite EVN", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("Zvartnots International Airport · Armenia"),
  ).toBeVisible();
});
test("CSV import preview prevents duplicates and backup download works", async ({
  page,
}) => {
  await page.goto("#/import");
  await page
    .getByLabel("Import content · editable")
    .fill(
      "number,origin,destination,scheduledDeparture,scheduledArrival,status\nQA201,EVN,LCA,2025-01-02T20:00:00Z,2025-01-02T22:00:00Z,Completed\nQA201,EVN,LCA,2025-01-02T20:00:00Z,2025-01-02T22:00:00Z,Completed",
    );
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(
    page.getByText("1 new · 1 duplicates · 0 invalid"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(
    page.getByText("1 flights imported. 1 duplicates kept unchanged."),
  ).toBeVisible();
  await page.goto("#/export");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  expect((await download).suggestedFilename()).toMatch(/FlyHrag-backup.*json/);
});
test("production manifest, scope, service worker and offline saved views", async ({
  page,
  context,
  browserName,
}) => {
  await addFlight(page);
  const manifest = await page.request.get("manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const data = await manifest.json();
  expect(data.start_url).toBe("/FlyHrag/");
  expect(data.display).toBe("standalone");
  for (const icon of data.icons) {
    const response = await page.request.get(icon.src);
    expect(response.ok()).toBeTruthy();
  }
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(
      () =>
        page.evaluate(
          async () =>
            !!(await navigator.serviceWorker.getRegistration())?.active,
        ),
      { timeout: 30000 },
    )
    .toBeTruthy();
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBeTruthy();
  await page.goto("#/passport");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "FlyHrag Passport" }),
  ).toBeVisible();
  await expect(
    page.getByText("Offline · viewing saved information"),
  ).toBeVisible();
  await page.goto("#/airports");
  await page.getByRole("textbox", { name: "Search airports" }).fill("EVN");
  await expect(
    page.getByText("Zvartnots International Airport · Armenia"),
  ).toBeVisible();
  await context.setOffline(false);
});
