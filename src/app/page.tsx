import { SearchProvider } from "./_components/search-context";
import { SessionBoot } from "./_components/session-boot";
import { SearchForm } from "./_components/search-form";
import { AIToggle } from "./_components/ai-toggle";
import { AIWarning } from "./_components/ai-warning";
import { ResultsList } from "./_components/results-list";

export default function Home() {
  return (
    <SearchProvider>
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
            Describe your project. Harvest a fresh template from the community.
          </p>
        </header>

        <SessionBoot />
        <SearchForm />
        <AIToggle />
        <AIWarning />
        <ResultsList />

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
    </SearchProvider>
  );
}
