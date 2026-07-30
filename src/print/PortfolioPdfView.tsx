import {
  type CSSProperties,
  useEffect,
} from "react";
import {
  aboutParagraphs,
  awards,
  careerPath,
  profileFacts,
} from "../data/experience";
import type {
  MediaFile,
  MediaFolder,
  PortfolioManifest,
} from "../data/media";
import {
  chapterFolderNames,
  getChapter,
} from "../data/media";
import {
  overviewParagraphs,
  pcgLabels,
  projectFacts,
  responsibilities,
  sectionCopy,
  software,
  vegetationSteps,
} from "../data/portfolio";
import { imageTitle, imagesIn } from "../utils/mediaHelpers";
import { sortByLeadingNumber } from "../utils/mediaSort";
import "./portfolio-pdf.css";

declare global {
  interface Window {
    __PORTFOLIO_PDF_READY__?: boolean;
    __PORTFOLIO_PDF_ERRORS__?: string[];
    __PORTFOLIO_PDF_IMAGE_COUNT__?: number;
  }
}

interface PortfolioPdfViewProps {
  manifest: PortfolioManifest;
}

interface PdfImageSource {
  src: string;
  width: number;
  height: number;
}

interface PdfMediaGroupProps {
  files: readonly MediaFile[];
  altPrefix: string;
  caption: string | ((file: MediaFile, index: number) => string);
  title?: (file: MediaFile, index: number) => string;
  layout?: "stack" | "two" | "three";
  emailMode: boolean;
  className?: string;
}

interface PdfSectionHeaderProps {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
}

type PdfImageStyle = CSSProperties & {
  "--pdf-source-width": string;
};

const contactItems = [
  ["姓名", "庄松源"],
  ["微信", "18371378303"],
  ["电话", "18371378303"],
  ["邮箱", "1815258404@qq.com"],
] as const;

function visibleImages(folder?: MediaFolder): MediaFile[] {
  return imagesIn(folder).filter((file) => file.isDisplayed !== false);
}

function selectPdfSource(
  file: MediaFile,
  emailMode: boolean,
): PdfImageSource {
  const highQualityEmail =
    new URLSearchParams(window.location.search).get(
      "emailHighQuality",
    ) === "1";
  const variants = [...(file.displayVariants ?? [])].sort(
    (left, right) => left.width - right.width,
  );

  if (emailMode && !highQualityEmail && variants.length) {
    const preferred =
      variants.filter((variant) => variant.width <= 1600).at(-1) ??
      variants[0];
    return {
      src: preferred.src,
      width: preferred.width,
      height: preferred.height,
    };
  }

  return {
    src:
      file.lightboxSrc ??
      variants.at(-1)?.src ??
      file.src ??
      file.url,
    width:
      file.lightboxWidth ??
      variants.at(-1)?.width ??
      file.width ??
      1,
    height:
      file.lightboxHeight ??
      variants.at(-1)?.height ??
      file.height ??
      1,
  };
}

function chunkFiles(
  files: readonly MediaFile[],
  size: number,
): MediaFile[][] {
  const chunks: MediaFile[][] = [];
  for (let index = 0; index < files.length; index += size) {
    chunks.push(files.slice(index, index + size));
  }
  return chunks;
}

function PdfSectionHeader({
  index,
  eyebrow,
  title,
  description,
}: PdfSectionHeaderProps) {
  return (
    <header className="pdf-section-header">
      <span className="pdf-section-header__index" aria-hidden="true">
        {index}
      </span>
      <div>
        <p className="pdf-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </header>
  );
}

function PdfSubheading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="pdf-subheading">
      <p className="pdf-eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

function PdfImage({
  file,
  alt,
  emailMode,
}: {
  file: MediaFile;
  alt: string;
  emailMode: boolean;
}) {
  const source = selectPdfSource(file, emailMode);
  const style: PdfImageStyle = {
    "--pdf-source-width": `${source.width}px`,
  };

  return (
    <img
      src={source.src}
      alt={alt}
      width={source.width}
      height={source.height}
      loading="eager"
      decoding="sync"
      data-pdf-source={source.src}
      data-original-path={file.originalPath}
      data-image-category={file.imageCategory ?? "A"}
      data-section-id={file.sectionId ?? "unknown"}
      data-lossless-source={file.losslessPath ?? undefined}
      style={style}
    />
  );
}

function PdfMediaCard({
  file,
  alt,
  title,
  caption,
  emailMode,
}: {
  file: MediaFile;
  alt: string;
  title: string;
  caption: string;
  emailMode: boolean;
}) {
  return (
    <figure
      className={`pdf-media-card ${
        file.imageCategory === "C" ? "pdf-media-card--technical" : ""
      }`}
      data-original-path={file.originalPath}
    >
      <div className="pdf-media-card__frame">
        <PdfImage file={file} alt={alt} emailMode={emailMode} />
      </div>
      <figcaption>
        <span>{title}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

function PdfMediaGroup({
  files,
  altPrefix,
  caption,
  title,
  layout = "stack",
  emailMode,
  className = "",
}: PdfMediaGroupProps) {
  if (!files.length) return null;

  const columns = layout === "three" ? 3 : layout === "two" ? 2 : 1;
  const rows = chunkFiles(files, columns);

  return (
    <div className={`pdf-media-group pdf-media-group--${layout} ${className}`}>
      {rows.map((row, rowIndex) => (
        <div
          className={`pdf-media-row pdf-media-row--${row.length}`}
          key={`${row[0].relativePath}-${rowIndex}`}
        >
          {row.map((file, index) => {
            const absoluteIndex = rowIndex * columns + index;
            const itemTitle =
              title?.(file, absoluteIndex) ??
              imageTitle(file, absoluteIndex);
            const itemCaption =
              typeof caption === "function"
                ? caption(file, absoluteIndex)
                : caption;

            return (
              <PdfMediaCard
                key={`${file.relativePath}-${file.name}`}
                file={file}
                alt={`${altPrefix}${itemTitle}`}
                title={itemTitle}
                caption={itemCaption}
                emailMode={emailMode}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function PdfHero({
  image,
  emailMode,
}: {
  image?: MediaFile;
  emailMode: boolean;
}) {
  return (
    <section className="pdf-cover" aria-label="西福寺项目主视觉">
      {image ? (
        <PdfImage
          file={image}
          alt="西福寺项目主视觉"
          emailMode={emailMode}
        />
      ) : null}
    </section>
  );
}

function PdfAbout({
  portrait,
  emailMode,
}: {
  portrait?: MediaFile;
  emailMode: boolean;
}) {
  return (
    <section className="pdf-section pdf-about">
      <PdfSectionHeader
        index="02"
        eyebrow="ABOUT & EXPERIENCE"
        title="个人介绍与经历"
        description="从视觉设计与硬科技创业实践，转向游戏地编与实时环境制作。"
      />

      <div className="pdf-about__overview">
        <aside>
          {portrait ? (
            <figure className="pdf-about__portrait">
              <PdfImage
                file={portrait}
                alt="庄松源个人照片"
                emailMode={emailMode}
              />
            </figure>
          ) : null}
          <div className="pdf-about__role">
            <strong>游戏地编 · 环境美术</strong>
            <span>Level Artist · Environment Artist</span>
          </div>
        </aside>

        <div>
          <div className="pdf-about__bio">
            {aboutParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <dl className="pdf-fact-grid pdf-fact-grid--profile">
            {profileFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <section className="pdf-career">
        <PdfSubheading eyebrow="CAREER PATH" title="经历路径" />
        <div className="pdf-career__grid">
          {careerPath.map((entry, index) => (
            <article key={entry.time}>
              <time>{entry.time}</time>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h4>{entry.title}</h4>
              <strong>{entry.subtitle}</strong>
              <p>{entry.description}</p>
              <ul>
                {entry.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              {index === 0 ? (
                <div className="pdf-career__awards">
                  <p>主要奖项</p>
                  <ul>
                    {awards.map((award) => (
                      <li key={award}>{award}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function PdfSelectedStills({
  files,
  emailMode,
}: {
  files: readonly MediaFile[];
  emailMode: boolean;
}) {
  return (
    <section className="pdf-section">
      <PdfSectionHeader
        index="03"
        eyebrow="KEY STILLS"
        title="主要静帧"
        description="集中展示最终场景中的核心构图、空间层级与氛围表现。"
      />
      <PdfMediaGroup
        files={files}
        altPrefix="西福寺精选静帧："
        caption={(file) =>
          (file.sortValue ?? 0) <= 3
            ? "最终场景核心静帧。"
            : "最终场景补充静帧。"
        }
        title={(file) =>
          `图 ${String(file.sortValue ?? 0).padStart(2, "0")}`
        }
        emailMode={emailMode}
      />
    </section>
  );
}

function PdfOverview({
  files,
  emailMode,
}: {
  files: readonly MediaFile[];
  emailMode: boolean;
}) {
  return (
    <section className="pdf-section">
      <PdfSectionHeader
        index="04"
        eyebrow="PROJECT OVERVIEW"
        title="项目概览与个人职责"
      />

      <div className="pdf-overview">
        <div className="pdf-overview__copy">
          {overviewParagraphs.map((paragraph) => (
            <p key={paragraph.lead}>
              <strong>{paragraph.lead}</strong>
              <span>{paragraph.body}</span>
            </p>
          ))}
        </div>
        <dl className="pdf-fact-grid">
          {projectFacts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="pdf-subsection">
        <PdfSubheading
          eyebrow="CONCEPT REFERENCES"
          title="概念参考"
          description="两张图片用于场景关系、空间层次与秋季氛围参考。"
        />
        <PdfMediaGroup
          files={files}
          altPrefix="西福寺项目概念参考："
          caption="概念原画中的空间关系、层次与氛围参考。"
          layout="two"
          emailMode={emailMode}
        />
      </div>

      <div className="pdf-overview__lists">
        <div>
          <PdfSubheading eyebrow="RESPONSIBILITIES" title="主要职责" />
          <ul>
            {responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <PdfSubheading eyebrow="SOFTWARE" title="使用软件" />
          <ul>
            {software.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PdfSimpleSection({
  index,
  eyebrow,
  title,
  description,
  files,
  altPrefix,
  caption,
  emailMode,
  className = "",
}: {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  files: readonly MediaFile[];
  altPrefix: string;
  caption: string;
  emailMode: boolean;
  className?: string;
}) {
  return (
    <section className={`pdf-section ${className}`}>
      <PdfSectionHeader
        index={index}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <PdfMediaGroup
        files={files}
        altPrefix={altPrefix}
        caption={caption}
        emailMode={emailMode}
      />
    </section>
  );
}

function PdfVegetationShowcase({
  rootImages,
  emailMode,
}: {
  rootImages: readonly MediaFile[];
  emailMode: boolean;
}) {
  const assets = rootImages.filter(
    (image) => image.sortValue !== null && image.sortValue <= 2,
  );
  const scenes = rootImages.filter(
    (image) =>
      image.sortValue !== null &&
      image.sortValue > 2 &&
      image.sortValue !== 7,
  );

  return (
    <section className="pdf-section">
      <PdfSectionHeader
        index="09"
        eyebrow="VEGETATION ASSET SHOWCASE"
        title="植被资产陈列"
        description="展示植被资产在最终环境中的层次、受光与单独陈列效果。"
      />

      <PdfSubheading
        eyebrow="IN-ENGINE RESULT"
        title="最终场景中的植被"
      />
      <PdfMediaGroup
        files={scenes}
        altPrefix="植被最终场景："
        caption="植被资产在最终环境中的层次与受光表现。"
        title={(_, index) => `图 ${String(index + 1).padStart(2, "0")}`}
        emailMode={emailMode}
      />

      <div className="pdf-subsection">
        <PdfSubheading eyebrow="ASSET SHOWCASE" title="植被资产单独陈列" />
        <PdfMediaGroup
          files={assets}
          altPrefix="植被资产陈列："
          caption="植被资产单独陈列与细节检查。"
          layout="two"
          emailMode={emailMode}
        />
      </div>
    </section>
  );
}

function vegetationStepLayout(
  step: number,
): "stack" | "two" | "three" {
  if (step === 2 || step === 4) return "three";
  if (step === 1 || step === 3 || step === 6 || step === 8) {
    return "two";
  }
  return "stack";
}

function PdfVegetationPipeline({
  media,
  rootImages,
  emailMode,
}: {
  media?: MediaFolder;
  rootImages: readonly MediaFile[];
  emailMode: boolean;
}) {
  const folders = sortByLeadingNumber(media?.children ?? []);
  const billboard = rootImages.find((image) => image.sortValue === 7);

  return (
    <section className="pdf-section">
      <PdfSectionHeader
        index="10"
        eyebrow="VEGETATION PRODUCTION PIPELINE"
        title="植被全流程制作过程展示"
        description="从枝干形态研究、资产制作、贴图与风动，到法线处理与UE最终表现。"
      />

      <div className="pdf-process-list">
        {vegetationSteps.map((step) => {
          const folder = folders.find(
            (candidate) => candidate.sortValue === step.number,
          );
          const allImages = visibleImages(folder);
          const files =
            step.number === 8 ? allImages.slice(0, 2) : allImages;

          return (
            <article className="pdf-process-step" key={step.number}>
              <header>
                <span>{String(step.number).padStart(2, "0")}</span>
                <div>
                  <p className="pdf-eyebrow">PIPELINE STEP</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  {"badge" in step && step.badge ? (
                    <strong>{step.badge}</strong>
                  ) : null}
                </div>
              </header>
              <PdfMediaGroup
                files={files}
                altPrefix={`植被流程 ${String(step.number).padStart(2, "0")}：`}
                caption={`第 ${step.number} 步的过程与结果记录。`}
                layout={vegetationStepLayout(step.number)}
                emailMode={emailMode}
              />
            </article>
          );
        })}
      </div>

      <aside className="pdf-billboard">
        <PdfSubheading
          eyebrow="BILLBOARD PIPELINE"
          title="Billboard 制作流程"
        />
        {billboard ? (
          <PdfMediaGroup
            files={[billboard]}
            altPrefix="Billboard 制作流程："
            caption="Billboard 制作流程与场景效果。"
            emailMode={emailMode}
          />
        ) : null}
        <div>
          <p>
            Billboard以SpeedTree完整三维植被为基础，通过Depth Preview检查树冠体积和内部层次；随后在Blender中将烘焙法线写入Vertex
            Color的RGB通道，并将AO写入A通道。
          </p>
          <p>
            在UE中输出Base Color、Vertex Normal与AO后生成远景贴图，并通过材质重建法线、AO与双面受光。
          </p>
        </div>
      </aside>
    </section>
  );
}

function PdfPcg({
  files,
  emailMode,
}: {
  files: readonly MediaFile[];
  emailMode: boolean;
}) {
  const process = files.filter(
    (file) => file.sortValue !== null && file.sortValue <= 6,
  );
  const results = files.filter(
    (file) => file.sortValue !== null && file.sortValue > 6,
  );

  return (
    <section className="pdf-section pdf-pcg">
      <PdfSectionHeader
        index="11"
        eyebrow="MOSS PCG SYSTEM"
        title="岩石苔藓 PCG 系统"
        description={sectionCopy.pcg}
      />
      <div className="pdf-pcg-labels">
        {pcgLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <PdfSubheading
        eyebrow="PROCESS RECORDS"
        title="生成与过滤过程"
        description="距离衰减与法线/坡度过滤属于不同阶段，不将两者合并描述。"
      />
      <PdfMediaGroup
        files={process}
        altPrefix="岩石苔藓 PCG 过程："
        caption="岩石表面苔藓的生成、衰减与过滤过程。"
        emailMode={emailMode}
      />
      <div className="pdf-subsection">
        <PdfSubheading
          eyebrow="FINAL RESULT"
          title="苔藓生成与场景应用"
        />
        <PdfMediaGroup
          files={results}
          altPrefix="岩石苔藓 PCG 最终效果："
          caption="PCG生成结果与场景应用效果。"
          emailMode={emailMode}
        />
      </div>
    </section>
  );
}

function PdfContact() {
  return (
    <section className="pdf-section pdf-contact">
      <PdfSectionHeader
        index="13"
        eyebrow="CONTACT"
        title="项目职责与联系方式"
      />
      <div className="pdf-contact__layout">
        <div>
          <PdfSubheading
            eyebrow="PROJECT RESPONSIBILITIES"
            title="个人全流程制作"
          />
          <ul className="pdf-contact__responsibilities">
            {responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="pdf-contact__panel">
          <p>期待参与更完整、更高质量的游戏环境制作。</p>
          <dl>
            {contactItems.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <footer>
        <div>
          <strong>庄松源 · 西福寺 / XIFO TEMPLE</strong>
          <span>游戏地编 · 环境美术</span>
        </div>
        <div>
          <span>Level Artist · Environment Artist</span>
          <span>Personal Project · Full Pipeline</span>
        </div>
      </footer>
    </section>
  );
}

export function PortfolioPdfView({
  manifest,
}: PortfolioPdfViewProps) {
  const searchParams = new URLSearchParams(window.location.search);
  const emailMode = searchParams.get("email") === "1";
  const highQualityEmail =
    searchParams.get("emailHighQuality") === "1";
  const hero = visibleImages(
    getChapter(manifest, chapterFolderNames.hero),
  )[0];
  const portrait = visibleImages(
    getChapter(manifest, chapterFolderNames.profile),
  )[0];
  const selectedStills = visibleImages(
    getChapter(manifest, chapterFolderNames.selectedStills),
  );
  const overview = visibleImages(
    getChapter(manifest, chapterFolderNames.overview),
  );
  const layout = visibleImages(
    getChapter(manifest, chapterFolderNames.layout),
  );
  const modular = visibleImages(
    getChapter(manifest, chapterFolderNames.modular),
  );
  const materials = visibleImages(
    getChapter(manifest, chapterFolderNames.materials),
  );
  const sdNodes = visibleImages(
    getChapter(manifest, chapterFolderNames.sdNodes),
  );
  const vegetationFolder = getChapter(
    manifest,
    chapterFolderNames.vegetation,
  );
  const vegetationRoot = visibleImages(vegetationFolder);
  const pcg = visibleImages(
    getChapter(manifest, chapterFolderNames.pcg),
  );
  const environment = visibleImages(
    getChapter(manifest, chapterFolderNames.environmentStills),
  );

  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;
    document.body.classList.add("portfolio-pdf-body");
    root.classList.add("portfolio-pdf-mode");
    document.title = "庄松源｜西福寺作品集";
    window.__PORTFOLIO_PDF_READY__ = false;
    window.__PORTFOLIO_PDF_ERRORS__ = [];

    const prepare = async () => {
      await document.fonts.ready;
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          ".portfolio-pdf img",
        ),
      );
      const errors: string[] = [];

      await Promise.all(
        images.map(async (image) => {
          if (!image.complete) {
            await new Promise<void>((resolve) => {
              const finish = () => resolve();
              image.addEventListener("load", finish, { once: true });
              image.addEventListener("error", finish, { once: true });
            });
          }

          if (!image.naturalWidth || !image.naturalHeight) {
            errors.push(
              image.dataset.pdfSource ??
                image.currentSrc ??
                image.src,
            );
            return;
          }

          try {
            await image.decode();
          } catch {
            errors.push(
              image.dataset.pdfSource ??
                image.currentSrc ??
                image.src,
            );
          }
        }),
      );

      if (cancelled) return;
      window.__PORTFOLIO_PDF_IMAGE_COUNT__ = images.length;
      window.__PORTFOLIO_PDF_ERRORS__ = [...new Set(errors)];
      window.__PORTFOLIO_PDF_READY__ = errors.length === 0;
      document.body.dataset.pdfReady =
        errors.length === 0 ? "true" : "false";
    };

    void prepare();

    return () => {
      cancelled = true;
      document.body.classList.remove("portfolio-pdf-body");
      root.classList.remove("portfolio-pdf-mode");
      delete document.body.dataset.pdfReady;
      window.__PORTFOLIO_PDF_READY__ = false;
    };
  }, [emailMode, highQualityEmail, manifest]);

  return (
    <main
      className={`portfolio-pdf ${
        emailMode ? "portfolio-pdf--email" : ""
      }`}
      data-pdf-variant={
        highQualityEmail
          ? "email-high-quality"
          : emailMode
            ? "email"
            : "high"
      }
    >
      <PdfHero image={hero} emailMode={emailMode} />
      <PdfAbout portrait={portrait} emailMode={emailMode} />
      <PdfSelectedStills
        files={selectedStills}
        emailMode={emailMode}
      />
      <PdfOverview files={overview} emailMode={emailMode} />
      <PdfSimpleSection
        index="05"
        eyebrow="CONCEPT & LAYOUT"
        title="规划与跑图路线"
        description={sectionCopy.layout}
        files={layout}
        altPrefix="西福寺规划与跑图路线："
        caption="地图结构、空间节点与跑图路线规划。"
        emailMode={emailMode}
        className="pdf-layout-section"
      />
      <PdfSimpleSection
        index="06"
        eyebrow="MODULAR ARCHITECTURE"
        title="模块化建筑与道具"
        description={sectionCopy.modular}
        files={modular}
        altPrefix="模块化建筑与道具："
        caption="模块化建筑与环境道具制作记录。"
        emailMode={emailMode}
      />
      <PdfSimpleSection
        index="07"
        eyebrow="PROCEDURAL MATERIALS"
        title="程序化材质与场景应用"
        description={sectionCopy.materials}
        files={materials}
        altPrefix="程序化材质展示："
        caption="程序化材质结果与场景实际应用。"
        emailMode={emailMode}
      />
      <PdfSimpleSection
        index="08"
        eyebrow="SD GRAPH & PROCESS"
        title="Substance Designer 节点与制作过程"
        description="节点图保留完整界面和原始比例，按原始编号逐张展示。"
        files={sdNodes}
        altPrefix="Substance Designer 节点图："
        caption="Substance Designer 节点与制作过程。"
        emailMode={emailMode}
      />
      <PdfVegetationShowcase
        rootImages={vegetationRoot}
        emailMode={emailMode}
      />
      <PdfVegetationPipeline
        media={vegetationFolder}
        rootImages={vegetationRoot}
        emailMode={emailMode}
      />
      <PdfPcg files={pcg} emailMode={emailMode} />
      <PdfSimpleSection
        index="12"
        eyebrow="ENVIRONMENT STILLS"
        title="场景静帧"
        description="补充建筑、植被、地面、水面与环境细节镜头。"
        files={environment}
        altPrefix="西福寺场景静帧："
        caption="西福寺环境补充镜头。"
        emailMode={emailMode}
      />
      <PdfContact />
    </main>
  );
}
