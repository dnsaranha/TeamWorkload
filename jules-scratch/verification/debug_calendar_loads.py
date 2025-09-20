from playwright.sync_api import Page, expect

def test_debug_calendar_loads(page: Page):
    """
    This test navigates to the main page and takes a screenshot for debugging purposes.
    """
    # The dev server runs on port 5173 by default for vite.
    page.goto("http://localhost:5173/", timeout=20000) # Increased timeout for page load

    # Take a screenshot immediately to see the initial state.
    page.screenshot(path="jules-scratch/verification/debug_calendar.png")

    # For debugging, let's also try to get the page content.
    # This won't be visible to me, but it's a good practice.
    print(page.content())

    # Now, let's try the original logic again to see if it passes.
    calendar_title = page.get_by_text("Workload Calendar")
    expect(calendar_title).to_be_visible(timeout=10000)

    page.screenshot(path="jules-scratch/verification/calendar_loads.png")
