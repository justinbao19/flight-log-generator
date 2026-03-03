# Flight Log Generator — 版本分层规划

> Free / Pro 两个版本在飞行日志字段、展示方式、API 使用上的完整对比。

---

## 目录

- [1. 分层原则](#1-分层原则)
- [2. 字段对比总表](#2-字段对比总表)
- [3. 各区域详细说明](#3-各区域详细说明)
- [4. 天气展示策略](#4-天气展示策略)
- [5. API / 数据源对照](#5-api--数据源对照)
- [6. Sample Data — Free vs Pro](#6-sample-data--free-vs-pro)
- [7. PDF 输出差异](#7-pdf-输出差异)
- [8. 功能限制维度](#8-功能限制维度)

---

## 1. 分层原则

| 维度 | Free 版 | Pro 版 |
|------|---------|--------|
| **目标用户** | 普通旅客、航空爱好者 | 飞行员、航空从业者、深度爱好者 |
| **核心体验** | 记录"我的这次飞行"，可分享的精美卡片 | 专业飞行运营日志，接近飞行员 logbook |
| **字段选择逻辑** | 登机牌上有的 + 容易理解的 + 有情感价值的 | 全部字段，包含运营级数据 |
| **数据获取门槛** | 用户无需专业知识即可填写 | 部分字段需要专业来源（ADS-B、ATC 等） |
| **显示模式** | Standard 模式（完整标签 + km + 天气摘要） | Standard + Professional 模式可切换 |

---

## 2. 字段对比总表

✅ = 包含 &nbsp;&nbsp; ❌ = 不包含 &nbsp;&nbsp; 🔒 = Pro 独占

### General Flight Info

| # | 字段 | 数据路径 | Free | Pro | 说明 |
|---|------|----------|:----:|:---:|------|
| 1 | 航班号 | `flightNumber` | ✅ | ✅ | 核心标识 |
| 2 | 呼号 | `callSign` | ❌ | 🔒 | ATC 术语，普通用户不了解 |
| 3 | 日期 | `date` | ✅ | ✅ | 基础信息 |
| 4 | 机型 | `aircraftType` | ✅ | ✅ | 爱好者关心，可自动填充 |
| 5 | 注册号 | `registration` | ✅ | ✅ | 爱好者基本需求，照片搜索依赖此字段 |
| 6 | 飞行时长 | `flightDuration` | ✅ | ✅ | 高感知价值，可自动计算 |
| 7 | 机龄 | `aircraftAge` | ❌ | 🔒 | 进阶信息 |
| 8 | 巡航高度 | `cruisingAltitude` | ❌ | 🔒 | 运营数据（FL 表示法对大众不友好） |
| 9 | 距离 | `distance` | ✅ (km) | ✅ (km + nm) | Free 仅显示公里，Pro 可切换海里 |
| 10 | 主要航路点 | `majorWaypoints` | ❌ | 🔒 | 五字代码对大众无意义 |

### Departure Info

| # | 字段 | 数据路径 | Free | Pro | 说明 |
|---|------|----------|:----:|:---:|------|
| 11 | 出发机场名 | `departure.airport.name` | ✅ | ✅ | 核心信息 |
| 12 | IATA 代码 | `departure.airport.iata` | ✅ | ✅ | 三字码广为人知（SHA、PEK） |
| 13 | ICAO 代码 | `departure.airport.icao` | ❌ | 🔒 | 四字码是专业领域用的 |
| 14 | 停机位 | `departure.parkingBay` | ❌ | 🔒 | 运营数据 |
| 15 | 起飞跑道 | `departure.runway` | ❌ | 🔒 | 运营数据 |
| 16 | 计划出发 | `departure.scheduledTime` | ✅ | ✅ | 登机牌上有 |
| 17 | 实际出发 | `departure.actualTime` | ❌ | 🔒 | 需要专业数据源 |
| 18 | Off-Chocks | `departure.offChocks` | ❌ | 🔒 | 专业运营数据 |
| 19 | 出发天气 | `departure.metar` | ✅ (解码) | ✅ (原始 METAR) | 见 [天气展示策略](#4-天气展示策略) |
| 20 | UTC 时区 | `departure.utcOffset` | ✅ | ✅ | 跟随机场自动填充 |

### Arrival Info

| # | 字段 | 数据路径 | Free | Pro | 说明 |
|---|------|----------|:----:|:---:|------|
| 21 | 到达机场名 | `arrival.airport.name` | ✅ | ✅ | 核心信息 |
| 22 | IATA 代码 | `arrival.airport.iata` | ✅ | ✅ | 三字码广为人知 |
| 23 | ICAO 代码 | `arrival.airport.icao` | ❌ | 🔒 | 四字码专业用途 |
| 24 | 降落跑道 | `arrival.runway` | ❌ | 🔒 | 运营数据 |
| 25 | 停机位 | `arrival.parkingBay` | ❌ | 🔒 | 运营数据 |
| 26 | 计划到达 | `arrival.scheduledTime` | ✅ | ✅ | 登机牌上有 |
| 27 | 实际到达 | `arrival.actualTime` | ❌ | 🔒 | 需要专业数据源 |
| 28 | On-Chocks | `arrival.onChocks` | ❌ | 🔒 | 专业运营数据 |
| 29 | 到达天气 | `arrival.metar` | ✅ (解码) | ✅ (原始 METAR) | 见 [天气展示策略](#4-天气展示策略) |
| 30 | UTC 时区 | `arrival.utcOffset` | ✅ | ✅ | 跟随机场自动填充 |

### Passenger Info

| # | 字段 | 数据路径 | Free | Pro | 说明 |
|---|------|----------|:----:|:---:|------|
| 31 | 座位号 | `seatNumber` | ✅ | ✅ | 个人记录 |
| 32 | 舱位 | `cabinClass` | ✅ | ✅ | 个人记录 |
| 33 | 行李牌 | `bagTag` | ❌ | 🔒 | 当前未在 PDF 中渲染，预留字段 |

### Media

| # | 字段 | 数据路径 | Free | Pro | 说明 |
|---|------|----------|:----:|:---:|------|
| 34 | 飞机照片 | `selectedPhoto` | ✅ | ✅ | 视觉核心，提升分享欲 |
| 35 | 登机牌 | `boardingPass` | ✅ | ✅ | 核心功能 |

### 汇总

| 版本 | 可用字段数 | 占比 |
|------|-----------|------|
| **Free** | ~20 | 57% |
| **Pro** | ~35（全部） | 100% |

---

## 3. 各区域详细说明

### 3.1 General Flight Info

**Free 版保留理由：**
- 航班号、日期、机型、注册号、飞行时长、距离 — 构成"我坐了什么飞机从哪到哪"的完整叙事
- 注册号保留是因为飞机照片搜索功能依赖它

**Pro 独占理由：**
- 呼号（`CES5137`）— 普通旅客不知道自己航班的 ATC 呼号
- 机龄 — 进阶信息，需额外数据源
- 巡航高度（`FL276`）— Flight Level 表示法对大众不友好
- 航路点（`POMOK - PIMOL - UDINO`）— 五字代码航路点对大众无意义

### 3.2 Departure / Arrival Info

**Free 版保留理由：**
- 机场名 + IATA — 人人都认识 "SHA"、"PKX"
- 计划时间 — 登机牌上就有
- 天气（解码后） — 情感价值高，详见下节

**Pro 独占理由：**
- ICAO 四字码 — 专业领域用语
- 停机位、跑道 — 运营数据，普通旅客无从知晓
- 实际时间 — 需要 FlightRadar24 等专业数据源
- Off-Chocks / On-Chocks — 非常专业的运营时间节点

### 3.3 Passenger Info & Media

两个版本基本一致。座位号、舱位、飞机照片、登机牌都是个人记录的核心组成部分。

---

## 4. 天气展示策略

天气是 Free 版中**情感价值最高**的字段之一。"那天下着小雨"、"晴空万里"这类记忆锚点对普通用户非常有意义。

### 数据获取：完全免费

METAR 数据来自两个公共数据源，无需 API Key，无调用次数限制：

| 数据源 | 覆盖范围 | 说明 |
|--------|---------|------|
| Aviation Weather Center (AWC) | 近 15 天 | 美国 FAA 公开服务 |
| Iowa Environmental Mesonet (IEM) | 历史数据 | 爱荷华州立大学公共数据 |

### 展示差异

| 维度 | Free 版 | Pro 版 |
|------|---------|--------|
| **标签** | WEATHER | METAR |
| **内容** | 解码后的人类可读摘要 | 原始 METAR 代码 |
| **示例** | `Wind 360°/4kt │ Vis >10km │ Few 4000ft │ 10°C/3°C │ QNH 1026 hPa │ VFR` | `METAR ZSSS 280100Z 36004KT 9999 FEW040 10/03 Q1026 NOSIG` |
| **未来增强** | 天气图标 + 自然语言（☀️ 晴 · 10°C · 微风） | 原始代码 + 完整解码面板 |

### 天气图标映射方案（Free 版增强方向）

基于现有 `DecodedMetar` 结构，可直接映射：

```
clouds: "Clear" / "SKC"          → ☀️ 晴朗
clouds: "Few xxxxft"             → 🌤️ 少云
clouds: "Scattered xxxxft"       → ⛅ 多云
clouds: "Broken xxxxft"          → 🌥️ 阴
clouds: "Overcast xxxxft"        → ☁️ 阴天
weather: "Rain"                  → 🌧️ 雨
weather: "Light Rain"            → 🌦️ 小雨
weather: "Snow"                  → 🌨️ 雪
weather: "Thunderstorm"          → ⛈️ 雷暴
weather: "Fog" / "Mist"         → 🌫️ 雾
weather: "Haze"                  → 😶‍🌫️ 霾
visibility: "CAVOK"              → ☀️ 能见度极好
```

---

## 5. API / 数据源对照

### 5.1 完整 API 清单

| API / 数据源 | 端点 | 需要 Key | 费用 | Free 可用 | Pro 可用 |
|-------------|------|:--------:|:----:|:---------:|:--------:|
| **Aviation Weather Center** | `aviationweather.gov/api/data/metar` | ❌ | 免费 | ✅ | ✅ |
| **Iowa Mesonet (IEM)** | `mesonet.agron.iastate.edu/...` | ❌ | 免费 | ✅ | ✅ |
| **Planespotters.net** | `api.planespotters.net/pub/photos/reg/{reg}` | ❌ | 免费 | ✅ | ✅ |
| **airport-data.com** | `airport-data.com/api/ac_thumb.json` | ❌ | 免费 | ✅ | ✅ |
| **AVS.io (航司 Logo)** | `pics.avs.io/{w}/{h}/{code}.png` | ❌ | 免费 | ✅ | ✅ |
| **airport-data-js** | 本地 npm 包 | — | 免费 | ✅ | ✅ |
| **soaring-symbols** | 本地 npm 包（航司 SVG） | — | 免费 | ✅ | ✅ |
| **FlightRadar24** | `api.flightradar24.com/...` | ❌ | 非官方* | ❌ | ✅ |
| **FlightRadar24 (航迹)** | `data-live.flightradar24.com/...` | ❌ | 非官方* | ❌ | ✅ |
| **Anthropic Claude** | `api.anthropic.com/v1/messages` | ✅ | 按量付费 | ❌ | ✅ |

> \* FlightRadar24 的接口为非官方公开端点，无需 API Key 但存在限流和变更风险，不适合在免费版中大量调用。

### 5.2 各版本 API 使用策略

| 功能 | Free 版 | Pro 版 |
|------|---------|--------|
| **机场查询** | ✅ 本地 airport-data-js | ✅ 本地 airport-data-js |
| **航司 Logo** | ✅ soaring-symbols + AVS.io | ✅ soaring-symbols + AVS.io |
| **飞机照片搜索** | ✅ Planespotters + airport-data | ✅ Planespotters + airport-data |
| **METAR 天气** | ✅ AWC + IEM | ✅ AWC + IEM |
| **航班查询 (Lookup)** | ❌ 不提供 | ✅ FlightRadar24 |
| **航迹获取 (Fetch Track)** | ❌ 不提供 | ✅ FlightRadar24 |
| **AI 识别 (Extract with AI)** | ❌ 不提供 | ✅ Anthropic Claude |

### 5.3 Free 版自动填充能力

即使没有 FlightRadar24 和 AI，Free 版仍然可以自动填充：

| 触发条件 | 自动填充字段 | 数据源 |
|----------|-------------|--------|
| 输入 IATA 代码（3 位） | 机场名、ICAO、UTC 时区 | airport-data-js（本地） |
| 输入 ICAO 代码（4 位） | 机场名、IATA、UTC 时区 | airport-data-js（本地） |
| 搜索机场名 | IATA、ICAO、UTC 时区 | airport-data-js（本地） |
| 输入注册号 → 搜索照片 | 飞机照片列表 | Planespotters + airport-data |
| 点击 Fetch METAR | 出发/到达天气 | AWC + IEM |
| 填写两端实际时间 + UTC | 飞行时长 | 前端本地计算 |

---

## 6. Sample Data — Free vs Pro

### 6.1 Pro 版 Sample（完整字段）

```json
{
  "flightNumber": "MU5137",
  "callSign": "CES5137",
  "date": "2026-02-28",
  "aircraftType": "A321-231",
  "registration": "B-1615",
  "flightDuration": "2h 02min",
  "aircraftAge": "8.3 years",
  "distance": { "km": 1075, "nm": 580 },
  "cruisingAltitude": "FL276",
  "majorWaypoints": "POMOK - PIMOL - UDINO - GOLAL",
  "departure": {
    "airport": {
      "iata": "SHA",
      "icao": "ZSSS",
      "name": "Shanghai Hongqiao International Airport"
    },
    "parkingBay": "D12",
    "runway": "36L",
    "scheduledTime": "09:20",
    "actualTime": "09:32",
    "offChocks": "09:25",
    "metar": "METAR ZSSS 280100Z 36004KT 9999 FEW040 10/03 Q1026 NOSIG",
    "utcOffset": 8
  },
  "arrival": {
    "airport": {
      "iata": "PKX",
      "icao": "ZBAD",
      "name": "Beijing Daxing International Airport"
    },
    "parkingBay": "B21",
    "runway": "11R",
    "scheduledTime": "11:25",
    "actualTime": "11:35",
    "onChocks": "11:40",
    "metar": "METAR ZBAD 280300Z 02008KT CAVOK 05/M06 Q1029 NOSIG",
    "utcOffset": 8
  },
  "seatNumber": "31A",
  "cabinClass": "Economy",
  "bagTag": "MU 782156",
  "selectedPhoto": {
    "dataUrl": "(base64 image)",
    "photographer": "John Smith",
    "link": "https://planespotters.net/photo/12345"
  },
  "boardingPass": {
    "imageDataUrl": "(base64 image)",
    "source": "pkpass"
  }
}
```

**Pro PDF 标签示例：**

```
┌─────────────────────────────────────────────────┐
│  SEAT NO.  31A    CABIN CL.  Economy            │
├─────────────────────────────────────────────────┤
│  GENERAL FLT INFO                               │
│  FLT NO.: MU5137          C/S: CES5137          │
│  DT: 2026-02-28           A/C TYPE: A321-231    │
│  REG NO.: B-1615          FLT DUR: 2h 02min     │
│  AGE: 8.3 years           DIST: 580 nm          │
│  CRZ ALT: FL276                                 │
│  MJR WPTS: POMOK - PIMOL - UDINO - GOLAL       │
├─────────────────────────────────────────────────┤
│  DEP INFO                                       │
│  DEP ARPT: Shanghai Hongqiao International      │
│  ICAO: ZSSS   IATA: SHA   P/BAY: D12           │
│  T/O RWY: 36L                                   │
│  SKED DEP: 09:20  ACT DEP: 09:32  OFF-CHK:09:25│
│  METAR: ZSSS 280100Z 36004KT 9999 FEW040       │
│         10/03 Q1026 NOSIG                       │
├─────────────────────────────────────────────────┤
│  ARR INFO                                       │
│  DEST ARPT: Beijing Daxing International        │
│  ICAO: ZBAD   IATA: PKX   P/BAY: B21           │
│  LDG RWY: 11R                                   │
│  SKED ARR: 11:25  ACT ARR: 11:35  ON-CHK: 11:40│
│  METAR: ZBAD 280300Z 02008KT CAVOK 05/M06      │
│         Q1029 NOSIG                             │
└─────────────────────────────────────────────────┘
```

### 6.2 Free 版 Sample（精简字段）

```json
{
  "flightNumber": "MU5137",
  "date": "2026-02-28",
  "aircraftType": "A321-231",
  "registration": "B-1615",
  "flightDuration": "2h 02min",
  "distance": { "km": 1075 },
  "departure": {
    "airport": {
      "iata": "SHA",
      "name": "Shanghai Hongqiao International Airport"
    },
    "scheduledTime": "09:20",
    "metar": "(decoded) Wind 360°/4kt | Vis >10km | Few 4000ft | 10°C/3°C | QNH 1026 hPa | VFR",
    "utcOffset": 8
  },
  "arrival": {
    "airport": {
      "iata": "PKX",
      "name": "Beijing Daxing International Airport"
    },
    "scheduledTime": "11:25",
    "metar": "(decoded) Wind 020°/8kt | Vis CAVOK (>10km) | 5°C/-6°C | QNH 1029 hPa | VFR",
    "utcOffset": 8
  },
  "seatNumber": "31A",
  "cabinClass": "Economy",
  "selectedPhoto": {
    "dataUrl": "(base64 image)",
    "photographer": "John Smith",
    "link": "https://planespotters.net/photo/12345"
  },
  "boardingPass": {
    "imageDataUrl": "(base64 image)",
    "source": "pkpass"
  }
}
```

**Free PDF 标签示例：**

```
┌─────────────────────────────────────────────────┐
│  SEAT NUMBER  31A    CABIN CLASS  Economy        │
├─────────────────────────────────────────────────┤
│  FLIGHT INFORMATION                             │
│  FLIGHT NO.: MU5137                             │
│  DATE: 2026-02-28       AIRCRAFT TYPE: A321-231 │
│  REGISTRATION: B-1615   FLIGHT DURATION: 2h 02m │
│  DISTANCE: 1,075 km                             │
├─────────────────────────────────────────────────┤
│  DEPARTURE                                      │
│  AIRPORT: Shanghai Hongqiao International (SHA) │
│  SCHEDULED DEP: 09:20                           │
│  WEATHER: ☀️ Few clouds · 10°C · Wind 4kt N    │
├─────────────────────────────────────────────────┤
│  ARRIVAL                                        │
│  AIRPORT: Beijing Daxing International (PKX)    │
│  SCHEDULED ARR: 11:25                           │
│  WEATHER: ☀️ Clear skies · 5°C · Wind 8kt NNE  │
└─────────────────────────────────────────────────┘
```

### 6.3 字段差异速览

| 字段 | Pro Sample | Free Sample |
|------|-----------|-------------|
| callSign | `CES5137` | — |
| aircraftAge | `8.3 years` | — |
| cruisingAltitude | `FL276` | — |
| distance | `580 nm` | `1,075 km` |
| majorWaypoints | `POMOK - PIMOL - UDINO - GOLAL` | — |
| departure.airport.icao | `ZSSS` | — |
| departure.parkingBay | `D12` | — |
| departure.runway | `36L` | — |
| departure.actualTime | `09:32` | — |
| departure.offChocks | `09:25` | — |
| departure.metar | 原始 METAR 代码 | 解码摘要 + 图标 |
| arrival.airport.icao | `ZBAD` | — |
| arrival.parkingBay | `B21` | — |
| arrival.runway | `11R` | — |
| arrival.actualTime | `11:35` | — |
| arrival.onChocks | `11:40` | — |
| arrival.metar | 原始 METAR 代码 | 解码摘要 + 图标 |
| bagTag | `MU 782156` | — |

---

## 7. PDF 输出差异

| 维度 | Free 版 | Pro 版 |
|------|---------|--------|
| **显示模式** | 仅 Standard | Standard + Professional 可切换 |
| **标签风格** | 完整英文（FLIGHT NO.、DEPARTURE AIRPORT） | 可切换缩写（FLT NO.、DEP ARPT） |
| **距离单位** | km | km / nm 可切换 |
| **天气区域** | WEATHER: 解码摘要（未来可加图标） | METAR: 原始代码 |
| **水印** | 带 "Generated by FlightLog" 水印 | 无水印 |
| **分辨率** | 标准 | 高清 |
| **航迹地图** | 无 | 含航迹地图（如已获取） |

---

## 8. 功能限制维度

除字段差异外，建议的其他商业化限制：

| 维度 | Free 版 | Pro 版 |
|------|---------|--------|
| **草稿存储** | 最多 5 条 | 无限制 |
| **PDF 导出** | 带水印 / 标准分辨率 | 无水印 / 高清 |
| **AI 识别** | 不可用 | 可用（需 API Key） |
| **航班查询 (Lookup)** | 不可用 | 可用 |
| **航迹获取 (Fetch Track)** | 不可用 | 可用 |
| **飞机照片** | 仅上传/粘贴 | 上传 + 在线搜索 |
| **METAR 获取** | ✅ 可用 | ✅ 可用 |
| **机场自动补全** | ✅ 可用（本地数据） | ✅ 可用（本地数据） |
| **飞行时长自动计算** | ✅ 可用 | ✅ 可用 |
| **显示模式切换** | 仅 Standard | Standard + Professional |
