from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173/")

    # Click the "Roadmap" button in the sidebar
    roadmap_button = page.locator('button:has-text("Roadmap")')
    roadmap_button.click()

    # Wait for the page to load
    page.wait_for_selector('.roadmap-timeline', timeout=60000)

    # Find and click the "Legenda" button
    legenda_button = page.locator('button:has-text("Legenda")')
    legenda_button.click()

    # Wait for the popover to appear
    page.wait_for_selector('.bg-popover', timeout=60000)

    # Take a screenshot of the open popover
    page.screenshot(path="jules-scratch/verification/legend_popover_open.png")

    # Click the "Legenda" button again to close
    legenda_button.click()

    # Wait for the popover to disappear
    page.wait_for_timeout(500)

    # Take a screenshot of the closed state
    page.screenshot(path="jules-scratch/verification/legend_popover_closed.png")


    browser.close()

with sync_playwright() as playwright:
    run(playwright)
