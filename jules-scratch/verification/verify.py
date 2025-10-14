from playwright.sync_api import sync_playwright, Page, expect
import time

def test_gantt_chart_updates(page: Page):
    """
    This test verifies that the Gantt chart updates correctly.
    """
    try:
        # Listen for console events and log them
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text()}"))

        print("Navigating to the application...")
        page.goto("http://localhost:4173")
        page.wait_for_load_state("networkidle")
        print("Navigation successful.")
        page.screenshot(path="jules-scratch/verification/initial.png")

        print("Waiting for login form...")
        page.wait_for_selector('form')
        print("Login form found.")
        page.screenshot(path="jules-scratch/verification/login-form.png")


        print("Logging in...")
        page.get_by_label("Email").fill("dns.aranha@gmail.com")
        page.get_by_label("Password").fill("d4e8s2")
        page.get_by_role("button", name="Log in").click()
        page.wait_for_load_state("networkidle")
        print("Login successful.")
        page.screenshot(path="jules-scratch/verification/login.png")

        print("Navigating to the Gantt chart page...")
        # Use a more robust selector
        page.locator('button:has-text("Gantt")').click()
        time.sleep(2) # Wait for navigation
        page.wait_for_load_state("networkidle")
        print("Navigation to Gantt chart page successful.")
        page.screenshot(path="jules-scratch/verification/gantt-page.png")


        print("Checking for Gantt chart visibility...")
        expect(page.get_by_text("Gantt Chart")).to_be_visible()
        print("Gantt chart is visible.")

        print("Taking screenshot of the Gantt chart...")
        page.screenshot(path="jules-scratch/verification/gantt-chart.png")
        print("Screenshot of Gantt chart taken.")

        print("Double clicking on a task...")
        # Use a more robust selector
        page.locator('.task-list-item:has-text("Task 1")').first.dblclick()
        time.sleep(2) # Wait for modal
        print("Double click successful.")

        print("Checking for edit modal visibility...")
        expect(page.get_by_role("dialog", name="Edit Task")).to_be_visible()
        print("Edit modal is visible.")

        print("Taking screenshot of the edit modal...")
        page.screenshot(path="jules-scratch/verification/edit-task-modal.png")
        print("Screenshot of edit modal taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    test_gantt_chart_updates(page)
    browser.close()