import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            print("Navigating to http://localhost:5173/")
            await page.goto("http://localhost:5173/", wait_until="networkidle")
            print("Page loaded. Waiting for 5 seconds...")
            await asyncio.sleep(5) # Wait for any async operations to settle
            print("Taking screenshot.")
            await page.screenshot(path="jules-scratch/verification/debug_screenshot.png")
            print("Screenshot saved to jules-scratch/verification/debug_screenshot.png")
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
