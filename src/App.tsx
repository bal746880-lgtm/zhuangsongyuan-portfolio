import { LightboxProvider } from "./components/media/Lightbox";
import { Navigation } from "./components/navigation/Navigation";
import { AboutSection } from "./components/sections/AboutSection";
import { ContactSection } from "./components/sections/ContactSection";
import { DroneSection } from "./components/sections/DroneSection";
import { EnvironmentStillsSection } from "./components/sections/EnvironmentStillsSection";
import { HeroSection } from "./components/sections/HeroSection";
import { LayoutSection } from "./components/sections/LayoutSection";
import { MaterialsSection } from "./components/sections/MaterialsSection";
import { ModularSection } from "./components/sections/ModularSection";
import { OverviewSection } from "./components/sections/OverviewSection";
import { PcgSection } from "./components/sections/PcgSection";
import { SelectedStillsSection } from "./components/sections/SelectedStillsSection";
import { VegetationSection } from "./components/sections/VegetationSection";
import { WalkthroughSection } from "./components/sections/WalkthroughSection";
import { chapterFolderNames, getChapter } from "./data/media";
import { usePortfolioManifest } from "./hooks/usePortfolioManifest";
import { useRevealOnScroll } from "./hooks/useRevealOnScroll";

function LoadingState() {
  return (
    <main className="loading-state">
      <p className="eyebrow">XIFO TEMPLE</p>
      <h1>正在读取作品集素材</h1>
      <div className="loading-state__line" aria-hidden="true" />
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="loading-state loading-state--error">
      <p className="eyebrow">MEDIA MANIFEST</p>
      <h1>素材暂时无法读取</h1>
      <p>{message}</p>
      <p>请运行 npm run dev，项目会先同步桌面作品集素材。</p>
    </main>
  );
}

export default function App() {
  const { manifest, error } = usePortfolioManifest();
  useRevealOnScroll(Boolean(manifest && !error));

  if (error) return <ErrorState message={error} />;
  if (!manifest) return <LoadingState />;

  return (
    <LightboxProvider>
      <Navigation />
      <main>
        <HeroSection media={getChapter(manifest, chapterFolderNames.hero)} />
        <AboutSection
          media={getChapter(manifest, chapterFolderNames.profile)}
        />
        <SelectedStillsSection
          media={getChapter(manifest, chapterFolderNames.selectedStills)}
        />
        <DroneSection media={getChapter(manifest, chapterFolderNames.drone)} />
        <OverviewSection
          media={getChapter(manifest, chapterFolderNames.overview)}
        />
        <LayoutSection media={getChapter(manifest, chapterFolderNames.layout)} />
        <ModularSection media={getChapter(manifest, chapterFolderNames.modular)} />
        <MaterialsSection
          media={getChapter(manifest, chapterFolderNames.materials)}
          nodeMedia={getChapter(manifest, chapterFolderNames.sdNodes)}
        />
        <VegetationSection
          media={getChapter(manifest, chapterFolderNames.vegetation)}
        />
        <PcgSection media={getChapter(manifest, chapterFolderNames.pcg)} />
        <EnvironmentStillsSection
          media={getChapter(manifest, chapterFolderNames.environmentStills)}
        />
        <WalkthroughSection
          media={getChapter(manifest, chapterFolderNames.walkthrough)}
        />
        <ContactSection />
      </main>
    </LightboxProvider>
  );
}
