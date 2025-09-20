import traceback
from playwright.sync_api import Page, expect

def test_super_debug(page: Page):
    """
    This test tries to navigate to the page and catches any errors.
    """
    try:
        page.goto("http://localhost:5173/", timeout=30000)
        page.screenshot(path="jules-scratch/verification/super_debug.png")
        print("Success: Page loaded and screenshot taken.")
    except Exception as e:
        print(f"Error during page.goto() or screenshot: {e}")
        print(traceback.format_exc())
