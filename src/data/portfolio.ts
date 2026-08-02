export const projectFacts = [
  ["项目名称", "西福寺 / XIFO TEMPLE"],
  ["职位方向", "游戏地编 · 环境美术"],
  ["引擎版本", "Unreal Engine 5.7"],
  ["项目类型", "个人独立项目"],
  ["制作范围", "个人全流程制作"],
  ["最终呈现", "实时静帧 · 无人机镜头 · 人物跑图"],
] as const;

export const overviewParagraphs = [
  {
    lead: "《西福寺》是一项基于两张概念原画展开的 Unreal Engine 5.7 实时环境项目。",
    body: "项目从二维原画出发，将原画中的建筑关系、空间层次、植被分布、光影氛围与视觉节奏转化为一个具有连续探索路线的三维场景。",
  },
  {
    lead: "我从0到1独立完成了该项目的完整制作流程。",
    body: "制作范围覆盖场景规划、白盒搭建、玩家跑图路线设计、模块化建筑与环境道具、UV拆分、程序化材质、植被资产、PCG系统、场景组装、灯光氛围，以及最终静帧、无人机镜头与人物跑图展示。",
  },
  {
    lead: "场景规划围绕两张原画和人物跑图路线展开。",
    body: "通过白盒确定主要建筑位置、道路关系、玩家移动路线、视觉节点与前中远景层次；建筑与环境道具采用模块化方式制作，通过统一尺寸、网格吸附和材质复用完成寺庙主体及周边区域的组合。",
  },
  {
    lead: "建筑、材质与植被资产均采用独立制作流程。",
    body: "木材、屋瓦、石材与地表材质主要使用 Substance Designer 从零制作；植被部分覆盖树干雕刻、枝叶模型、叶片贴图、SpeedTree组装、顶点数据处理、Billboard制作与UE植被材质。PCG系统主要用于岩石表面的苔藓分布和环境融合。项目同时尝试将AI生成工具纳入规范化资产生产流程，在保留人工造型判断和游戏资产标准的前提下，提高前期方案验证与基础网格建立效率。",
  },
  {
    lead: "最终项目在 Unreal Engine 5.7 中完成实时组装与呈现。",
    body: "最终阶段完成植被生成、PCG、RVT融合、风动、灯光、体积云雾与后期表现，并通过22:9静帧、无人机镜头和人物跑图展示完整场景。",
  },
] as const;

export const responsibilities = [
  "原画分析与场景转化",
  "地图规划与白盒搭建",
  "玩家路线与视觉节点设计",
  "模块化建筑与环境道具",
  "模型制作与 UV 拆分",
  "程序化材质制作",
  "植被资产全流程",
  "Billboard 制作",
  "岩石苔藓 PCG 系统",
  "场景组装与环境布置",
  "灯光、云雾与后期",
  "最终静帧与动态镜头",
];

export const overviewResponsibilities = [
  { title: "原画分析与场景转化" },
  { title: "地图规划与白盒搭建" },
  { title: "玩家路线与视觉节点设计" },
  { title: "模块化建筑与环境道具" },
  {
    title: "AI辅助资产管线落地",
    body: "搭建并落地自研AI辅助资产生产流程，将参考分析、AI多视图生成、基础网格生成、Blender网格优化、RizomUV重构、ZBrush雕刻、高低模烘焙与UE场景适配进行串联，用于道具及植被树干资产的快速验证与规范化落地。",
  },
  { title: "模型制作与 UV 拆分" },
  { title: "程序化材质制作" },
  { title: "植被资产全流程" },
  { title: "Billboard 制作" },
  { title: "岩石苔藓 PCG 系统" },
  { title: "场景组装与环境布置" },
  { title: "灯光、云雾与后期" },
  { title: "最终静帧与动态镜头" },
] as const;

export const software = [
  "Unreal Engine 5.7",
  "Blender",
  "Substance Designer",
  "Substance Painter",
  "SpeedTree",
  "ZBrush",
  "Marmoset Toolbag",
  "iG Tools",
];

export const sectionCopy = {
  layout:
    "在保留原画主体构图和氛围特征的基础上，我将两张二维概念图整合为一个具有连续探索路线的三维环境。建筑位置、道路转折、高低差和植被留白均围绕玩家移动视角进行规划，使玩家在移动过程中逐步看到寺庙主体、庭院、桥梁与远景山体。",
  modular:
    "建筑资产采用模块化方式进行拆分与复用，包括柱、梁、墙体、门窗、屋顶、屋瓦、台阶和装饰构件。每组模块均完成了尺寸规划、模型制作、UV 拆分和材质分配，并在 UE 中通过不同组合构建寺庙主体及次级建筑。",
  materials:
    "场景中的木材、屋瓦、石材和地面材质主要通过 Substance Designer 从零制作，并根据不同资产建立颜色、粗糙度、法线、损耗与苔藓变化。该部分重点展示程序化材质节点、材质结果以及它们在最终环境中的实际应用。",
  pcg:
    "该 PCG 系统用于在岩石和环境道具表面生成具有自然密度变化的苔藓。母点首先投射并吸附到目标网格体表面，子点围绕母点生成；距离衰减控制密度变化，法线与坡度过滤则剔除垂直面和过陡区域，最后加入尺度、旋转与密度随机变化。",
  walkthrough:
    "完整跑图用于展示玩家尺度、路线连续性、空间节奏，以及植被、灯光和环境效果在实时移动过程中的表现。",
} as const;

export const vegetationSteps = [
  {
    stepNumber: 1,
    english: "REFERENCE & FORM ANALYSIS",
    title: "参考与形态分析",
    body: "分析真实树干的主干走向、根部结构、轮廓节奏和表面特征，为AI方案生成提供明确的形态约束。",
  },
  {
    stepNumber: 2,
    english: "AI MULTI-VIEW GENERATION",
    title: "AI多视图方案生成",
    body: "围绕树干轮廓、根部结构与整体形态进行多轮多视图方案生成和筛选，快速验证可行的造型方向。",
    badge: "AI 辅助参考",
  },
  {
    stepNumber: 3,
    english: "AI BASE MESH GENERATION",
    title: "AI基础模型生成",
    body: "根据确定的形态参考生成树干3D基础网格，为后续人工雕刻、结构修正和游戏资产处理建立起点。",
    badge: "AI 生成基础模型",
  },
  {
    stepNumber: 4,
    english: "ZBRUSH TRUNK SCULPTING",
    title: "ZBrush人工树干雕刻",
    body: "对树干基础形态进行人工精雕和结构整理，强化根部支撑、主干转折、表面起伏与整体轮廓。",
  },
  {
    stepNumber: 5,
    english: "UV RECONSTRUCTION",
    title: "RizomUV重构",
    body: "在RizomUV中重新拆分并排布树干UV，统一纹素密度，为后续烘焙和材质制作建立规范基础。",
  },
  {
    stepNumber: 6,
    english: "HIGH-TO-LOW POLY BAKING",
    title: "高低模烘焙",
    body: "在Marmoset Toolbag中完成高低模匹配及法线、AO等贴图烘焙，为树干资产进入材质与植被组装流程提供贴图基础。",
  },
  {
    stepNumber: 7,
    english: "SUBSTANCE PAINTER TEXTURING",
    title: "Substance Painter树干贴图制作",
    body: "利用AO识别树干凹陷及内部原木区域，通过Curvature提取外部磨损边缘并露出原木材质；结合Light控制朝上表面的苔藓分布，并在根部叠加渐变泥土遮罩，增强材质层次与环境融合。",
  },
  {
    stepNumber: 8,
    english: "BRANCH FORM EXTRACTION",
    title: "提取真实枝干形态",
    body: "通过真实植物和枝干参考，提取树木的整体轮廓、主干趋势、分叉方式和枝条节奏，为后续植被结构设计建立可靠基础。",
  },
  {
    stepNumber: 9,
    english: "AI FOLIAGE REFERENCE GENERATION",
    title: "AI生成枝叶参考",
    body: "使用AI生成内容作为形态探索和辅助参考，用于补充树冠轮廓、枝叶分布与季节表现。此处仅作为辅助参考，不代表最终资产或原创概念设计。",
    badge: "AI 辅助参考",
  },
  {
    stepNumber: 10,
    english: "SPEEDTREE FOLIAGE & MATERIAL TESTING",
    title: "SpeedTree制作枝叶及材质测试",
    body: "在SpeedTree中制作枝叶结构并调整树冠轮廓、体积与枝叶密度，同时在UE中检查枝叶材质、透光和早期受光表现。",
  },
  {
    stepNumber: 11,
    english: "NORMAL ITERATION",
    title: "法线迭代",
    body: "通过调整叶片在DCC软件中的不同折叠程度，对法线强度与叶片受光表现进行多轮迭代测试，比较不同折叠状态下叶片明暗层次、表面细节与整体体积感的变化，并确定适合最终植被资产的折叠程度与法线表现。",
  },
  {
    stepNumber: 12,
    english: "2:1 VEGETATION ATLAS PLANNING",
    title: "2:1植被纹理图集规划",
    body: "采用一张2:1纹理图集整合植被所需贴图：左侧用于枝叶插片，中部配置可平铺的树皮四方连续纹理，右侧放置ZBrush雕刻树干对应的定制UV贴图。通过统一图集管理枝叶、通用枝干与主体树干材质，在保留纹理差异的同时减少材质数量与纹理采样。",
  },
  {
    stepNumber: 13,
    english: "DCC FOLIAGE CARD CREATION & SPEEDTREE VALIDATION",
    title: "DCC枝叶插片制作与SpeedTree效果验证",
    body: "在DCC软件中依据枝叶贴图完成插片裁切、排布与枝叶单元组装，再导入SpeedTree验证材质表现、层级关系与整体轮廓，为后续完整植被资产组装建立可复用的枝叶模块。",
  },
  {
    stepNumber: 14,
    english: "SPEEDTREE VEGETATION ASSEMBLY",
    title: "SpeedTree整体植被制作",
    body: "在SpeedTree中完成树干、枝条和叶簇组装，通过节点结构、层级分布与轮廓调整建立完整植被形态。",
  },
  {
    stepNumber: 15,
    english: "IGTOOLS WIND SETUP",
    title: "IGTools风动制作",
    body: "使用IGTools建立植被风动数据，使主干、枝条与叶片具有不同层级的运动幅度与响应方式，并在UE中测试动态效果。",
  },
  {
    stepNumber: 16,
    english: "SPHERICAL NORMAL BAKING & SHADER BLENDING",
    title: "球形法线烘焙与Shader法线混合",
    body: "通过Blender脚本将球形法线写入顶点数据中。在UE材质中，将切线法线提供的叶片细节与球形法线提供的树冠体积进行混合，使树冠受光更加统一，同时保留必要的表面细节。",
  },
  {
    stepNumber: 17,
    english: "BILLBOARD & DISTANT REPRESENTATION",
    title: "Billboard与远景表现",
    body: "Billboard以SpeedTree完整三维植被为基础，通过Depth Preview检查树冠体积和内部层次；随后在Blender中处理顶点法线数据，并在UE中输出颜色、法线与AO贴图，重建远景植被的受光与体积。",
  },
] as const;

export const vegetationSourceFolderNumberByStep = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  11: 11,
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  17: 17,
} as const;
export const pcgLabels = [
  "Surface Projection / 表面投射",
  "Parent Points / 母点建立",
  "Child Point Generation / 子点生成",
  "Distance Falloff / 距离衰减",
  "Normal & Slope Filter / 法线与坡度过滤",
  "Moss Spawning / 苔藓生成",
] as const;
