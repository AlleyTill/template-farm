import { TemplateForm } from "./template-form";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="text-center">
        <h1 className="farm-title text-2xl sm:text-4xl">🌱 Template Farm 🌾</h1>
        <p className="mt-4 text-white" style={{ textShadow: "2px 2px 0 #000" }}>
          Describe your project. Harvest a fresh template.
        </p>
      </header>

      <section className="nes-container is-rounded">
        <TemplateForm />
      </section>

      <footer className="text-center text-white" style={{ textShadow: "2px 2px 0 #000" }}>
        <p>tend the soil · share the harvest</p>
      </footer>
    </main>
  );
}
