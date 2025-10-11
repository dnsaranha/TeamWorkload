import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_new_gantt(page: Page):
    """
    This script verifies that the new Gantt chart renders correctly.
    """
    # 1. Navigate to the app and wait for it to load.
    page.goto("http://localhost:5173/", wait_until="networkidle")
    expect(page.locator(".animate-spin")).to_be_hidden(timeout=20000)

    # 2. Handle authentication if needed.
    if page.get_by_role("heading", name="Fazer Login").is_visible():
        print("Authentication required. Registering and logging in...")
        import time
        email = f"testuser_{int(time.time())}@example.com"
        password = "password123"
        page.get_by_role("tab", name="Cadastro").click()
        page.get_by_label("Nome Completo").fill("Test User")
        page.get_by_label("Email").nth(1).fill(email)
        page.get_by_label("Senha").fill(password)
        page.get_by_label("Confirmar Senha").fill(password)
        page.get_by_role("button", name="Criar Conta").click()
        expect(page.get_by_text("Verifique seu email para confirmar a conta.")).to_be_visible(timeout=10000)
        page.get_by_role("tab", name="Login").click()
        page.get_by_label("Email").first.fill(email)
        page.get_by_label("Senha").first.fill(password)
        page.get_by_role("button", name="Entrar").click()

    # 3. Handle workspace creation.
    create_workspace_button = page.get_by_role("button", name="Create a new workspace")
    if create_workspace_button.is_visible():
        print("Creating a new workspace...")
        create_workspace_button.click()
        page.get_by_label("Workspace name").fill("Test Workspace")
        page.get_by_role("button", name="Save workspace").click()

    # 4. Navigate to the Gantt chart view.
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible(timeout=15000)
    gantt_button = page.get_by_role("button", name="Gantt")
    expect(gantt_button).to_be_visible()
    gantt_button.click()

    # 5. Verify that the new Gantt chart is visible.
    expect(page.get_by_text("Homepage Development")).to_be_visible()
    expect(page.get_by_text("Design homepage")).to_be_visible()

    # 6. Capture a screenshot for visual confirmation.
    page.screenshot(path="jules-scratch/verification/new_gantt_verification.png")
    print("Screenshot captured.")

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_new_gantt(page)
        browser.close()

if __name__ == "__main__":
    run_verification()