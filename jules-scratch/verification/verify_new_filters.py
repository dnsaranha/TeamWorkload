from playwright.sync_api import sync_playwright, Page, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})

    try:
        # Navigate to the application
        page.goto("http://localhost:5173/")
        time.sleep(5) # Wait for data to load

        page.screenshot(path="jules-scratch/verification/initial-load-debug.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
