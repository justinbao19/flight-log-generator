import Link from "next/link";
import { FLIGHT_LOG_FIELDS } from "@/lib/flightLogFields";

const fieldGroups = FLIGHT_LOG_FIELDS.reduce<Record<string, typeof FLIGHT_LOG_FIELDS>>(
  (groups, field) => {
    groups[field.section] = groups[field.section] || [];
    groups[field.section].push(field);
    return groups;
  },
  {}
);

const codeBlockClass =
  "overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100";

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-sky-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/app" className="text-sm font-semibold text-sky-700">
            Flight Log Generator
          </Link>
          <Link
            href="/app"
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-400"
          >
            Open Editor
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <section className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-sky-600">
            Agent Integration Guide
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Fill a complete flight log by conversation, then import it into the editor.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
            This guide explains the flight-log concepts, the normal browser workflow,
            and the agent API bridge that lets OpenClaw or another agent collect flight
            facts from the web and inject them into the app.
          </p>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Collect",
              body: "The agent gathers public flight facts, boarding-pass details, weather, aircraft data, and optional media.",
            },
            {
              title: "Inject",
              body: "The agent writes a draft through token-protected REST endpoints using stable field paths.",
            },
            {
              title: "Review",
              body: "You import the draft in the editor, adjust uncertain fields, preview the PDF, and export.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">Basic Concepts</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ["IATA", "Three-letter passenger airport code such as PVG or CAN."],
              ["ICAO", "Four-letter operational airport code such as ZSPD or ZGGG."],
              ["Callsign", "ATC identifier, usually airline ICAO code plus flight number."],
              ["Registration", "Unique aircraft tail number, useful for aircraft photos."],
              ["Flight Level", "Cruise altitude shown as FL350 for about 35,000 feet."],
              ["METAR", "Raw aviation weather report near an airport and time."],
              ["Off/On Chocks", "Operational block times when the aircraft leaves or reaches the stand."],
              ["Nautical Mile", "Aviation distance unit; 1 nm is about 1.852 km."],
            ].map(([term, description]) => (
              <div key={term} className="rounded-xl bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">{term}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">Normal Tool Workflow</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>1. Open the editor and choose screenshot, paste text, or manual input.</li>
            <li>2. Enter the flight number and local departure date first.</li>
            <li>3. Use Lookup for aircraft and route data when the source is available.</li>
            <li>4. Use airport fields to resolve IATA, ICAO, airport name, and UTC offset.</li>
            <li>5. Fetch METAR after the airport ICAO and date/time are known.</li>
            <li>6. Fetch Track for recent flights when FlightRadar24 data is accessible.</li>
            <li>7. Search or upload an aircraft photo, add a boarding pass, then preview and export.</li>
          </ol>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">Agent API Workflow</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Set <code className="rounded bg-slate-100 px-1.5 py-0.5">FLIGHT_LOG_AGENT_TOKEN</code>{" "}
            on the server. Send the same value as{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">x-agent-token</code>{" "}
            for write endpoints.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <pre className={codeBlockClass}>{`GET /api/agent/flight-log/schema

Returns:
{
  "requiredFields": ["flightNumber", "date"],
  "fields": [{ "path": "departure.airport.iata", ... }]
}`}</pre>
            <pre className={codeBlockClass}>{`POST /api/agent/flight-log/enrich
x-agent-token: $FLIGHT_LOG_AGENT_TOKEN

{
  "flightNumber": "CA8565",
  "date": "2026-05-07"
}`}</pre>
            <pre className={codeBlockClass}>{`PUT /api/agent/flight-log/draft
x-agent-token: $FLIGHT_LOG_AGENT_TOKEN

{
  "source": "openclaw",
  "data": { "flightNumber": "CA8565", "date": "2026-05-07" }
}`}</pre>
            <pre className={codeBlockClass}>{`PATCH /api/agent/flight-log/draft
x-agent-token: $FLIGHT_LOG_AGENT_TOKEN

{
  "updates": [
    { "path": "seatNumber", "value": "31A" },
    { "path": "departure.runway", "value": "17L" }
  ]
}`}</pre>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">OpenClaw Skill Usage</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The repo includes a skill package at{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">skills/flight-log-agent</code>.
            After the repository is pushed, install it from GitHub with OpenClaw:
          </p>
          <pre className={`${codeBlockClass} mt-4`}>{`openclaw skills install github:<owner>/flight-log-generator/skills/flight-log-agent`}</pre>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            If your OpenClaw installation requires a dedicated skill repository, mirror that
            folder to a standalone repository and install it with{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              openclaw skills install github:&lt;owner&gt;/flight-log-agent
            </code>
            .
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">Fillable Field Paths</h2>
          <div className="mt-5 space-y-6">
            {Object.entries(fieldGroups).map(([section, fields]) => (
              <div key={section}>
                <h3 className="mb-2 text-sm font-bold text-slate-900">{section}</h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Path</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="hidden px-3 py-2 font-semibold sm:table-cell">Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fields.map((field) => (
                        <tr key={field.path}>
                          <td className="px-3 py-2 font-mono text-slate-800">{field.path}</td>
                          <td className="px-3 py-2 text-slate-500">{field.type}</td>
                          <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">
                            {field.example ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
