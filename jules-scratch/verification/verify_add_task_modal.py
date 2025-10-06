import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_add_task_modal(page: Page):
    """
    This script verifies that clicking the '+' button in the Gantt chart
    opens the 'Nova Tarefa' modal. It handles authentication and workspace creation.
    """
    # 1. Navigate to the app and wait for it to load.
    page.goto("http://localhost:5173/", wait_until="networkidle")
    expect(page.locator(".animate-spin")).to_be_hidden(timeout=15000)

    # 2. Check if authentication is needed.
    if page.get_by_role("heading", name="Fazer Login").is_visible():
        print("Authentication required. Logging in...")
        # Use a unique email for registration to avoid conflicts
        import time
        email = f"testuser_{int(time.time())}@example.com"
        password = "password123"

        # Register a new user
        page.get_by_role("tab", name="Cadastro").click()
        page.get_by_label("Nome Completo").fill("Test User")
        page.get_by_label("Email").nth(1).fill(email)
        page.get_by_label("Senha").fill(password)
        page.get_by_label("Confirmar Senha").fill(password)
        page.get_by_role("button", name="Criar Conta").click()
        expect(page.get_by_text("Verifique seu email para confirmar a conta.")).to_be_visible(timeout=10000)

        # Log in with the new user
        page.get_by_role("tab", name="Login").click()
        page.get_by_label("Email").first.fill(email)
        page.get_by_label("Senha").first.fill(password)
        page.get_by_role("button", name="Entrar").click()

    # 3. Handle workspace creation.
    # After login, the app may ask to create a workspace or show the dashboard.
    create_workspace_button = page.get_by_role("button", name="Create a new workspace")
    if create_workspace_button.is_visible():
        print("Creating a new workspace...")
        create_workspace_button.click()
        page.get_by_label("Workspace name").fill("Test Workspace")
        page.get_by_role("button", name="Save workspace").click()
        # Wait for the dashboard to load after creating the workspace
        expect(page.get_by_text("Projects")).to_be_visible(timeout=10000)
    else:
        print("Workspace already exists or was not needed.")

    # 4. Wait for the main dashboard to load, then navigate to Gantt.
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible(timeout=15000)

    gantt_button = page.get_by_role("button", name="Gantt")
    expect(gantt_button).to_be_visible()
    gantt_button.click()

    # 5. Wait for the Gantt chart to load and click the "+" button.
    expect(page.get_by_role("heading", name="Gráfico de Gantt")).to_be_visible()
    gantt_container = page.locator(".gantt_task_grid")
    expect(gantt_container).to_be_visible(timeout=20000)

    add_button = page.locator(".gantt_add").first
    expect(add_button).to_be_visible()
    add_button.click()

    # 3. Assert that the "Nova Tarefa" modal appears by checking its title.
    modal_title = page.get_by_role("heading", name="Nova Tarefa")
    expect(modal_title).to_be_visible()

    # 4. Take a screenshot for visual confirmation.
    page.screenshot(path="jules-scratch/verification/add_task_modal_verification.png")

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_add_task_modal(page)
        browser.close()

if __name__ == "__main__":
    run_verification()