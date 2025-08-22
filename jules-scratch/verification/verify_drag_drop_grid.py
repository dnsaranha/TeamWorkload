import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_grid(page: Page):
    """
    Navigates to the task management page, opens the drag and drop grid,
    and takes a screenshot to verify date alignment.
    """
    # 1. Arrange: Go to the application's homepage.
    page.goto("http://localhost:5173/")

    # 2. Act: Navigate to the Drag & Drop Grid.

    # Wait for the network to be idle, which is a good sign the app has loaded.
    page.wait_for_load_state('networkidle')

    # Click on the "Tasks" button in the sidebar.
    page.get_by_role("button", name="Tasks").click()

    # Assert that the main heading is now "Task Management" to ensure the tab has loaded.
    expect(page.get_by_role("heading", name="Task Management")).to_be_visible()

    # Click on the "Drag & Drop Grid" button.
    page.get_by_role("button", name="Drag & Drop Grid").click()

    # 3. Assert: Wait for the dialog to be visible.
    dialog_header = page.get_by_role("heading", name="Drag & Drop Task Scheduler")
    expect(dialog_header).to_be_visible()

    # Verify the first day in the grid header is Monday.
    header_row = page.locator("div.grid.grid-cols-8.bg-gray-50")
    first_date_header = header_row.locator("div").nth(1)
    expect(first_date_header).to_contain_text("Mon")

    # 4. Screenshot: Capture the dialog content.
    dialog_content = page.locator("div[role='dialog']")
    dialog_content.screenshot(path="jules-scratch/verification/drag_drop_grid.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_grid(page)
        browser.close()

if __name__ == "__main__":
    main()
