# Flight Log Generator

将飞行记录（截图或文本）自动转换为专业 PDF 飞行日志的网页工具。

## 功能

- **AI 识别**：上传 note 截图或粘贴文本，AI 自动提取航班号、日期、机型等字段
- **字段编辑**：识别结果可手动修正
- **航司 Logo**：自动获取航司和联盟 logo
- **PDF 生成**：渲染专业排版的飞行日志并下载为 PDF

## 技术栈

- Next.js 16 (App Router) + TypeScript
- React 19 + TailwindCSS
- soaring-symbols（航司 logo 库）
- Anthropic Claude API（AI 识别）
- jsPDF + html2canvas（PDF 生成）

## 快速开始

```bash
# 安装依赖
npm install

# 配置 API Key
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 Anthropic API Key

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API Key | 是（或在页面中输入） |

## 使用方式

1. 打开页面，选择"上传截图"或"粘贴文本"
2. 上传你的飞行记录截图，或粘贴 note 文本
3. AI 识别后，检查并修正字段
4. 预览 PDF，确认无误后下载

## 测试数据

```
ZPPP > ZSSS

Flight Number: 8L9887
Call Sign: LKE9887
Date: Feb 25th
Type: A330-343
Reg.: B-1004
Flight Duration: 2 h 16 min
Age: 7.5 Yrs
Distance: 2042km / 1102.6nm
Cruising Alt: 39,100 ft

Dept Airport: KMG/ZPPP
Parking Bay: 129
Takeoff RWY: 22
Scheduled Dept: 8:55
Actual Dept: 9:19
Off-Chocks: 09:08
METAR: ZPPP 250100Z 22007MPS CAVOK 13/07 Q1021 NOSIG

Dest Airport: SHA/ZSSS
Landing RWY: 36R
Scheduled arrival: 12:05
Actual Arrival: 11:35
On-Chocks: 11:43
Parking Bay: 237
METAR: ZSSS 250330Z 05002MPS 030V120 9999 BKN016 09/05 Q1022 NOSIG
```
