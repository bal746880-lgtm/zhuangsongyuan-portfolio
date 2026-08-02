export interface PipelineStep {
  number: number;
  title: string;
  english: string;
}

export interface PipelinePhase {
  number: number;
  title: string;
  english: string;
  steps: readonly PipelineStep[];
}

export interface PipelineMediaCopy {
  title: string;
  english: string;
  description: string;
  status: string;
}

export const propAiPipeline = {
  folderMatcher: (name: string) =>
    name.includes("道具AI") && name.includes("管线"),
  eyebrow: "AI-ASSISTED PROP PIPELINE",
  title: "道具AI辅助资产管线落地",
  subtitle:
    "以实景参考约束造型方向，通过AI多视图与基础网格生成完成快速验证，再经人工减面、网格清理、UV重构及UE场景适配，将生成结果转化为可用于实时环境的道具资产。",
  boardDescription:
    "从参考分析和AI造型验证开始，经过基础网格生成、人工网格清理、减面和UV重构，最终完成材质适配及UE场景验证。",
  steps: [
    {
      number: 1,
      title: "实景参考与特征提取",
      english: "REFERENCE ANALYSIS",
    },
    {
      number: 2,
      title: "AI四视图生成与方案确定",
      english: "AI MULTI-VIEW GENERATION",
    },
    {
      number: 3,
      title: "AI基础模型生成",
      english: "AI BASE MESH GENERATION",
    },
    {
      number: 4,
      title: "Blender网格清理与面数优化",
      english: "MESH CLEANUP & OPTIMIZATION",
    },
    {
      number: 5,
      title: "RizomUV重新拆分与排布",
      english: "UV RECONSTRUCTION",
    },
    {
      number: 6,
      title: "UE材质适配与场景落地",
      english: "UNREAL ENGINE INTEGRATION",
    },
  ] satisfies readonly PipelineStep[],
  media: [
    {
      title: "实景参考与特征提取",
      english: "REFERENCE ANALYSIS",
      description:
        "分析道具的整体轮廓、比例、材质特征以及其与场景环境的关系，为后续AI方案生成提供明确约束。",
      status: "REFERENCE",
    },
    {
      title: "AI四视图生成与方案确定",
      english: "AI MULTI-VIEW GENERATION",
      description:
        "根据实景参考生成并筛选多视图方案，用于确定基础造型、比例和主要结构关系。",
      status: "AI GENERATED",
    },
    {
      title: "AI基础模型生成",
      english: "AI BASE MESH GENERATION",
      description:
        "通过Tripo生成基础网格，快速验证模型的主要体块、轮廓和整体比例。",
      status: "AI GENERATED",
    },
    {
      title: "Blender网格清理与面数优化",
      english: "MESH CLEANUP & OPTIMIZATION",
      description:
        "清理AI网格中的冗余结构、破面及无效几何，并根据实时场景需求控制模型面数。",
      status: "ARTIST REFINED",
    },
    {
      title: "RizomUV重新拆分与排布",
      english: "UV RECONSTRUCTION",
      description:
        "重新拆分并排布UV，统一纹素密度，优化主要视觉区域的贴图空间利用率。",
      status: "ARTIST REFINED",
    },
    {
      title: "UE材质适配与场景落地",
      english: "UNREAL ENGINE INTEGRATION",
      description:
        "完成材质适配、比例校正和环境组合，并在最终灯光条件下验证资产表现。",
      status: "GAME-READY ASSET",
    },
  ] satisfies readonly PipelineMediaCopy[],
} as const;

export const treeTrunkAiPipeline = {
  folderMatcher: (name: string) =>
    name.includes("树干AI") && name.includes("管线"),
  steps: [
    { number: 1, title: "参考与形态分析", english: "REFERENCE & FORM ANALYSIS" },
    { number: 2, title: "AI多视图方案生成", english: "AI MULTI-VIEW GENERATION" },
    { number: 3, title: "AI基础模型生成", english: "AI BASE MESH GENERATION" },
    { number: 4, title: "ZBrush人工树干雕刻", english: "ZBRUSH TRUNK SCULPTING" },
    { number: 5, title: "RizomUV重构", english: "UV RECONSTRUCTION" },
    { number: 6, title: "高低模烘焙", english: "HIGH-TO-LOW POLY BAKING" },
    { number: 7, title: "Substance Painter树干贴图制作", english: "SUBSTANCE PAINTER TEXTURING" },
  ] satisfies readonly PipelineStep[],  eyebrow: "AI-ASSISTED VEGETATION ASSET PIPELINE",
  title: "植被AI辅助资产管线落地",
  subtitle:
    "从真实树干与枝叶参考出发，通过AI多视图生成和基础模型建立完成前期形态验证，再结合ZBrush雕刻、UV重构、高低模烘焙与Substance Painter贴图制作形成树干基础资产；随后完成枝干形态提取、AI枝叶参考、SpeedTree枝叶制作、法线迭代、2:1纹理图集规划、植被组装、风动、球形法线及Billboard处理，最终形成可用于UE5实时环境的完整植被资产体系。",
  boardDescription:
    "两阶段流程将树干基础资产与枝叶生产、植被整合、风动、法线及远景表现串联为一套可复用的实时植被资产管线。",
  phases: [
    {
      number: 1,
      title: "树干AI基础资产落地",
      english: "TREE TRUNK ASSET FOUNDATION",
      steps: [
        { number: 1, title: "参考与形态分析", english: "REFERENCE & FORM ANALYSIS" },
        { number: 2, title: "AI多视图方案生成", english: "AI MULTI-VIEW GENERATION" },
        { number: 3, title: "AI基础模型生成", english: "AI BASE MESH GENERATION" },
        { number: 4, title: "ZBrush人工树干雕刻", english: "ZBRUSH TRUNK SCULPTING" },
        { number: 5, title: "RizomUV重构", english: "UV RECONSTRUCTION" },
        { number: 6, title: "高低模烘焙", english: "HIGH-TO-LOW POLY BAKING" },
        { number: 7, title: "Substance Painter树干贴图制作", english: "SUBSTANCE PAINTER TEXTURING" },
      ],
    },
    {
      number: 2,
      title: "枝叶制作与植被整合",
      english: "FOLIAGE PRODUCTION & ASSEMBLY",
      steps: [
        { number: 8, title: "提取真实枝干形态", english: "BRANCH FORM EXTRACTION" },
        { number: 9, title: "AI生成枝叶参考", english: "AI FOLIAGE REFERENCE GENERATION" },
        { number: 10, title: "SpeedTree制作枝叶及材质测试", english: "SPEEDTREE FOLIAGE & MATERIAL TESTING" },
        { number: 11, title: "法线迭代", english: "NORMAL ITERATION" },
        { number: 12, title: "2:1植被纹理图集规划", english: "2:1 VEGETATION ATLAS PLANNING" },
        { number: 13, title: "DCC枝叶插片制作与SpeedTree效果验证", english: "DCC FOLIAGE CARD CREATION & SPEEDTREE VALIDATION" },
        { number: 14, title: "SpeedTree整体植被制作", english: "SPEEDTREE VEGETATION ASSEMBLY" },
        { number: 15, title: "IGTools风动制作", english: "IGTOOLS WIND SETUP" },
        { number: 16, title: "球形法线烘焙与Shader法线混合", english: "SPHERICAL NORMAL BAKING & SHADER BLENDING" },
        { number: 17, title: "Billboard与远景表现", english: "BILLBOARD & DISTANT REPRESENTATION" },
      ],
    },
  ] satisfies readonly PipelinePhase[],
} as const;

function treeTrunkMediaLabel(fileName: string) {
  return fileName
    .replace(/(?:\.(?:png|jpe?g|webp))+$/i, "")
    .replace(/^\d+[._\-\s]*/, "")
    .trim();
}

export function treeTrunkAiMediaCopy(
  fileName: string,
  index: number,
): PipelineMediaCopy {
  const label = treeTrunkMediaLabel(fileName) || `树干资产过程${index + 1}`;

  if (label.includes("参考")) {
    return {
      title: "真实树干参考与形态拆解",
      english: "REFERENCE & FORM ANALYSIS",
      description:
        "分析真实树干的主干走向、根部结构、轮廓节奏和表面特征，为AI方案生成提供形态约束。",
      status: "REFERENCE",
    };
  }

  if (label.includes("GPT") && label.includes("三视图")) {
    const iteration = label.match(/迭代\s*(\d+)/)?.[1];
    return {
      title: label,
      english: iteration
        ? `GPT MULTI-VIEW ITERATION ${iteration}`
        : "GPT MULTI-VIEW GENERATION",
      description: iteration
        ? `第${iteration}轮树干三视图方案生成，用于比较主干轮廓、根部结构与整体形态方向。`
        : "树干三视图方案生成与筛选，用于比较主干轮廓、根部结构与整体形态方向。",
      status: "AI GENERATED",
    };
  }

  if (/Trip(?:m|o)/i.test(label) && label.includes("3D模型")) {
    return {
      title: label,
      english: "AI BASE MESH GENERATION",
      description:
        "根据筛选后的形态参考生成树干3D基础网格，用于后续人工雕刻、结构修正和游戏资产处理。",
      status: "AI GENERATED",
    };
  }

  if (/ZB|ZBrush/i.test(label)) {
    return {
      title: "ZBrush树干精雕",
      english: "ZBRUSH TRUNK SCULPTING",
      description:
        "对树干基础形态进行人工精雕和结构整理，强化根部支撑、主干转折、表面起伏与整体轮廓。",
      status: "ARTIST SCULPTED",
    };
  }

  if (/Rizom/i.test(label)) {
    return {
      title: "RizomUV拆分与排布",
      english: "RIZOMUV RECONSTRUCTION",
      description:
        "在RizomUV中完成树干UV拆分与排布，统一纹素密度，为后续烘焙和材质制作建立规范基础。",
      status: "ARTIST REFINED",
    };
  }

  if (label.includes("八猴") || /Marmoset/i.test(label)) {
    return {
      title: "八猴高低模烘焙",
      english: "MARMOSET HIGH-TO-LOW POLY BAKING",
      description:
        "在Marmoset Toolbag中完成高低模匹配及法线、AO等贴图烘焙，为树干资产进入Speedtree和UE流程提供贴图基础。",
      status: "GAME-READY PROCESS",
    };
  }

  return {
    title: label,
    english: "TREE TRUNK ASSET PROCESS",
    description: `展示树干资产流程中的“${label}”阶段。`,
    status: "PROCESS",
  };
}
