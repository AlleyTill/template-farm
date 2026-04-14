import { SessionBoot } from "./_components/session-boot";
import { SeedlingForm } from "./_components/seedling-form";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="farm-title text-2xl sm:text-4xl">
          🌱 Template Farm 🌾
        </h1>
        <p
          className="mt-4"
          style={{
            color: "var(--farm-wheat)",
            textShadow: "2px 2px 0 var(--farm-soil)",
          }}
        >
          Plant a seedling. Let the farmhand grow it into a real plan.
        </p>
      </header>

      <SessionBoot />
      <SeedlingForm />

      <footer
        className="text-center mt-4"
        style={{
          color: "var(--farm-wheat)",
          textShadow: "2px 2px 0 var(--farm-soil)",
        }}
      >
        <p className="text-xs">tend the soil · share the harvest</p>
      </footer>
    </main>
  );
}
