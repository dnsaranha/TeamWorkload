from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173/")

    # Wait for a few seconds to let the page load
    page.wait_for_timeout(5000)

    # Click the "Roadmap" button in the sidebar
    roadmap_button = page.locator('button:has-text("Roadmap")')
    roadmap_button.click()

    # Wait for the page to load
    page.wait_for_selector('.roadmap-timeline', timeout=60000)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/roadmap_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
