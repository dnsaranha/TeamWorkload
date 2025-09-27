import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:5173/")

            # Verify Task Management page
            await page.get_by_role("button", name="Tasks").nth(1).click()
            await asyncio.sleep(2)  # Wait for the view to render
            await page.screenshot(path="jules-scratch/verification/task_management.png")

            # Verify Workload Calendar page
            await page.get_by_role("button", name="Home").nth(1).click()
            await asyncio.sleep(2)  # Wait for the view to render
            await page.screenshot(path="jules-scratch/verification/workload_calendar.png")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

asyncio.run(main())