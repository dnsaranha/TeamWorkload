import re
import time
from playwright.sync_api import sync_playwright, Page, expect

def run(page: Page):
    """
    This test verifies the unified workload calendar functionality:
    1. Navigates to the home page.
    2. Clicks on the "Unallocated" tab.
    3. Drags an unallocated task to a day in the calendar.
    4. Clicks on that day to open the expansion dialog.
    5. Verifies the task is in the dialog.
    6. Takes a screenshot.
    """
    # Add a delay to wait for the dev server to start
    time.sleep(10)

    # 1. Navigate to the home page.
    page.goto("http://localhost:5173/")

    try:
        # Wait for the main dashboard to be loaded
        dashboard_title = page.get_by_role("heading", name="Dashboard")
        expect(dashboard_title).to_be_visible()

        # 2. Click on the "Unallocated" tab.
        unallocated_tab = page.get_by_role("tab", name="Unallocated")
        expect(unallocated_tab).to_be_visible()
        unallocated_tab.click()

        # 3. Drag an unallocated task to a day in the calendar.
        #    Let's find a draggable task. We'll take the first one we find.
        draggable_task = page.locator(".cursor-move").first
        expect(draggable_task).to_be_visible()
        task_name_element = draggable_task.locator(".font-medium")
        expect(task_name_element).to_be_visible()
        task_name = task_name_element.inner_text()


        #    Then, find a drop zone (a day in the calendar).
        #    Let's target a specific day, for example, the 15th of the month.
        calendar_days = page.locator(".min-h-\\[120px\\]")
        day_to_drop = calendar_days.filter(has_text=re.compile(r"^15$"))

        # Check if day 15 is visible, if not, navigate to next month.
        if not day_to_drop.is_visible():
            page.get_by_title("Next month").click()
            page.wait_for_timeout(1000)

        expect(day_to_drop).to_be_visible()

        # Perform the drag and drop
        draggable_task.drag_to(day_to_drop)

        # Wait for the task to appear in the calendar cell
        expect(day_to_drop.get_by_text(task_name)).to_be_visible()

        # 4. Click on that day to open the expansion dialog.
        day_to_drop.click()

        # 5. Verifies the task is in the dialog.
        dialog = page.get_by_role("dialog")
        expect(dialog).to_be_visible()
        expect(dialog.get_by_text(task_name)).to_be_visible()

        # 6. Take a screenshot.
        page.screenshot(path="jules-scratch/verification/workload_calendar.png")
    except Exception as e:
        page.screenshot(path="jules-scratch/verification/debug_screenshot.png")
        raise e

def handle_console(msg):
    print(f"Browser console: {msg.text}")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.on("console", handle_console)
    run(page)
    browser.close()
