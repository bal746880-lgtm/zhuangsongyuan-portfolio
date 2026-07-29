export interface CareerEntry {
  time: string;
  title: string;
  subtitle: string;
  description: string;
  tags: readonly string[];
  current?: boolean;
}

export const aboutParagraphs = [
  "我于2023年毕业于西安理工大学视觉传达专业，在校期间多次参与国家级及省级设计赛事并获得奖项。毕业后进入AI睡眠领域硬科技创业团队，参与项目从用户调研、方向验证、融资立项到产品传播和日常运营的完整过程。",
  "在两年多的创业实践中，我积累了用户研究、内容运营、产品视觉与跨职能项目推进经验。2025年重新明确长期职业方向后，我开始系统学习游戏地编与实时环境制作，并独立完成了UE5全流程环境项目《西福寺》。",
  "我擅长快速学习新工具、拆解复杂问题并持续推进落地，希望长期深耕游戏地编与环境美术，将空间规划、视觉设计与实时技术整合到完整的游戏环境制作中。",
] as const;

export const profileFacts = [
  {
    label: "姓名",
    value: "庄松源",
  },
  {
    label: "年龄",
    value: "24岁",
  },
  {
    label: "性别",
    value: "男",
  },
  {
    label: "职业方向",
    value: "游戏地编 · 环境美术",
  },
  {
    label: "专业背景",
    value: "视觉传达设计",
  },
  {
    label: "当前方向",
    value: "UE5实时环境制作",
  },
  {
    label: "核心能力",
    value: "场景规划 · 模块化资产 · 程序化材质 · 植被 · PCG",
  },
] as const;

export const awards = [
  "未来设计师·全国高校数字艺术设计大赛NCDA 国家级二等奖",
  "中国好创意暨全国数字艺术设计大赛 国家级一等奖",
  "陕西省大学生新媒体创意设计大赛 二等奖",
  "XGDA兔年生肖设计大赛 三等奖",
] as const;

export const careerPath = [
  {
    time: "2023",
    title: "西安理工大学",
    subtitle: "视觉传达专业本科毕业",
    description:
      "完成视觉传达专业学习，建立构图、色彩、信息传达与视觉表达基础；在校期间获得多项国家级及省级设计赛事奖项。",
    tags: ["视觉设计", "构图与色彩", "信息传达"],
  },
  {
    time: "2023.04—2025.06",
    title: "AI睡眠领域硬科技创业",
    subtitle: "用户研究 · 内容运营 · 产品视觉 · 项目推进",
    description:
      "参与AI睡眠项目从需求验证、用户调研、立项融资到内容传播和综合运营的完整过程。完成50名目标用户调研，研究报告作为立项依据之一；项目于2023年6月获得50万元立项支持。2024年推动B站助眠内容账号单月新增粉丝约1万，并建立可复用的内容运营工作流。",
    tags: ["用户研究", "从0到1", "内容增长", "跨职能协作"],
  },
  {
    time: "2025.06—至今",
    title: "游戏地编与环境美术",
    subtitle: "UE5实时环境制作",
    description:
      "重新明确长期职业方向后，系统学习游戏地编与环境美术，独立完成《西福寺》全流程实时环境项目，覆盖场景规划、模块化资产、程序化材质、植被、PCG、灯光与最终呈现。",
    tags: ["Level Art", "Environment Art", "UE5", "Full Pipeline"],
    current: true,
  },
] as const satisfies readonly CareerEntry[];
