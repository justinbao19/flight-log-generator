import { FlightData } from "./types";

function getSystemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();

  return `你是一个飞行日志数据提取专家。请从以下文本/图片中提取飞行信息，输出为 JSON 格式。

当前日期：${today}

## 输出格式
{
  "flightNumber": "8L9887",
  "callSign": "LKE9887",
  "date": "${today}",
  "aircraftType": "A330-343",
  "registration": "B-1004",
  "flightDuration": "2h 16m",
  "aircraftAge": "7.5 Yrs",
  "distance": {
    "km": 2042,
    "nm": 1102.6
  },
  "cruisingAltitude": "39,100 ft",
  "departure": {
    "airport": {
      "iata": "KMG",
      "icao": "ZPPP",
      "name": "Kunming Changshui International Airport"
    },
    "parkingBay": "129",
    "runway": "22",
    "scheduledTime": "08:55",
    "actualTime": "09:19",
    "offChocks": "09:08",
    "metar": "ZPPP 250100Z 22007MPS CAVOK 13/07 Q1021 NOSIG"
  },
  "arrival": {
    "airport": {
      "iata": "SHA",
      "icao": "ZSSS",
      "name": "Shanghai Hongqiao International Airport"
    },
    "parkingBay": "237",
    "runway": "36R",
    "scheduledTime": "12:05",
    "actualTime": "11:35",
    "onChocks": "11:43",
    "metar": "ZSSS 250330Z 05002MPS 030V120 9999 BKN016 09/05 Q1022 NOSIG"
  },
  "seatNumber": "68A",
  "cabinClass": "Economy",
  "bagTag": "N/A"
}

## 提取规则
1. 如果某个字段缺失，设为 null
2. 日期统一转为 YYYY-MM-DD 格式。如果原文缺少年份，默认使用 ${currentYear} 年（但如果推断出的日期在未来，则使用 ${currentYear - 1} 年）
3. 时间统一为 24 小时制 HH:MM
4. 航班号自动识别航空公司（前两位字母/数字）
5. 机场代码优先使用 IATA，同时提取 ICAO
6. 数字字段去掉逗号分隔符（例如 "39,100" → 39100）
7. 机场全称请用英文

仅返回 JSON，不要任何解释文字。`;
}

export async function recognizeFromText(
  text: string,
  apiKey: string
): Promise<FlightData> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${getSystemPrompt()}\n\n## 输入文本\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");
  return JSON.parse(jsonMatch[0]);
}

export async function recognizeFromImage(
  base64Image: string,
  mediaType: string,
  apiKey: string
): Promise<FlightData> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: getSystemPrompt(),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");
  return JSON.parse(jsonMatch[0]);
}
