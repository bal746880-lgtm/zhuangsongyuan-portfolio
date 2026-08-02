import { type ReactNode, useEffect } from "react";
import {
  aboutParagraphs,
  awards,
  careerPath,
  coreCapabilities,
  profileFacts,
} from "../data/experience";
import {
  propAiPipeline,
  treeTrunkAiPipeline,
  type PipelineMediaCopy,
  type PipelineStep,
} from "../data/aiAssetPipelines";
import type { MediaFile, MediaFolder, PortfolioManifest } from "../data/media";
import { chapterFolderNames, getChapter } from "../data/media";
import {
  overviewParagraphs,
  overviewResponsibilities,
  pcgLabels,
  projectFacts,
  responsibilities,
  sectionCopy,
  software,
  vegetationSteps,
} from "../data/portfolio";
import { imagesIn } from "../utils/mediaHelpers";
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

type PdfPageKind = "full-bleed" | "single-centered" | "text-centered" | "grid";

const contactItems = [
  ["姓名", "庄松源"],
  ["微信", "18371378303"],
  ["电话", "18371378303"],
  ["邮箱", "1815258404@qq.com"],
  ["网站", "https://zhuangsongyuan.online"],
] as const;

function visibleImages(folder?: MediaFolder): MediaFile[] {
  return imagesIn(folder).filter((file) => file.isDisplayed !== false);
}

function folderByNumber(folder: MediaFolder | undefined, value: number) {
  return folder?.children.find((child) => child.sortValue === value);
}

function selectPdfSource(file: MediaFile): PdfImageSource {
  const variants = [...(file.displayVariants ?? [])].sort(
    (left, right) => left.width - right.width,
  );
  return {
    src: file.lightboxSrc ?? variants.at(-1)?.src ?? file.src ?? file.url,
    width: file.lightboxWidth ?? variants.at(-1)?.width ?? file.width ?? 1,
    height: file.lightboxHeight ?? variants.at(-1)?.height ?? file.height ?? 1,
  };
}

function imageAspectRatio(file: MediaFile) {
  const width = file.width ?? file.lightboxWidth ?? 0;
  const height = file.height ?? file.lightboxHeight ?? 0;
  return width && height ? width / height : 0;
}

function isNearSixteenNine(file: MediaFile) {
  const aspectRatio = imageAspectRatio(file);
  return Boolean(aspectRatio && Math.abs(aspectRatio - 16 / 9) <= 0.015);
}

function chunkFiles(files: readonly MediaFile[], size: number) {
  const chunks: MediaFile[][] = [];
  for (let index = 0; index < files.length; index += size) {
    chunks.push(files.slice(index, index + size));
  }
  return chunks;
}

function PdfPage({
  kind,
  label,
  chapter,
  className = "",
  children,
  step,
}: {
  kind: PdfPageKind;
  label: string;
  chapter?: string;
  className?: string;
  children: ReactNode;
  step?: number;
}) {
  return (
    <section
      className={`pdf-page pdf-page--${kind} ${className}`}
      data-pdf-page="true"
      data-pdf-page-kind={kind}
      data-pdf-page-label={label}
      data-pdf-chapter={chapter}
      data-pdf-step={step}
      aria-label={label}
    >
      {children}
    </section>
  );
}

function PdfSectionHeader({
  index,
  eyebrow,
  title,
  description,
}: {
  index?: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="pdf-section-header">
      {index ? <span className="pdf-section-header__index">{index}</span> : null}
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

function PdfImage({ file, alt }: { file: MediaFile; alt: string }) {
  const source = selectPdfSource(file);
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
    />
  );
}

function PdfMediaFrame({
  file,
  alt,
}: {
  file: MediaFile;
  alt: string;
}) {
  return (
    <figure
      className={`pdf-media-frame ${file.imageCategory === "C" ? "pdf-media-frame--technical" : ""}`}
      data-file-name={file.name}
      data-sort-value={file.sortValue ?? undefined}
    >
      <PdfImage file={file} alt={alt} />
    </figure>
  );
}

function layoutForCount(count: number) {
  if (count >= 5) return "five";
  if (count === 4) return "four";
  if (count === 3) return "three";
  if (count === 2) return "two";
  return "one";
}

function PdfMediaGrid({
  files,
  altPrefix,
  className = "",
}: {
  files: readonly MediaFile[];
  altPrefix: string;
  className?: string;
}) {
  const layout = layoutForCount(files.length);
  return (
    <div
      className={`pdf-media-grid pdf-media-grid--${layout} ${className}`}
      data-pdf-layout={layout}
    >
      {files.map((file, index) => (
        <PdfMediaFrame
          key={`${file.relativePath}-${file.name}`}
          file={file}
          alt={`${altPrefix}${String(index + 1).padStart(2, "0")}`}
        />
      ))}
    </div>
  );
}

function PdfSectionCoverPage({
  chapter,
  index,
  eyebrow,
  title,
  description,
}: {
  chapter?: string;
  index?: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <PdfPage
      kind="text-centered"
      label={`${title}标题`}
      chapter={chapter}
      className="pdf-section-cover"
    >
      <div className="pdf-section-cover__content">
        {index ? <span>{index}</span> : null}
        <p className="pdf-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </PdfPage>
  );
}
function PdfImageOnlyPage({
  file,
  label,
  chapter,
  alt,
}: {
  file: MediaFile;
  label: string;
  chapter?: string;
  alt: string;
}) {
  const fullBleed = isNearSixteenNine(file);
  return (
    <PdfPage
      kind={fullBleed ? "full-bleed" : "single-centered"}
      label={label}
      chapter={chapter}
      className={`pdf-page--media-only ${imageAspectRatio(file) > 16 / 9 + 0.015 ? "pdf-page--wide-contained" : "pdf-page--contained-image"}` }
    >
      <div className="pdf-page__media-only" data-pdf-layout="stack">
        <PdfImage file={file} alt={alt} />
      </div>
    </PdfPage>
  );
}

function PdfGalleryPages({
  files,
  label,
  chapter,
  heading,
  altPrefix,
}: {
  files: readonly MediaFile[];
  label: string;
  chapter?: string;
  heading?: {
    index?: string;
    eyebrow: string;
    title: string;
    description?: string;
  };
  altPrefix: string;
}) {
  if (!files.length) return null;
  return (
    <>
      {files.map((file, index) => {
        if (index === 0 && heading) {
          return (
            <PdfPage
              kind="single-centered"
              label={`${label} 01`}
              chapter={chapter}
              className="pdf-page--with-heading"
              key={`${file.relativePath}-${file.name}`}
            >
              <div className="pdf-page__content pdf-page__content--media">
                <PdfSectionHeader {...heading} />
                <PdfMediaGrid files={[file]} altPrefix={altPrefix} />
              </div>
            </PdfPage>
          );
        }
        return (
          <PdfImageOnlyPage
            key={`${file.relativePath}-${file.name}`}
            file={file}
            label={`${label} ${String(index + 1).padStart(2, "0")}`}
            chapter={index === 0 ? chapter : undefined}
            alt={`${altPrefix}${String(index + 1).padStart(2, "0")}`}
          />
        );
      })}
    </>
  );
}

function PdfGalleryWithSectionCover({
  files,
  chapter,
  index,
  eyebrow,
  title,
  description,
  altPrefix,
}: {
  files: readonly MediaFile[];
  chapter?: string;
  index?: string;
  eyebrow: string;
  title: string;
  description: string;
  altPrefix: string;
}) {
  if (!files.length) return null;
  return (
    <>
      <PdfSectionCoverPage
        chapter={chapter}
        index={index}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      {files.map((file, imageIndex) => (
        <PdfImageOnlyPage
          key={`${file.relativePath}-${file.name}`}
          file={file}
          label={`${title} ${String(imageIndex + 1).padStart(2, "0")}`}
          alt={`${altPrefix}${String(imageIndex + 1).padStart(2, "0")}`}
        />
      ))}
    </>
  );
}
function PdfHero({ image }: { image?: MediaFile }) {
  if (!image) return null;
  return (
    <PdfPage
      kind="single-centered"
      label="封面"
      chapter="封面"
      className="pdf-cover"
    >
      <div className="pdf-page__media-only" data-pdf-layout="stack">
        <PdfImage file={image} alt="西福寺项目主视觉" />
      </div>
    </PdfPage>
  );
}

function PdfAboutPages({ portrait }: { portrait?: MediaFile }) {
  return (
    <>
      <PdfPage kind="text-centered" label="个人介绍" chapter="个人介绍与经历">
        <div className="pdf-page__content">
          <PdfSectionHeader
            index="02"
            eyebrow="ABOUT & EXPERIENCE"
            title="个人介绍与经历"
            description="从视觉设计与硬科技创业实践，转向游戏地编与实时环境制作。"
          />
          <div className="pdf-about-overview">
            <aside>
              {portrait ? (
                <figure
                  className="pdf-about-portrait"
                  data-pdf-layout="one"
                  data-pdf-portrait="true"
                >
                  <PdfImage file={portrait} alt="庄松源个人照片" />
                </figure>
              ) : null}
              <div className="pdf-about-role">
                <strong>游戏地编 · 环境美术</strong>
                <span>Level Artist · Environment Artist</span>
              </div>
            </aside>
            <div>
              <div className="pdf-about-bio">
                {aboutParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
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
        </div>
      </PdfPage>
      <PdfPage kind="text-centered" label="核心能力">
        <div className="pdf-page__content pdf-page__content--narrow">
          <PdfSubheading eyebrow="CORE CAPABILITIES" title="核心能力" />
          <ol className="pdf-capabilities">
            {coreCapabilities.map((capability, index) => (
              <li className={index === 0 ? "pdf-capabilities__featured" : ""} key={capability.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{capability.title}</strong>
                  <small>{capability.english}</small>
                  {"description" in capability ? <p>{capability.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </PdfPage>
      <PdfPage kind="text-centered" label="经历路径">
        <div className="pdf-page__content">
          <PdfSubheading eyebrow="CAREER PATH" title="经历路径" />
          <div className="pdf-career-grid">
            {careerPath.map((entry, index) => (
              <article key={entry.time}>
                <time>{entry.time}</time>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h4>{entry.title}</h4>
                <strong>{entry.subtitle}</strong>
                <p>{entry.description}</p>
                <ul>{entry.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                {index === 0 ? (
                  <div className="pdf-career-awards">
                    <p>主要奖项</p>
                    <ul>{awards.map((award) => <li key={award}>{award}</li>)}</ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </PdfPage>
    </>
  );
}

function PdfOverviewPages({ files }: { files: readonly MediaFile[] }) {
  return (
    <>
      <PdfPage kind="text-centered" label="项目概览" chapter="项目概览与个人职责">
        <div className="pdf-page__content">
          <PdfSectionHeader index="04" eyebrow="PROJECT OVERVIEW" title="项目概览与个人职责" />
          <div className="pdf-overview-grid">
            <div className="pdf-overview-copy">
              {overviewParagraphs.map((paragraph) => (
                <p key={paragraph.lead}><strong>{paragraph.lead}</strong><span>{paragraph.body}</span></p>
              ))}
            </div>
            <dl className="pdf-fact-grid">
              {projectFacts.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </PdfPage>
      <PdfPage kind="text-centered" label="项目职责与软件">
        <div className="pdf-page__content pdf-page__content--narrow">
          <div className="pdf-responsibility-layout">
            <div>
              <PdfSubheading eyebrow="RESPONSIBILITIES" title="主要职责" />
              <ul className="pdf-responsibilities">
                {overviewResponsibilities.map((item) => (
                  <li className={"body" in item ? "pdf-responsibility-feature" : ""} key={item.title}>
                    <strong>{item.title}</strong>
                    {"body" in item ? <span>{item.body}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <PdfSubheading eyebrow="SOFTWARE" title="使用软件" />
              <ul className="pdf-software-list">{software.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </div>
      </PdfPage>
      {files.length ? (
        <PdfPage kind="grid" label="概念参考">
          <div className="pdf-page__content pdf-page__content--media">
            <PdfSubheading eyebrow="CONCEPT REFERENCES" title="概念参考" description="用于场景关系、空间层次与秋季氛围参考。" />
            <PdfMediaGrid files={files} altPrefix="西福寺项目概念参考：" className="pdf-concept-grid" />
          </div>
        </PdfPage>
      ) : null}
    </>
  );
}

function PdfPipelineFlowBoard({ steps }: { steps: readonly PipelineStep[] }) {
  return (
    <ol className={`pdf-pipeline-board pdf-pipeline-board--${steps.length}`}>
      {steps.map((step) => (
        <li key={`${step.number}-${step.title}`}>
          <span>{String(step.number).padStart(2, "0")}</span>
          <strong>{step.title}</strong>
          <small>{step.english}</small>
        </li>
      ))}
    </ol>
  );
}

function PdfPropAiPages({
  files,
}: {
  files: readonly MediaFile[];
}) {
  return (
    <>
      <PdfPage kind="text-centered" label="道具AI辅助资产管线">
        <div className="pdf-page__content pdf-page__content--narrow">
          <PdfSubheading eyebrow={propAiPipeline.eyebrow} title={propAiPipeline.title} description={propAiPipeline.subtitle} />
          <PdfPipelineFlowBoard steps={propAiPipeline.steps} />
          <p className="pdf-board-description">{propAiPipeline.boardDescription}</p>
        </div>
      </PdfPage>
      {files.map((file, index) => {
        const copy: PipelineMediaCopy = propAiPipeline.media[index] ?? {
          title: `图 ${index + 1}`,
          english: "PROP ASSET PROCESS",
          description: "道具AI辅助资产管线过程记录。",
          status: "PROCESS",
        };
        return (
          <PdfPage kind="single-centered" label={`道具AI流程 ${String(index + 1).padStart(2, "0")}`} className="pdf-page--ai-media" key={`${file.relativePath}-${file.name}`}>
            <div className="pdf-page__content pdf-page__content--media">
              <header className="pdf-ai-header">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><p className="pdf-eyebrow">{copy.english}</p><h3>{copy.title}</h3><p>{copy.description}</p></div>
                <strong>{copy.status}</strong>
              </header>
              <PdfMediaGrid files={[file]} altPrefix={`${propAiPipeline.title}：`} />
            </div>
          </PdfPage>
        );
      })}
    </>
  );
}

function PdfVegetationFlowPages() {
  const [phaseOne, phaseTwo] = treeTrunkAiPipeline.phases;
  return (
    <PdfPage
      kind="text-centered"
      label="植被AI辅助资产管线"
      chapter="植被全流程制作"
      className="pdf-page--vegetation-flow"
    >
      <div className="pdf-page__content pdf-vegetation-flow">
        <PdfSectionHeader
          index="08"
          eyebrow={treeTrunkAiPipeline.eyebrow}
          title={treeTrunkAiPipeline.title}
          description={treeTrunkAiPipeline.subtitle}
        />
        {[phaseOne, phaseTwo].map((phase) => (
          <section
            className="pdf-vegetation-phase"
            data-pdf-vegetation-phase={phase.number}
            key={phase.number}
          >
            <PdfSubheading
              eyebrow={`PHASE ${String(phase.number).padStart(2, "0")} · ${phase.english}`}
              title={phase.title}
            />
            <PdfPipelineFlowBoard steps={phase.steps} />
          </section>
        ))}
        <p className="pdf-board-description">{treeTrunkAiPipeline.boardDescription}</p>
      </div>
    </PdfPage>
  );
}

function PdfVegetationStepPages({ media }: { media?: MediaFolder }) {
  const folders = sortByLeadingNumber(media?.children ?? []);
  return (
    <>
      {vegetationSteps.flatMap((step) => {
        const folder = folders.find((candidate) => candidate.sortValue === step.stepNumber);
        const files = visibleImages(folder);
        if (!files.length) return [];
        const splitIndex = Math.ceil(files.length / 2);
        const chunks = step.stepNumber === 14
          ? [files.slice(0, splitIndex), files.slice(splitIndex)].filter((chunk) => chunk.length)
          : files.length > 5
            ? chunkFiles(files, 2)
            : [files];
        return chunks.map((chunk, chunkIndex) => (
          <PdfPage
            kind={chunk.length === 1 ? "single-centered" : "grid"}
            label={`植被步骤 ${String(step.stepNumber).padStart(2, "0")}${chunks.length > 1 ? `-${chunkIndex + 1}` : ""}`}
            className={`pdf-page--process ${step.stepNumber === 14 ? "pdf-page--speedtree" : ""}`}
            step={step.stepNumber}
            key={`${step.stepNumber}-${chunkIndex}`}
          >
            <div className="pdf-page__content pdf-page__content--media">
              {chunkIndex === 0 ? (
                <header className="pdf-step-header">
                  <span>{String(step.stepNumber).padStart(2, "0")}</span>
                  <div>
                    <p className="pdf-eyebrow">{step.english}</p>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                    {"badge" in step && step.badge ? <strong>{step.badge}</strong> : null}
                  </div>
                </header>
              ) : (
                <p className="pdf-process-continuation">
                  {String(step.stepNumber).padStart(2, "0")} · {step.english} · CONTINUED
                </p>
              )}
              <PdfMediaGrid
                files={chunk}
                altPrefix={`植被流程 ${String(step.stepNumber).padStart(2, "0")}：`}
                className={[
                  step.stepNumber === 11 ? "pdf-leaf-normal-grid" : "",
                  step.stepNumber === 14 ? `pdf-speedtree-grid pdf-speedtree-grid--${chunk.length}` : "",
                ].filter(Boolean).join(" ")}
              />
            </div>
          </PdfPage>
        ));
      })}
    </>
  );
}

function PdfPcgPages({ media }: { media?: MediaFolder }) {
  const process = visibleImages(media).filter((file) => file.sortValue !== null && file.sortValue <= 6);
  const assets = visibleImages(folderByNumber(media, 7));
  const results = visibleImages(folderByNumber(media, 8));
  const flowSteps = pcgLabels.map((label, index) => {
    const [english, title] = label.split(" / ");
    return { number: index + 1, title: title ?? label, english: english ?? label };
  });
  return (
    <>
      <PdfPage
        kind="grid"
        label="PCG生成与过滤过程"
        chapter="岩石苔藓PCG系统"
        className="pdf-page--pcg-system"
      >
        <div className="pdf-page__content pdf-pcg-system-layout">
          <PdfSectionHeader index="09" eyebrow="MOSS PCG SYSTEM" title="岩石苔藓 PCG 系统" description={sectionCopy.pcg} />
          <PdfPipelineFlowBoard steps={flowSteps} />
          <PdfMediaGrid files={process} altPrefix="岩石苔藓 PCG 过程：" className="pdf-pcg-process-grid" />
        </div>
      </PdfPage>
      <PdfPage kind="grid" label="苔藓资产制作流程" className="pdf-page--moss-assets">
        <div className="pdf-page__content pdf-page__content--media">
          <PdfSubheading
            eyebrow="MOSS ASSET PRODUCTION"
            title="苔藓资产制作流程"
            description="从参考约束、AI基础模型、高低模烘焙到UE5材质制作，形成可用于岩石表面散布的苔藓资产。"
          />
          <PdfMediaGrid files={assets} altPrefix="苔藓资产制作流程：" className="pdf-moss-assets-grid" />
        </div>
      </PdfPage>
      <PdfGalleryPages
        files={results}
        label="PCG最终场景应用"
        heading={{ eyebrow: "FINAL PCG SCENE APPLICATION", title: "岩石苔藓PCG最终场景应用", description: "展示苔藓资产与岩石PCG系统在不同区域、坡度和光照条件下的最终落地效果。" }}
        altPrefix="岩石苔藓 PCG 最终效果："
      />
    </>
  );
}

function PdfContact() {
  return (
    <PdfPage kind="text-centered" label="联系方式" chapter="项目职责与联系方式" className="pdf-contact">
      <div className="pdf-page__content">
        <PdfSectionHeader index="11" eyebrow="CONTACT" title="项目职责与联系方式" />
        <div className="pdf-contact-layout">
          <div>
            <PdfSubheading eyebrow="PROJECT RESPONSIBILITIES" title="个人全流程制作" />
            <ul className="pdf-contact-responsibilities">{responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="pdf-contact-ai">
              <p className="pdf-eyebrow">SELF-DEVELOPED AI-ASSISTED ASSET PIPELINE</p>
              <h4>自研AI辅助资产管线落地</h4>
              <p>独立设计并落地AI辅助资产生产流程，将实景参考分析、AI多视图生成、基础模型生成、Blender网格清理与减面、RizomUV重构、ZBrush雕刻、高低模烘焙及UE场景适配进行串联，并实际应用于《西福寺》的道具与植被树干资产制作。</p>
            </div>
          </div>
          <div className="pdf-contact-panel">
            <p>期待参与更完整、更高质量的游戏环境制作。</p>
            <dl>
              {contactItems.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{label === "网站" ? <a href={value}>{value}</a> : value}</dd></div>
              ))}
            </dl>
          </div>
        </div>
        <footer className="pdf-contact-footer">
          <div><strong>庄松源 · 西福寺 / XIFO TEMPLE</strong><span>游戏地编 · 环境美术</span></div>
          <div><span>Level Artist · Environment Artist</span><span>Personal Project · Full Pipeline</span></div>
        </footer>
      </div>
    </PdfPage>
  );
}

export function PortfolioPdfView({ manifest }: PortfolioPdfViewProps) {
  const searchParams = new URLSearchParams(window.location.search);
  const emailMode = searchParams.get("email") === "1";
  const highQualityEmail = searchParams.get("emailHighQuality") === "1";
  const hero = visibleImages(getChapter(manifest, chapterFolderNames.hero))[0];
  const portrait = visibleImages(getChapter(manifest, chapterFolderNames.profile))[0];
  const selectedStills = visibleImages(getChapter(manifest, chapterFolderNames.selectedStills));
  const overview = visibleImages(getChapter(manifest, chapterFolderNames.overview));
  const layout = visibleImages(getChapter(manifest, chapterFolderNames.layout));
  const modularFolder = getChapter(manifest, chapterFolderNames.modular);
  const modularRoot = visibleImages(modularFolder);
  const propCollection = modularRoot.find((image) => image.sortValue === 4 && (image.name.includes("道具") || image.name === "4.png")) ?? null;
  const modular = propCollection ? modularRoot.filter((image) => image.relativePath !== propCollection.relativePath) : modularRoot;
  const propAiFolder = modularFolder?.children.find((folder) => propAiPipeline.folderMatcher(folder.name));
  const propAiImages = visibleImages(propAiFolder);
  const materials = visibleImages(getChapter(manifest, chapterFolderNames.materials));
  const sdNodes = visibleImages(getChapter(manifest, chapterFolderNames.sdNodes));
  const vegetationFolder = getChapter(manifest, chapterFolderNames.vegetation);
  const ecosystem = visibleImages(folderByNumber(vegetationFolder, 0));
  const ecosystemShowcase = ecosystem.slice(0, 3);
  const subsurfaceScattering = ecosystem.slice(3, 6);
  const vegetationFinalEffects = visibleImages(folderByNumber(vegetationFolder, 18));
  const pcgFolder = getChapter(manifest, chapterFolderNames.pcg);
  const environment = visibleImages(getChapter(manifest, chapterFolderNames.environmentStills));

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
      const images = Array.from(document.querySelectorAll<HTMLImageElement>(".portfolio-pdf img"));
      const errors: string[] = [];
      await Promise.all(images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
          });
        }
        if (!image.naturalWidth || !image.naturalHeight) {
          errors.push(image.dataset.pdfSource ?? image.currentSrc ?? image.src);
          return;
        }
        try { await image.decode(); } catch { errors.push(image.dataset.pdfSource ?? image.currentSrc ?? image.src); }
      }));
      if (cancelled) return;
      window.__PORTFOLIO_PDF_IMAGE_COUNT__ = images.length;
      window.__PORTFOLIO_PDF_ERRORS__ = [...new Set(errors)];
      window.__PORTFOLIO_PDF_READY__ = errors.length === 0;
      document.body.dataset.pdfReady = errors.length === 0 ? "true" : "false";
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
    <main className={`portfolio-pdf ${emailMode ? "portfolio-pdf--email" : ""}`} data-pdf-variant={highQualityEmail ? "email-high-quality" : emailMode ? "email" : "high"}>
      <PdfHero image={hero} />
      <PdfAboutPages portrait={portrait} />
      <PdfGalleryWithSectionCover
        files={selectedStills}
        chapter="主要静帧"
        index="03"
        eyebrow="KEY STILLS"
        title="主要静帧"
        description="集中展示最终场景中的核心构图、空间层级与氛围表现。"
        altPrefix="西福寺主要静帧："
      />
      <PdfOverviewPages files={overview} />
      <PdfGalleryPages
        files={layout}
        label="规划与跑图路线"
        chapter="规划与跑图路线"
        heading={{ index: "05", eyebrow: "CONCEPT & LAYOUT", title: "规划与跑图路线", description: sectionCopy.layout }}
        altPrefix="西福寺规划与跑图路线："
      />
      <PdfGalleryPages
        files={modular}
        label="模块化建筑与道具"
        chapter="模块化建筑与道具"
        heading={{ index: "06", eyebrow: "MODULAR ARCHITECTURE", title: "模块化建筑与道具", description: sectionCopy.modular }}
        altPrefix="模块化建筑与道具："
      />
      <PdfPropAiPages files={propAiImages} />
      {propCollection ? <PdfImageOnlyPage file={propCollection} label="AI辅助道具资产合集" alt="AI辅助资产管线完成的道具合集" /> : null}
      <PdfGalleryWithSectionCover
        files={materials}
        chapter="程序化材质与场景应用"
        index="07"
        eyebrow="PROCEDURAL MATERIALS"
        title="程序化材质与场景应用"
        description={sectionCopy.materials}
        altPrefix="程序化材质展示："
      />
      <PdfPage kind="grid" label="Substance Designer节点" className="pdf-page--sd-nodes">
        <div className="pdf-page__content pdf-page__content--media">
          <PdfSubheading
            eyebrow="SD GRAPH & PROCESS"
            title="Substance Designer 节点与制作过程"
            description="四张节点图以2×2结构集中展示，保留完整界面、原始比例与可读小字。"
          />
          <PdfMediaGrid files={sdNodes} altPrefix="Substance Designer 节点图：" className="pdf-sd-grid" />
        </div>
      </PdfPage>
      <PdfVegetationFlowPages />
      <PdfVegetationStepPages media={vegetationFolder} />
      <PdfGalleryWithSectionCover
        files={ecosystemShowcase}
        eyebrow="ECOSYSTEM SHOWCASE"
        title="生态系统展示"
        description="展示完整植被资产体系在UE5实时环境中的生态层次、树种变化、空间组合与整体场景表现。"
        altPrefix="植被生态系统展示："
      />
      <PdfGalleryWithSectionCover
        files={subsurfaceScattering}
        eyebrow="VEGETATION SUBSURFACE SCATTERING"
        title="植被次表面散射效果展示"
        description="集中展示枫树、银杏与竹类植被在逆光及侧逆光条件下的次表面散射表现，强化叶片的透光层次、色彩变化与真实受光效果。"
        altPrefix="植被次表面散射效果："
      />
      <PdfGalleryPages
        files={vegetationFinalEffects}
        label="植被最终效果展示"
        heading={{ eyebrow: "FINAL EFFECT SHOWCASE", title: "最终效果展示" }}
        altPrefix="植被最终效果展示："
      />
      <PdfPcgPages media={pcgFolder} />
      <PdfGalleryPages
        files={environment}
        label="场景静帧"
        chapter="场景静帧"
        heading={{ index: "10", eyebrow: "ENVIRONMENT STILLS", title: "场景静帧", description: "补充建筑、植被、地面、水面与环境细节镜头。" }}
        altPrefix="西福寺场景静帧："
      />
      <PdfContact />
    </main>
  );
}