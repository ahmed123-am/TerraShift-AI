import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type MainLayoutProps = {
  children: ReactNode;
  language: "ar" | "en";
  darkMode: boolean;
  activePage: string;
  onNavigate: (page: string) => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
};

export default function MainLayout({
  children,
  language,
  darkMode,
  activePage,
  onNavigate,
  onToggleLanguage,
  onToggleTheme,
}: MainLayoutProps) {
  return (
    <div
      className={`app ${darkMode ? "dark" : "light"}`}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <Sidebar
        language={language}
        activePage={activePage}
        onNavigate={onNavigate}
      />

      <main className="main-content">
        <Topbar
          language={language}
          darkMode={darkMode}
          onToggleLanguage={onToggleLanguage}
          onToggleTheme={onToggleTheme}
        />

        {children}
      </main>
    </div>
  );
}