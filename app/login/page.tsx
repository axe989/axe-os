import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-content">
          <h1 className="login-title">
            <span className="login-title-axe">AXE</span>
            <span className="login-title-os">OS</span>
          </h1>

          <p className="login-tagline">
            Операционная система AXE Engineering
          </p>

          <p className="login-description">
            Заказы, поставщики, логистика и финансовая
            эффективность в одном рабочем пространстве.
          </p>

          <div className="login-metrics">
            <div>
              <strong>Kaspi</strong>
              <span>Заказы и продажи</span>
            </div>

            <div>
              <strong>Supabase</strong>
              <span>Единая база данных</span>
            </div>

            <div>
              <strong>AXE OS</strong>
              <span>Контроль операций</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-logo">
            <span className="login-logo-icon">A</span>

            <div>
              <strong>AXE OS</strong>
              <span>Internal workspace</span>
            </div>
          </div>

          <div className="login-heading">
            <h2>Добро пожаловать</h2>

            <p>
              Войдите под учетной записью сотрудника
              AXE Engineering.
            </p>
          </div>

          <LoginForm />

          <p className="login-security">
            Доступ разрешен только авторизованным сотрудникам.
          </p>
        </div>
      </section>
    </main>
  );
}
