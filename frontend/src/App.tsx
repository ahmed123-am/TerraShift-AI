
import { useCallback, useEffect, useState } from "react";

import MainLayout from "./components/layout/MainLayout";
import AddFarmModal from "./components/dashboard/AddFarmModal";

import Dashboard from "./pages/Dashboard";
import FarmExplorer from "./pages/FarmExplorer";
import CropRotation from "./pages/CropRotation";
import WaterWise from "./pages/WaterWise";
import SoilGuardian from "./pages/SoilGuardian";
import ClimateIntelligence from "./pages/ClimateIntelligence";
import DigitalTwin from "./pages/DigitalTwin";
import AIFarmAdvisor from "./pages/AIFarmAdvisor";
import SatelliteIntelligence from "./pages/SatelliteIntelligence";
import CropHealthAlerts from "./pages/CropHealthAlerts";

import { getFarms, createFarm } from "./services/farms";
import type { Farm, CreateFarmData } from "./services/farms";

import "./styles/variables.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/responsive.css";

type Language = "ar" | "en";

type Page =
  | "dashboard"
  | "farm"
  | "rotation"
  | "waterwise"
  | "soilguardian"
  | "climate"
  | "digital-twin"
  | "ai-advisor"
  | "satellite"
  | "crop-health";

const VALID_PAGES = new Set<Page>([
  "dashboard",
  "farm",
  "rotation",
  "waterwise",
  "soilguardian",
  "climate",
  "digital-twin",
  "ai-advisor",
  "satellite",
  "crop-health",
]);

function isPage(value: string): value is Page {
  return VALID_PAGES.has(value as Page);
}

export default function App() {
  const [language, setLanguage] = useState<Language>("ar");
  const [darkMode, setDarkMode] = useState(false);
  const [activePage, setActivePage] = useState<Page>("dashboard");

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [farmsError, setFarmsError] = useState("");

  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState(false);
  const [isSavingFarm, setIsSavingFarm] = useState(false);

  const loadFarms = useCallback(async () => {
    try {
      setFarmsError("");
      setLoadingFarms(true);

      const data = await getFarms();
      setFarms(data);
    } catch (error) {
      console.error("Failed to load farms:", error);

      setFarmsError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر تحميل المزارع."
            : "Failed to load farms."
      );
    } finally {
      setLoadingFarms(false);
    }
  }, [language]);

  useEffect(() => {
    void loadFarms();
  }, [loadFarms]);

  function handleToggleLanguage() {
    setLanguage((previous) => (previous === "ar" ? "en" : "ar"));
  }

  function handleToggleTheme() {
    setDarkMode((previous) => !previous);
  }

  const handleNavigate = useCallback(
    (page: string) => {
      const target = page.trim();

      if (!isPage(target)) {
        console.error(
          `[TerraShift] Unknown page navigation target: "${page}"`
        );
        return;
      }

      console.info(
        `[TerraShift] Navigating: ${activePage} -> ${target}`
      );

      setActivePage(target);
    },
    [activePage]
  );

  async function handleCreateFarm(
    data: CreateFarmData
  ): Promise<void> {
    try {
      setIsSavingFarm(true);

      const newFarm = await createFarm(data);

      setFarms((previous) => {
        const alreadyExists = previous.some(
          (farm) => farm.id === newFarm.id
        );

        if (alreadyExists) {
          return previous.map((farm) =>
            farm.id === newFarm.id ? newFarm : farm
          );
        }

        return [...previous, newFarm];
      });

      setIsAddFarmModalOpen(false);
      setFarmsError("");
    } finally {
      setIsSavingFarm(false);
    }
  }

  function handleFarmsChange(updatedFarms: Farm[]) {
    setFarms(updatedFarms);
  }

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return (
          <>
            {farmsError && (
              <div className="app-error-message" role="alert">
                <span>{farmsError}</span>
                <button type="button" onClick={() => void loadFarms()}>
                  {language === "ar" ? "إعادة المحاولة" : "Retry"}
                </button>
              </div>
            )}

            <Dashboard
              language={language}
              farms={farms}
              loadingFarms={loadingFarms}
              onAddFarm={() => setIsAddFarmModalOpen(true)}
              onChooseLocation={() => handleNavigate("farm")}
              onCreatePlan={() => handleNavigate("rotation")}
            />
          </>
        );

      case "farm":
        return (
          <>
            {farmsError && (
              <div className="app-error-message" role="alert">
                <span>{farmsError}</span>
                <button type="button" onClick={() => void loadFarms()}>
                  {language === "ar" ? "إعادة المحاولة" : "Retry"}
                </button>
              </div>
            )}

            <FarmExplorer
              language={language}
              onBack={() => handleNavigate("dashboard")}
              onFarmsChange={handleFarmsChange}
            />
          </>
        );

      case "rotation":
        return (
          <CropRotation
            language={language}
            onBack={() => handleNavigate("dashboard")}
          />
        );

      case "waterwise":
        return (
          <WaterWise
            language={language}
            onBack={() => handleNavigate("dashboard")}
          />
        );

      case "soilguardian":
        return (
          <SoilGuardian
            language={language}
            onBack={() => handleNavigate("dashboard")}
          />
        );

      case "climate":
        return (
          <ClimateIntelligence
            language={language}
            onBack={() => handleNavigate("dashboard")}
          />
        );

      case "digital-twin":
        return (
          <DigitalTwin
            language={language}
            onBack={() => handleNavigate("dashboard")}
          />
        );

      case "ai-advisor":
        return (
          <AIFarmAdvisor
            language={language}
            farms={farms}
            onBack={() => handleNavigate("dashboard")}
          />
        );

      case "satellite":
        return (
          <SatelliteIntelligence
            language={language}
            farms={farms}
            onBack={() => handleNavigate("dashboard")}
          />
        );

      case "crop-health":
        return <CropHealthAlerts language={language} />;

      default:
        return (
          <div className="app-error-message" role="alert">
            {language === "ar"
              ? "الصفحة المطلوبة غير موجودة."
              : "The requested page was not found."}

            <button
              type="button"
              onClick={() => handleNavigate("dashboard")}
            >
              {language === "ar" ? "العودة للرئيسية" : "Back to dashboard"}
            </button>
          </div>
        );
    }
  }

  return (
    <MainLayout
      language={language}
      darkMode={darkMode}
      activePage={activePage}
      onNavigate={handleNavigate}
      onToggleLanguage={handleToggleLanguage}
      onToggleTheme={handleToggleTheme}
    >
      <div className="app-page-content">{renderPage()}</div>

      {isAddFarmModalOpen && (
        <AddFarmModal
          language={language}
          onClose={() => {
            if (!isSavingFarm) {
              setIsAddFarmModalOpen(false);
            }
          }}
          onSubmit={handleCreateFarm}
          isSaving={isSavingFarm}
        />
      )}
    </MainLayout>
  );
}
