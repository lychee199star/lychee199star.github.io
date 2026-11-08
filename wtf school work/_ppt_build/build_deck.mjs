import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "D:/codex工作区/wtf school work";
const buildDir = path.join(workspaceDir, "_ppt_build");
const outputDir = path.join(workspaceDir, "presentation_out");
const skillDir = "C:/Users/ulpian/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations";
const runtimePython = "C:/Users/ulpian/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const runtimeNodeModules = "C:/Users/ulpian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const bodyBackground = "C:/Users/ulpian/AppData/Local/Temp/codex-clipboard-75b9520d-d6c0-490f-80e6-1cb9fc624aa6.jpg";
const endBackground = "C:/Users/ulpian/AppData/Local/Temp/codex-clipboard-cc1f3c48-23dc-424f-bbef-c26139836b52.jpg";
const draftPath = path.join(buildDir, "activity_deck_draft.pptx");
const finalPath = path.join(outputDir, "信计26-1学着玩晚自习活动_v2.pptx");
const previewDir = path.join(buildDir, "previews");

const { makeNativeBulletParagraphs, finalizePresentation } = await import(
  pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href
);

const W = 1280;
const H = 720;
const FONT = "Microsoft YaHei";
const NAVY = "#243B61";
const BLUE = "#486A9D";
const PALE = "#E9EEF6";
const INK = "#172033";
const MUTED = "#58657A";
const WHITE = "#FFFFFF";
const GREEN = "#2F7D5A";
const ORANGE = "#D9802E";
const RED = "#B53A43";

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });
const bodyBackgroundBytes = await fs.readFile(bodyBackground);
const endBackgroundBytes = await fs.readFile(endBackground);

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function addImageBackground(slide, mode = "body") {
  if (mode === "end") {
    slide.background.fill = "#C7071D";
    slide.images.add({
      blob: endBackgroundBytes,
      contentType: "image/jpeg",
      alt: "红色西部风格卡通形象，作为活动结束页背景",
      fit: "contain",
      position: { left: 0, top: 0, width: W, height: H },
    });
    slide.shapes.add({
      geometry: "rect",
      position: { left: 0, top: 0, width: W, height: H },
      fill: "#250006/42",
      line: { style: "solid", fill: "none", width: 0 },
    });
    return;
  }

  slide.images.add({
    blob: bodyBackgroundBytes,
    contentType: "image/jpeg",
    alt: "蓝灰色卡通人物拼贴背景",
    fit: "cover",
    position: { left: 0, top: 0, width: W, height: H },
  });
  const opacity = mode === "cover" ? 72 : mode === "prompt" ? 82 : 89;
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: W, height: H },
    fill: `#FFFFFF/${opacity}`,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function addText(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: FONT,
    fontSize: 24,
    color: INK,
    autoFit: "shrinkText",
    verticalAlignment: "middle",
    insets: 0,
    ...style,
  };
  return shape;
}

function addTitle(slide, title, section = "") {
  if (section) {
    addText(slide, section, { left: 64, top: 40, width: 180, height: 26 }, {
      fontSize: 16,
      bold: true,
      color: BLUE,
      alignment: "left",
    });
  }
  addText(slide, title, { left: 64, top: 72, width: 1120, height: 62 }, {
    fontSize: 36,
    bold: true,
    color: INK,
    alignment: "left",
  });
  slide.shapes.add({
    geometry: "rect",
    position: { left: 64, top: 142, width: 112, height: 5 },
    fill: BLUE,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function addFooter(slide, pageNumber) {
  addText(slide, "信计26-1  班级学着玩晚自习活动", { left: 64, top: 682, width: 420, height: 18 }, {
    fontSize: 12,
    color: MUTED,
  });
  addText(slide, String(pageNumber).padStart(2, "0"), { left: 1170, top: 680, width: 46, height: 20 }, {
    fontSize: 12,
    color: MUTED,
    alignment: "right",
  });
}

function newSlide({ title, section, mode = "body", notes = "" } = {}) {
  const slide = presentation.slides.add();
  addImageBackground(slide, mode);
  if (title) addTitle(slide, title, section);
  if (mode !== "end") addFooter(slide, presentation.slides.items.length);
  if (notes) {
    slide.speakerNotes.text = notes;
    slide.speakerNotes.setVisible(true);
  }
  return slide;
}

function addBullets(slide, items, position, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = makeNativeBulletParagraphs(items, {
    marginLeftPoints: options.marginLeftPoints ?? 20,
    hangingPoints: options.hangingPoints ?? 9,
    spaceAfterPoints: options.spaceAfterPoints ?? 9,
  });
  shape.text.style = {
    typeface: FONT,
    fontSize: options.fontSize ?? 24,
    color: options.color ?? INK,
    lineSpacing: options.lineSpacing ?? 1.18,
    autoFit: "shrinkText",
    verticalAlignment: "top",
    insets: 0,
  };
  return shape;
}

function addRuleBand(slide, text, color = NAVY) {
  slide.shapes.add({
    geometry: "roundRect",
    position: { left: 64, top: 596, width: 1152, height: 62 },
    fill: `${color}/92`,
    line: { style: "solid", fill: "none", width: 0 },
    borderRadius: 18,
  });
  addText(slide, text, { left: 92, top: 606, width: 1096, height: 42 }, {
    fontSize: 21,
    bold: true,
    color: WHITE,
    alignment: "center",
  });
}

function addPromptSlide(groupLabel, prompt, round, notes = "") {
  const slide = newSlide({ mode: "prompt", notes });
  addText(slide, `你画我猜  第${round}轮`, { left: 64, top: 54, width: 520, height: 40 }, {
    fontSize: 24,
    bold: true,
    color: BLUE,
  });
  addText(slide, groupLabel, { left: 1010, top: 54, width: 206, height: 40 }, {
    fontSize: 22,
    bold: true,
    color: NAVY,
    alignment: "right",
  });
  addText(slide, "只让画手看屏幕", { left: 160, top: 145, width: 960, height: 58 }, {
    fontSize: 30,
    bold: true,
    color: RED,
    alignment: "center",
  });
  addText(slide, prompt, { left: 104, top: 236, width: 1072, height: 190 }, {
    fontSize: prompt.length > 8 ? 50 : 66,
    bold: true,
    color: INK,
    alignment: "center",
    verticalAlignment: "middle",
  });
  addRuleBand(slide, "猜题成员背对屏幕  60秒内自由回答  画手不能写文字或拼音");
  return slide;
}

function addActionPrompt(prompt, round) {
  const slide = newSlide({
    mode: "prompt",
    notes: `第${round}轮。只让每组第一位同学看屏幕约10秒，随后立刻切换到下一页。`,
  });
  addText(slide, `动作传声筒  第${round}轮`, { left: 64, top: 58, width: 480, height: 40 }, {
    fontSize: 24,
    bold: true,
    color: BLUE,
  });
  addText(slide, "只让每组第一位同学看屏幕", { left: 180, top: 150, width: 920, height: 58 }, {
    fontSize: 30,
    bold: true,
    color: RED,
    alignment: "center",
  });
  addText(slide, prompt, { left: 110, top: 240, width: 1060, height: 160 }, {
    fontSize: prompt.length > 10 ? 52 : 64,
    bold: true,
    color: INK,
    alignment: "center",
  });
  addRuleBand(slide, "记住动作和情景  10秒后翻页  不要出声提醒队友");
}

function addActionStart(round) {
  const slide = newSlide({
    mode: "prompt",
    notes: `第${round}轮开始传递。主持人计时2分钟，最后一名直接说出答案。`,
  });
  addText(slide, `第${round}轮`, { left: 64, top: 64, width: 180, height: 40 }, {
    fontSize: 22,
    bold: true,
    color: BLUE,
  });
  addText(slide, "开始传递", { left: 180, top: 190, width: 920, height: 110 }, {
    fontSize: 70,
    bold: true,
    color: NAVY,
    alignment: "center",
  });
  addText(slide, "不能说话  不能写字  每人只完整表演一次", { left: 150, top: 338, width: 980, height: 54 }, {
    fontSize: 28,
    color: INK,
    alignment: "center",
  });
  addRuleBand(slide, "最后一位准备回答  猜对2分  意思接近1分");
}

function addRouteSlide(label, obstacles, target, notes) {
  const slide = newSlide({
    title: `盲人机器人  路线${label}`,
    section: "第二环节",
    notes,
  });
  addText(slide, "按图摆放纸杯  程序员看屏幕  机器人闭眼", { left: 716, top: 82, width: 500, height: 44 }, {
    fontSize: 22,
    color: MUTED,
    alignment: "right",
  });

  slide.shapes.add({
    geometry: "roundRect",
    position: { left: 86, top: 172, width: 1108, height: 390 },
    fill: "#FFFFFF/72",
    line: { style: "solid", fill: "#8CA0BE", width: 2 },
    borderRadius: 22,
  });

  const startX = 132;
  const startY = 476;
  slide.shapes.add({
    geometry: "ellipse",
    position: { left: startX, top: startY, width: 74, height: 74 },
    fill: GREEN,
    line: { style: "solid", fill: WHITE, width: 3 },
  });
  addText(slide, "起点", { left: startX, top: startY + 18, width: 74, height: 34 }, {
    fontSize: 18,
    bold: true,
    color: WHITE,
    alignment: "center",
  });

  obstacles.forEach(([x, y], index) => {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x, top: y, width: 54, height: 54 },
      fill: "#D8E0EC",
      line: { style: "solid", fill: NAVY, width: 2 },
    });
    addText(slide, String(index + 1), { left: x, top: y + 8, width: 54, height: 36 }, {
      fontSize: 17,
      bold: true,
      color: NAVY,
      alignment: "center",
    });
  });

  slide.shapes.add({
    geometry: "ellipse",
    position: { left: target[0], top: target[1], width: 84, height: 84 },
    fill: ORANGE,
    line: { style: "solid", fill: WHITE, width: 3 },
  });
  addText(slide, "目标物", { left: target[0], top: target[1] + 22, width: 84, height: 38 }, {
    fontSize: 18,
    bold: true,
    color: WHITE,
    alignment: "center",
  });
  addRuleBand(slide, "安全员贴近跟随  碰到障碍扣1分  完成任务得5分");
}

// 1  封面
{
  const slide = newSlide({
    mode: "cover",
    notes: "开场页。主持人确认分组材料、计时器和安全路线已经准备完成。背景素材由用户提供。",
  });
  addText(slide, "班级学着玩", { left: 120, top: 175, width: 1040, height: 104 }, {
    fontSize: 66,
    bold: true,
    color: INK,
    alignment: "center",
  });
  addText(slide, "晚自习团队活动", { left: 250, top: 292, width: 780, height: 52 }, {
    fontSize: 32,
    color: NAVY,
    alignment: "center",
  });
  slide.shapes.add({
    geometry: "roundRect",
    position: { left: 430, top: 390, width: 420, height: 72 },
    fill: `${NAVY}/92`,
    line: { style: "solid", fill: "none", width: 0 },
    borderRadius: 22,
  });
  addText(slide, "信计26-1", { left: 430, top: 402, width: 420, height: 48 }, {
    fontSize: 30,
    bold: true,
    color: WHITE,
    alignment: "center",
  });
  addText(slide, "游戏为主  团队合作  轻量学习  全员参与", { left: 210, top: 514, width: 860, height: 46 }, {
    fontSize: 24,
    color: MUTED,
    alignment: "center",
  });
}

// 2  流程
{
  const slide = newSlide({
    title: "今晚流程",
    section: "活动总览",
    notes: "总时长约120分钟。若前面环节超时，优先减少你画我猜第二轮题目。",
  });
  const stages = [
    ["组队", "10分钟"], ["传声筒", "15分钟"], ["机器人", "20分钟"], ["纠错", "15分钟"],
    ["休息", "10分钟"], ["逻辑接力", "20分钟"], ["你画我猜", "20分钟"], ["卡片颁奖", "10分钟"],
  ];
  const left = 72;
  const top = 218;
  const boxW = 136;
  const gap = 8;
  stages.forEach(([name, time], index) => {
    const x = left + index * (boxW + gap);
    slide.shapes.add({
      geometry: "roundRect",
      position: { left: x, top, width: boxW, height: 160 },
      fill: index % 2 === 0 ? `${NAVY}/92` : `${BLUE}/90`,
      line: { style: "solid", fill: WHITE, width: 2 },
      borderRadius: 18,
    });
    addText(slide, String(index + 1).padStart(2, "0"), { left: x, top: top + 18, width: boxW, height: 30 }, {
      fontSize: 16, bold: true, color: "#DDE7F5", alignment: "center",
    });
    addText(slide, name, { left: x + 8, top: top + 58, width: boxW - 16, height: 42 }, {
      fontSize: 22, bold: true, color: WHITE, alignment: "center",
    });
    addText(slide, time, { left: x + 8, top: top + 112, width: boxW - 16, height: 28 }, {
      fontSize: 16, color: "#EDF3FB", alignment: "center",
    });
  });
  addRuleBand(slide, "全程累计积分  不设置淘汰  每个环节更换代表");
}

// 3  分组与计分
{
  const slide = newSlide({
    title: "分组与计分",
    section: "活动总览",
    notes: "45人分6组。前三组8人，后三组7人。用两副牌背颜色不同的扑克牌随机分组。",
  });
  addText(slide, "45人分为6组", { left: 78, top: 184, width: 470, height: 52 }, {
    fontSize: 30, bold: true, color: NAVY,
  });
  addBullets(slide, [
    "第1至3组各8人，第4至6组各7人",
    "按牌背颜色和花色寻找小组",
    "每组确定组长、记录员、材料员和安全员",
    "每轮更换表演、绘画、答题或指挥代表",
  ], { left: 82, top: 250, width: 520, height: 270 }, { fontSize: 23, spaceAfterPoints: 11 });

  addText(slide, "积分和奖项", { left: 690, top: 184, width: 470, height: 52 }, {
    fontSize: 30, bold: true, color: NAVY,
  });
  addBullets(slide, [
    "各环节得分直接写在黑板计分表",
    "总分只作为参考，不设置惩罚",
    "奖项包括合作、逻辑、表达和气氛",
    "出现争议时由主持人现场裁定",
  ], { left: 694, top: 250, width: 486, height: 270 }, { fontSize: 23, spaceAfterPoints: 11 });
  addRuleBand(slide, "同一名同学不能连续包办  每个人至少承担一次角色");
}

// 4  动作传声筒规则
{
  const slide = newSlide({
    title: "动作传声筒",
    section: "第一环节  15分钟",
    notes: "每轮约4分钟，共3轮。开始前让每组排成一列，除第一位外全部背对屏幕。",
  });
  addBullets(slide, [
    "每组排成一列，第一位看题目，其余人背对屏幕",
    "第一位只用动作传给第二位，依次传到最后一位",
    "最后一位直接回答，答对得2分，意思接近得1分",
    "不能说话、写字、发提示音或做明显嘴型",
    "每两人之间只能完整表演一次",
  ], { left: 90, top: 188, width: 760, height: 330 }, { fontSize: 26, spaceAfterPoints: 13 });
  addText(slide, "3轮", { left: 930, top: 224, width: 210, height: 100 }, {
    fontSize: 58, bold: true, color: BLUE, alignment: "center",
  });
  addText(slide, "第二轮倒转队伍顺序\n保证不同同学担任首尾", { left: 890, top: 342, width: 290, height: 110 }, {
    fontSize: 23, color: MUTED, alignment: "center",
  });
  addRuleBand(slide, "先看清题目  再用夸张但准确的动作传递");
}

addActionPrompt("机器人参加早八", 1);
addActionStart(1);
addActionPrompt("食堂排队时突然停电", 2);
addActionStart(2);
addActionPrompt("电脑死机后疯狂敲键盘", 3);
addActionStart(3);

// 11  盲人机器人规则
{
  const slide = newSlide({
    title: "盲人机器人",
    section: "第二环节  20分钟",
    notes: "六组分两批进行，每批三组。每条路线由机器人、程序员和安全员共同完成。",
  });
  addText(slide, "允许使用的指令", { left: 84, top: 182, width: 500, height: 46 }, {
    fontSize: 28, bold: true, color: NAVY,
  });
  addBullets(slide, [
    "向前一步  向后一步",
    "左转  右转",
    "向左移动  向右移动",
    "蹲下  伸手  停止",
  ], { left: 90, top: 242, width: 500, height: 250 }, { fontSize: 25, spaceAfterPoints: 10 });
  addText(slide, "规则和安全", { left: 674, top: 182, width: 500, height: 46 }, {
    fontSize: 28, bold: true, color: NAVY,
  });
  addBullets(slide, [
    "程序员只能使用固定指令",
    "机器人碰到障碍扣1分",
    "安全员贴近跟随，危险时立即叫停",
    "禁止奔跑、跨桌椅或使用硬物",
  ], { left: 680, top: 242, width: 500, height: 250 }, { fontSize: 25, spaceAfterPoints: 10 });
  addRuleBand(slide, "完成任务得5分  最快且无失误的小组加2分", ORANGE);
}

addRouteSlide("A", [[330, 440], [430, 300], [590, 420], [720, 280], [850, 420]], [1030, 220], "第一批或第一条路线。按投影位置摆放5个纸杯。机器人从左下方出发。 ");
addRouteSlide("B", [[280, 300], [430, 430], [580, 260], [730, 420], [900, 310]], [1030, 450], "第二条路线。目标物在右下方，提醒程序员使用转向和横向移动指令。 ");
addRouteSlide("C", [[310, 410], [480, 250], [620, 410], [760, 250], [900, 410]], [1030, 230], "第三条路线。障碍呈折线排列，安全员重点关注转弯位置。 ");

// 15  信息纠错规则
{
  const slide = newSlide({
    title: "信息纠错挑战",
    section: "第三环节  15分钟",
    notes: "两道题。每道题先给3分钟小组讨论，再切换答案页核对并计分。",
  });
  addBullets(slide, [
    "找出错别字、时间矛盾、重复或顺序错误",
    "把修订后的完整内容写在答题纸上",
    "每正确修正一处得1分，完整还原额外得2分",
    "交换检查时只讨论答案，不评价字迹和个人能力",
  ], { left: 90, top: 198, width: 720, height: 300 }, { fontSize: 27, spaceAfterPoints: 14 });
  addText(slide, "两道题", { left: 900, top: 230, width: 240, height: 90 }, {
    fontSize: 50, bold: true, color: BLUE, alignment: "center",
  });
  addText(slide, "先独立找问题\n再小组统一答案", { left: 900, top: 350, width: 240, height: 100 }, {
    fontSize: 24, color: MUTED, alignment: "center",
  });
  addRuleBand(slide, "完成后举起队牌  主持人确认后再翻到答案页");
}

// 16  纠错题1
{
  const slide = newSlide({
    title: "纠错题一  班会通知",
    section: "第三环节",
    notes: "计时3分钟。要求各组找出4处问题并写出完整修改稿。",
  });
  addText(slide, "请找出4处问题，并写出修改后的完整通知", { left: 80, top: 176, width: 1120, height: 46 }, {
    fontSize: 25, bold: true, color: RED, alignment: "center",
  });
  slide.shapes.add({
    geometry: "roundRect",
    position: { left: 100, top: 252, width: 1080, height: 260 },
    fill: "#FFFFFF/78",
    line: { style: "solid", fill: "#97A8C1", width: 2 },
    borderRadius: 24,
  });
  addText(slide, "明天下午7点，请全班同学在上午6点到教学楼参加班会。\n请大家提前10分钟迟到，并携带只和笔。\n班会地点在三教205和三教305。", { left: 145, top: 286, width: 990, height: 188 }, {
    fontSize: 32, color: INK, alignment: "center", lineSpacing: 1.3,
  });
  addRuleBand(slide, "讨论时间3分钟  修改内容必须完整  只圈错误不计分");
}

// 17  纠错答案1
{
  const slide = newSlide({
    title: "纠错题一  参考答案",
    section: "第三环节",
    notes: "逐项核对：时间矛盾、提前迟到、只和笔、地点重复。每正确修改一处得1分，完整通知加2分。",
  });
  addText(slide, "发现的问题", { left: 92, top: 182, width: 410, height: 44 }, {
    fontSize: 28, bold: true, color: NAVY,
  });
  addBullets(slide, [
    "下午7点和上午6点互相矛盾",
    "提前10分钟迟到表达错误",
    "只和笔中的只应为纸",
    "班会地点不能同时写两个教室",
  ], { left: 96, top: 242, width: 510, height: 255 }, { fontSize: 24, spaceAfterPoints: 10 });
  addText(slide, "修改后的通知", { left: 680, top: 182, width: 410, height: 44 }, {
    fontSize: 28, bold: true, color: GREEN,
  });
  addText(slide, "明天下午7点，请全班同学到三教205参加班会。\n请大家提前10分钟到场，并携带纸和笔。", { left: 680, top: 260, width: 500, height: 170 }, {
    fontSize: 28, color: INK, lineSpacing: 1.35,
  });
  addRuleBand(slide, "每修正一处得1分  完整还原再加2分", GREEN);
}

// 18  纠错题2
{
  const slide = newSlide({
    title: "文件操作纠错",
    section: "第三环节",
    notes: "计时3分钟。各组把6个步骤按正确顺序写在答题纸上。",
  });
  addText(slide, "把下面6个步骤恢复为正确顺序", { left: 80, top: 176, width: 1120, height: 46 }, {
    fontSize: 27, bold: true, color: RED, alignment: "center",
  });
  const steps = [
    ["A", "关闭电脑"], ["B", "输入内容"], ["C", "启动电脑"],
    ["D", "保存文件"], ["E", "打开文档"], ["F", "检查文件是否保存成功"],
  ];
  steps.forEach(([letter, text], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 150 + col * 510;
    const y = 250 + row * 98;
    addText(slide, letter, { left: x, top: y, width: 58, height: 58 }, {
      fontSize: 24, bold: true, color: WHITE, alignment: "center",
    }).fill = NAVY;
    addText(slide, text, { left: x + 78, top: y, width: 390, height: 58 }, {
      fontSize: 27, bold: true, color: INK,
    });
  });
  addRuleBand(slide, "写出字母顺序  讨论时间3分钟");
}

// 19  纠错答案2
{
  const slide = newSlide({
    title: "纠错题二  参考答案",
    section: "第三环节",
    notes: "正确顺序为C、E、B、D、F、A。完整答对得6分，能够解释顺序再加1分。",
  });
  addText(slide, "C  E  B  D  F  A", { left: 160, top: 210, width: 960, height: 110 }, {
    fontSize: 68, bold: true, color: NAVY, alignment: "center",
  });
  addText(slide, "启动电脑  打开文档  输入内容  保存文件\n检查文件是否保存成功  关闭电脑", { left: 160, top: 346, width: 960, height: 120 }, {
    fontSize: 30, color: INK, alignment: "center", lineSpacing: 1.35,
  });
  addRuleBand(slide, "顺序全部正确得6分  能说明理由再加1分", GREEN);
}

// 20  中场休息
{
  const slide = newSlide({
    mode: "cover",
    notes: "休息10分钟。主持人统计前半场积分，补充材料并调整后半场座位。",
  });
  addText(slide, "中场休息", { left: 180, top: 190, width: 920, height: 110 }, {
    fontSize: 68, bold: true, color: NAVY, alignment: "center",
  });
  addText(slide, "10分钟", { left: 390, top: 330, width: 500, height: 88 }, {
    fontSize: 52, bold: true, color: BLUE, alignment: "center",
  });
  addText(slide, "回来后进入逻辑题接力", { left: 300, top: 456, width: 680, height: 52 }, {
    fontSize: 27, color: MUTED, alignment: "center",
  });
}

// 21  逻辑接力规则
{
  const slide = newSlide({
    title: "逻辑题接力",
    section: "第四环节  20分钟",
    notes: "每名成员至少负责一道题。7人组由一名成员额外负责H题。答出八个数字后翻到解码页。",
  });
  addBullets(slide, [
    "每名成员负责一道题，先独立思考再向小组讲解",
    "把A至H八个答案按顺序排列",
    "使用A等于1、B等于2的字母表完成解码",
    "每答对一题得1分，解出密码得3分",
    "每组有两次求助机会，不能直接代答",
  ], { left: 90, top: 188, width: 750, height: 330 }, { fontSize: 25, spaceAfterPoints: 12 });
  addText(slide, "A = 1\nB = 2\n…\nZ = 26", { left: 930, top: 218, width: 220, height: 220 }, {
    fontSize: 34, bold: true, color: NAVY, alignment: "center", lineSpacing: 1.3,
  });
  addRuleBand(slide, "完成后举起队牌  必须能说明每道题的思路");
}

// 22  A-D
{
  const slide = newSlide({
    title: "逻辑题接力  A至D",
    section: "第四环节",
    notes: "主持人开始计时。每组成员自行认领题目，不必按座位顺序。",
  });
  const qs = [
    ["A", "数列  2，5，9，14，下一项是多少"],
    ["B", "计算  1＋2＋3＋4＋5"],
    ["C", "盒中有12支笔，拿走5支，还剩多少支"],
    ["D", "8名同学中有3人去取材料，原地还剩几人"],
  ];
  qs.forEach(([letter, q], index) => {
    const y = 185 + index * 98;
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: 90, top: y, width: 58, height: 58 },
      fill: NAVY,
      line: { style: "solid", fill: WHITE, width: 2 },
    });
    addText(slide, letter, { left: 90, top: y + 7, width: 58, height: 42 }, {
      fontSize: 22, bold: true, color: WHITE, alignment: "center",
    });
    addText(slide, q, { left: 178, top: y, width: 960, height: 58 }, {
      fontSize: 29, color: INK,
    });
  });
  addRuleBand(slide, "每人先完成自己负责的题  再向组员讲解");
}

// 23  E-H
{
  const slide = newSlide({
    title: "逻辑题接力  E至H",
    section: "第四环节",
    notes: "提醒各组把答案依次写成八个数字。",
  });
  const qs = [
    ["E", "计算  25－5"],
    ["F", "数列  1，1，2，3，5，下一项是多少"],
    ["G", "一个五边形有多少条边"],
    ["H", "长5、宽4的长方形，周长是多少"],
  ];
  qs.forEach(([letter, q], index) => {
    const y = 185 + index * 98;
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: 90, top: y, width: 58, height: 58 },
      fill: BLUE,
      line: { style: "solid", fill: WHITE, width: 2 },
    });
    addText(slide, letter, { left: 90, top: y + 7, width: 58, height: 42 }, {
      fontSize: 22, bold: true, color: WHITE, alignment: "center",
    });
    addText(slide, q, { left: 178, top: y, width: 960, height: 58 }, {
      fontSize: 29, color: INK,
    });
  });
  addRuleBand(slide, "八个答案按A至H顺序排列  准备进入解码");
}

// 24 解码
{
  const slide = newSlide({
    title: "最终密码",
    section: "第四环节",
    notes: "各组用A等于1、B等于2的规则把数字换成英文字母。计时3分钟。",
  });
  addText(slide, "A = 1   B = 2   C = 3   …   Z = 26", { left: 180, top: 176, width: 920, height: 54 }, {
    fontSize: 26, bold: true, color: BLUE, alignment: "center",
  });
  const codes = [20, 15, 7, 5, 20, 8, 5, 18];
  codes.forEach((code, index) => {
    const x = 92 + index * 139;
    slide.shapes.add({
      geometry: "roundRect",
      position: { left: x, top: 278, width: 108, height: 108 },
      fill: index % 2 === 0 ? NAVY : BLUE,
      line: { style: "solid", fill: WHITE, width: 2 },
      borderRadius: 18,
    });
    addText(slide, String(code), { left: x, top: 298, width: 108, height: 58 }, {
      fontSize: 38, bold: true, color: WHITE, alignment: "center",
    });
    addText(slide, "____", { left: x, top: 416, width: 108, height: 36 }, {
      fontSize: 24, color: NAVY, alignment: "center",
    });
  });
  addRuleBand(slide, "解出一个由8个字母组成的英文单词  完成后举队牌");
}

// 25 答案
{
  const slide = newSlide({
    title: "最终密码  答案",
    section: "第四环节",
    notes: "答案是TOGETHER。请最先完成的小组说明至少两道题的思路，再确认得分。",
  });
  addText(slide, "TOGETHER", { left: 120, top: 214, width: 1040, height: 130 }, {
    fontSize: 78, bold: true, color: NAVY, alignment: "center",
  });
  addText(slide, "一起合作", { left: 280, top: 374, width: 720, height: 72 }, {
    fontSize: 40, bold: true, color: GREEN, alignment: "center",
  });
  addRuleBand(slide, "每题1分  最终密码3分  讲解清楚再加2分", GREEN);
}

// 26 你画我猜规则
{
  const slide = newSlide({
    title: "专业词语你画我猜",
    section: "第五环节  20分钟",
    notes: "每组两道题。画手面对屏幕，猜题成员背对屏幕。主持人每题计时60秒。",
  });
  addBullets(slide, [
    "画手面对屏幕，猜题成员背对屏幕",
    "画手可以画图，不能写文字、拼音、数字或首字母",
    "第一轮普通题猜对得1分，第二轮混合题得2分",
    "每组有一次跳过机会",
    "每题结束后立刻更换画手",
  ], { left: 90, top: 188, width: 760, height: 330 }, { fontSize: 26, spaceAfterPoints: 13 });
  addText(slide, "12题", { left: 930, top: 220, width: 220, height: 90 }, {
    fontSize: 54, bold: true, color: BLUE, alignment: "center",
  });
  addText(slide, "每组2题\n每题60秒", { left: 930, top: 344, width: 220, height: 96 }, {
    fontSize: 25, color: MUTED, alignment: "center",
  });
  addRuleBand(slide, "组员背对屏幕  画手看清题目后马上开始");
}

const roundOne = ["坐标轴", "电脑死机", "鼠标", "机器人", "食堂排队", "宿舍熄灯"];
const roundTwo = ["机器人参加早八", "用坐标轴寻找教室", "电脑考试突然死机", "人工智能点奶茶", "概率决定午饭", "函数图像坐过山车"];
roundOne.forEach((prompt, index) => addPromptSlide(`第${index + 1}组`, prompt, 1, `第${index + 1}组第一轮题目。主持人计时60秒，猜对得1分。`));
roundTwo.forEach((prompt, index) => addPromptSlide(`第${index + 1}组`, prompt, 2, `第${index + 1}组第二轮题目。主持人计时60秒，猜对得2分。`));

// 39 印象卡片与颁奖
{
  const slide = newSlide({
    title: "印象卡片与颁奖",
    section: "第六环节  10分钟",
    notes: "每人抽取本组一名同学，写一句具体的祝福、感谢或有趣印象。分享自愿，不强迫朗读。",
  });
  addText(slide, "印象卡片", { left: 82, top: 184, width: 470, height: 50 }, {
    fontSize: 30, bold: true, color: NAVY,
  });
  addBullets(slide, [
    "抽取本组一名同学，抽到自己时重抽",
    "写一句具体、积极、真诚的印象",
    "不写外貌评价、负面玩笑或成绩比较",
    "分享采取自愿原则",
  ], { left: 86, top: 250, width: 520, height: 260 }, { fontSize: 23, spaceAfterPoints: 10 });
  addText(slide, "奖项", { left: 690, top: 184, width: 470, height: 50 }, {
    fontSize: 30, bold: true, color: NAVY,
  });
  addBullets(slide, [
    "最佳合作组",
    "最强逻辑组",
    "最佳表达组",
    "气氛担当组",
    "温暖同伴组",
  ], { left: 694, top: 250, width: 450, height: 260 }, { fontSize: 24, spaceAfterPoints: 8 });
  addRuleBand(slide, "领取卡片后面向讲台  公布奖项并进行班级合影", GREEN);
}

// 40 结束页
{
  const slide = newSlide({
    mode: "end",
    notes: "活动结束页。发放剩余卡片和奖品，组织合影并回收眼罩、纸杯和题卡。背景素材由用户提供。",
  });
  addText(slide, "谢谢参与", { left: 150, top: 178, width: 980, height: 112 }, {
    fontSize: 72, bold: true, color: WHITE, alignment: "center",
  });
  addText(slide, "信计26-1", { left: 390, top: 330, width: 500, height: 64 }, {
    fontSize: 34, bold: true, color: "#FFE3A0", alignment: "center",
  });
  addText(slide, "请领取印象卡片  一起完成班级合影", { left: 240, top: 470, width: 800, height: 54 }, {
    fontSize: 28, color: WHITE, alignment: "center",
  });
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

for (const [index, slide] of presentation.slides.items.entries()) {
  const fileName = `slide-${String(index + 1).padStart(2, "0")}.png`;
  const png = await presentation.export({ slide, format: "png", scale: 1 });
  await writeBlob(path.join(previewDir, fileName), png);
}

const montage = await presentation.export({ format: "webp", montage: true });
await writeBlob(path.join(buildDir, "montage.webp"), montage);

const draft = await PresentationFile.exportPptx(presentation);
await draft.save(draftPath);

const requirements = {
  workspaceDir,
  candidatePath: draftPath,
  finalPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, "validation-v2.json"),
};

process.env.RUNTIME_NODE_MODULES = runtimeNodeModules;
await finalizePresentation(requirements);
console.log(JSON.stringify({ finalPath, slideCount: presentation.slides.items.length }));
