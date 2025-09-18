from playwright.sync_api import sync_playwright, Page, expect
import time

def run_verification(page: Page):
    """
    Navigates through the app to verify the fixes and new features.
    """
    # Go to the app
    page.goto("http://localhost:5173/")

    # Wait for a long time to see if the page loads
    time.sleep(15)

    page.screenshot(path="jules-scratch/verification/debug_initial_load.png")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()
