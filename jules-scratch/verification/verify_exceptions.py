import asyncio
import re
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            page.set_default_timeout(35000)

            await page.goto("http://localhost:5173/")

            # Wait for the main dashboard to load
            await expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()
            print("Page loaded, dashboard is visible.")

            # Click the 'Tasks' tab in the sidebar to make the component visible
            await page.get_by_role("button", name="Tasks").click()
            print("Clicked 'Tasks' sidebar button.")

            # Wait for the Task Management content to be loaded
            await expect(page.get_by_role("heading", name="Task Management")).to_be_visible()
            await expect(page.get_by_role("table")).to_be_visible()
            print("Task Management view is visible.")

            # 1. Create a new recurring task
            create_task_button = page.get_by_role("button", name="Create New Task")
            await expect(create_task_button).to_be_enabled()
            await create_task_button.click()
            print("Clicked 'Create New Task' button.")

            create_dialog = page.get_by_role("dialog", name="Create New Task")
            await expect(create_dialog).to_be_visible()
            print("Create task dialog is visible.")

            await create_dialog.get_by_label('Task Name').fill("Test Recurring Task for Exceptions")
            await create_dialog.get_by_label('Description').fill("A task to test exception handling.")
            await create_dialog.get_by_label('Start Date').fill("2025-09-22")
            await create_dialog.get_by_label('End Date').fill("2025-10-12")
            await create_dialog.get_by_label('Esta tarefa se repete semanalmente').check()
            await create_dialog.get_by_label('Segunda').check()
            await create_dialog.get_by_label('Quarta').check()
            await create_dialog.get_by_label('Sexta').check()
            await create_dialog.get_by_label('Horas por Dia').fill("3")
            print("Filled out new task form.")

            await create_dialog.get_by_role("button", name="Create Task").click()
            print("Submitted new task form.")

            await expect(create_dialog).not_to_be_visible()
            print("Create task dialog closed.")

            # 2. Find the task and open the edit dialog
            task_row = page.get_by_role("row", name=re.compile("Test Recurring Task for Exceptions"))
            await expect(task_row).to_be_visible()
            await task_row.get_by_role("button").filter(has=page.locator("svg.lucide-edit")).click()
            print("Clicked edit button on the new task.")

            edit_dialog = page.get_by_role("dialog", name="Edit Task")
            await expect(edit_dialog).to_be_visible()
            print("Edit task dialog is visible.")

            # 3. Interact with the exception management UI
            await expect(edit_dialog.get_by_text("Seg, 22/09/2025")).to_be_visible()

            first_occurrence = edit_dialog.get_by_text("Seg, 22/09/2025").locator("..").locator("..")
            second_occurrence = edit_dialog.get_by_text("Qua, 24/09/2025").locator("..").locator("..")
            third_occurrence = edit_dialog.get_by_text("Sex, 26/09/2025").locator("..").locator("..")

            await first_occurrence.get_by_label("Horas").fill("5")
            print("Changed hours for first occurrence.")

            await second_occurrence.get_by_role("combobox").click()
            await page.get_by_role("option", name="Jane Smith").click()
            print("Changed assignee for second occurrence.")

            await third_occurrence.get_by_role("button").filter(has=page.locator("svg.lucide-trash-2")).click()
            print("Removed third occurrence.")

            await page.screenshot(path="jules-scratch/verification/01_exceptions_dialog_before_save.png")
            print("Took first screenshot.")

            await edit_dialog.get_by_role("button", name="Update Task").click()
            print("Clicked 'Update Task'.")
            await expect(edit_dialog).not_to_be_visible()
            print("Edit dialog closed.")

            # 5. Re-open the dialog and verify persistence
            await expect(task_row).to_be_visible()
            await task_row.get_by_role("button").filter(has=page.locator("svg.lucide-edit")).click()
            print("Re-opened edit dialog.")

            await expect(edit_dialog).to_be_visible()
            await expect(edit_dialog.get_by_text("Seg, 22/09/2025")).to_be_visible()
            print("Verified dialog is open again.")

            await expect(first_occurrence.get_by_label("Horas")).to_have_value("5")
            await expect(second_occurrence.get_by_role("combobox")).to_have_text("Jane Smith")
            await expect(third_occurrence).to_have_class(re.compile(r"bg-red-50"))
            print("Assertions passed.")

            await page.screenshot(path="jules-scratch/verification/verification.png")
            print("Took final screenshot.")

            print("Verification script ran successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
