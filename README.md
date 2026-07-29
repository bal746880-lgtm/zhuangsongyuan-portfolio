# 西福寺 / XIFO TEMPLE

面向游戏地编与环境美术岗位的单页作品集基础站。项目使用 React、Vite、TypeScript 与原生 CSS，不依赖 UI 组件库。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:5173/`。

当前 `dev` 命令会先同步素材、执行一次生产构建，再在 5173 端口启动本地预览，适合直接审核完整长页面。需要 Vite 热更新时可运行：

```bash
npm run dev:vite
```

生产构建：

```bash
npm run build
npm run preview
```

## 素材机制

- `scripts/sync-media.mjs` 递归读取桌面上的 12 个作品集章节文件夹。
- 原始素材只读；脚本仅把需要的网站媒体复制到 `public/portfolio`。
- 同步时生成 `public/portfolio/manifest.json`，页面通过该清单读取真实图片、视频与目录结构。
- 文件及子文件夹统一按文件名开头的连续数字做自然数升序；无数字前缀的内容排在编号内容之后。
- 图片使用懒加载；视频不自动播放，仅预载元数据，并限制同一时间只播放一个视频。

## 图片布局

- 单图使用 `SingleMedia` 保持大尺寸完整展示。
- 两图使用 `EqualHeightMediaRow`，统一媒体框高度并通过 `object-fit: contain`
  保留完整构图。
- 三张及以上的指定素材组使用 `ScrollDrivenGallery`。桌面端由纵向滚动进度驱动
  `translate3d()` 横向位移；平板、手机与减少动画模式使用原生横向
  `scroll-snap`。
- 各章节的布局模式集中配置在 `src/data/galleryLayouts.ts`，不由组件根据数量擅自决定。

## 当前占位内容

个人姓名为庄松源，个人照片读取自桌面“个人简介”文件夹；4 张 SD
节点图读取自桌面“SD节点展示”文件夹。无人机与跑图视频直接使用浏览器原生视频控件，
不设置独立封面；PCG 章节不展示节点总览；Billboard 流程使用植被根目录中的 `7.png`。
