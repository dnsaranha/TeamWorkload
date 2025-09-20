from playwright.sync_api import Page, expect

def test_calendar_loads(page: Page):
    """
    This test verifies that the main page loads and the Workload Calendar is visible.
    """
    # The dev server runs on port 5173 by default for vite.
    page.goto("http://localhost:5173/")

    # Wait for the Workload Calendar to be visible.
    # I'll look for the title of the calendar component.
    calendar_title = page.get_by_text("Workload Calendar")
    expect(calendar_title).to_be_visible(timeout=10000) # Increased timeout to be safe

    # Take a screenshot to verify the page is not blank.
    page.screenshot(path="jules-scratch/verification/calendar_loads.png")
