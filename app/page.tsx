"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Image as ImageIcon, LayoutTemplate, Zap, PlaneTakeoff, Github, Download, ShieldCheck } from "lucide-react";

const flightRoutes = [
  { id: 1, path: "M -100 180 Q 400 60 900 200 T 1600 120", delay: 0, duration: 18 },
  { id: 2, path: "M -80 350 Q 300 200 700 380 T 1500 280", delay: 4, duration: 22 },
  { id: 3, path: "M -120 500 Q 500 300 1000 450 T 1700 350", delay: 8, duration: 20 },
  { id: 4, path: "M -60 120 Q 350 280 800 100 T 1550 220", delay: 12, duration: 24 },
];

const clouds = [
  { id: 1, x: "5%", y: "15%", scale: 1, delay: 0, duration: 35 },
  { id: 2, x: "75%", y: "8%", scale: 0.7, delay: 5, duration: 40 },
  { id: 3, x: "40%", y: "60%", scale: 0.5, delay: 10, duration: 30 },
  { id: 4, x: "85%", y: "45%", scale: 0.8, delay: 15, duration: 38 },
  { id: 5, x: "20%", y: "75%", scale: 0.6, delay: 8, duration: 32 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-sky-50 text-slate-900 selection:bg-sky-200 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-10 mix-blend-multiply bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-white/60 bg-gradient-to-b from-white/40 via-sky-50/80 to-sky-100/90" />
        
        {/* Animated glowing orbs - Clouds/Sky feel */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-white rounded-full blur-[100px] opacity-60 animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-sky-200/50 rounded-full blur-[100px]" style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
        
        {/* Subtle Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-30" />

        {/* Floating Clouds */}
        {clouds.map((cloud) => (
          <div
            key={cloud.id}
            className="absolute"
            style={{
              left: cloud.x,
              top: cloud.y,
              transform: `scale(${cloud.scale})`,
              animation: `cloudFloat ${cloud.duration}s ease-in-out ${cloud.delay}s infinite`,
            }}
          >
            <svg width="140" height="60" viewBox="0 0 140 60" fill="none">
              <ellipse cx="70" cy="40" rx="55" ry="18" fill="white" opacity="0.7" />
              <ellipse cx="45" cy="28" rx="35" ry="22" fill="white" opacity="0.6" />
              <ellipse cx="88" cy="32" rx="28" ry="18" fill="white" opacity="0.65" />
              <ellipse cx="62" cy="22" rx="25" ry="17" fill="white" opacity="0.55" />
            </svg>
          </div>
        ))}

        {/* Flight Route Lines & Planes */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice">
          <defs>
            {flightRoutes.map((route) => (
              <path key={`def-${route.id}`} id={`route-${route.id}`} d={route.path} />
            ))}
            {/* Font Awesome "fa-plane" (solid). Nose points RIGHT by default,
                matching animateMotion rotate="auto" (0° = positive X). */}
            <symbol id="plane-icon" viewBox="0 0 576 512">
              <path d="M480 192H365.71L260.61 8.06A16.014 16.014 0 0 0 246.71 0h-65.5c-10.63 0-18.3 10.17-15.38 20.39L214.86 192H112l-43.2-57.6c-3.02-4.03-7.77-6.4-12.8-6.4H16.01C5.6 128-2.04 137.78.49 147.88L32 256 .49 364.12C-2.04 374.22 5.6 384 16.01 384H56c5.04 0 9.78-2.37 12.8-6.4L112 320h102.86l-49.03 171.6c-2.92 10.22 4.75 20.4 15.38 20.4h65.5c5.74 0 11.04-3.08 13.89-8.06L365.71 320H480c35.35 0 96-28.65 96-64s-60.65-64-96-64z" fill="#3b82f6" />
            </symbol>
          </defs>

          {flightRoutes.map((route) => (
            <g key={route.id}>
              {/* Dashed trail */}
              <use
                href={`#route-${route.id}`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.8"
                strokeDasharray="10 14"
                opacity="0.5"
                style={{
                  strokeDashoffset: 0,
                  animation: `dashScroll ${route.duration}s linear ${route.delay}s infinite`,
                }}
              />

              <g>
                <animateMotion
                  dur={`${route.duration}s`}
                  begin={`${route.delay}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href={`#route-${route.id}`} />
                </animateMotion>
                <use href="#plane-icon" width="24" height="21" x="-12" y="-10.5" opacity="0.65" />
              </g>
            </g>
          ))}

          {/* Waypoint dots */}
          {[
            { cx: 200, cy: 150 }, { cx: 600, cy: 280 }, { cx: 900, cy: 180 },
            { cx: 350, cy: 400 }, { cx: 1100, cy: 320 }, { cx: 750, cy: 120 },
            { cx: 450, cy: 200 }, { cx: 1050, cy: 420 },
          ].map((dot, i) => (
            <g key={`dot-${i}`}>
              <circle cx={dot.cx} cy={dot.cy} r="3" fill="#93c5fd" opacity="0.5">
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={dot.cx} cy={dot.cy} r="6" fill="none" stroke="#93c5fd" strokeWidth="0.5" opacity="0.3">
                <animate attributeName="r" values="3;10;3" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}

        </svg>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <PlaneTakeoff className="w-6 h-6 text-sky-500" />
          <span className="text-xl font-bold tracking-tight text-slate-900">FlightLog<span className="text-sky-500">.</span></span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2">
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">Star on GitHub</span>
          </a>
          <Link href="/app" className="text-sm font-medium text-sky-700 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-full px-4 py-2 backdrop-blur-md transition-all">
            Enter App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-700 text-sm font-medium mb-8 shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>Powered by AI. 100% Client-side generation.</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-slate-900"
        >
          Turn Flight Notes into <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">Professional Logs.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed"
        >
          Paste your scattered flight notes or upload a screenshot. Our smart AI instantly extracts the data and generates beautiful, print-ready PDF flight logs.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/app" className="group relative inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-8 py-4 rounded-full font-semibold transition-all overflow-hidden shadow-lg shadow-sky-500/30">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_2s_infinite]" />
            <span className="relative">Start Generating</span>
            <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all">
            View Examples
          </button>
        </motion.div>
      </main>

      {/* Bento Grid Features */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Smart AI Parsing (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 group relative rounded-3xl bg-white border border-slate-200 overflow-hidden hover:shadow-xl shadow-sm transition-all min-h-[280px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-8 h-full flex flex-col">
              <Zap className="w-8 h-8 text-sky-500 mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Smart AI Parsing</h3>
              <p className="text-slate-600 max-w-md">Copy and paste raw text or upload screenshots. We extract flight numbers, airports, dates, and times automatically.</p>
              
              <div className="mt-auto relative w-full max-w-sm rounded-lg bg-slate-50 border border-slate-200 p-4 font-mono text-xs text-slate-600 overflow-hidden shadow-inner">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)] animate-[scan_3s_ease-in-out_infinite]" />
                <p>Flight Number: <span className="text-slate-900 font-semibold">8L9887</span></p>
                <p>Dept: <span className="text-slate-900 font-semibold">KMG/ZPPP</span></p>
                <p>Dest: <span className="text-slate-900 font-semibold">SHA/ZSSS</span></p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Auto Airline Logos (Small) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative rounded-3xl bg-white border border-slate-200 overflow-hidden hover:shadow-xl shadow-sm transition-all min-h-[280px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-8 h-full flex flex-col">
              <ImageIcon className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Auto Logos</h3>
              <p className="text-slate-600 text-sm">Automatically fetches correct airline and alliance logos.</p>
              
              <div className="mt-6 relative h-32 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]">
                <div className="flex flex-col gap-7 animate-[vertical-scroll_20s_linear_infinite]">
                  {[...Array(2)].map((_, groupIndex) => (
                    <div key={`logo-group-${groupIndex}`} className="flex flex-col gap-7">
                      {[
                        { iata: "QR", w: 154, h: 45 },
                        { iata: "SQ", w: 138, h: 51 },
                        { iata: "CX", w: 190, h: 27 },
                        { iata: "EK", w: 145, h: 48 },
                        { iata: "LH", w: 200, h: 35 },
                        { iata: "TK", w: 197, h: 35 },
                        { iata: "BA", w: 210, h: 33 },
                        { iata: "MU", w: 186, h: 38 },
                        { iata: "AA", w: 210, h: 33 },
                        { iata: "GA", w: 197, h: 35 },
                      ].map((airline, i) => (
                        <div key={`${groupIndex}-${i}`} className="flex items-center justify-center w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={`/airline-logos/${airline.iata}.png`} 
                            alt={airline.iata}
                            style={{ width: airline.w, height: airline.h }}
                            className="object-contain opacity-50"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Dual PDF Modes (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2 md:col-start-2 group relative rounded-3xl bg-white border border-slate-200 overflow-hidden hover:shadow-xl shadow-sm transition-all min-h-[280px]"
          >
            <div className="absolute inset-0 bg-gradient-to-bl from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-8 h-full flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <LayoutTemplate className="w-8 h-8 text-indigo-500 mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Dual PDF Modes</h3>
                <p className="text-slate-600">Choose between Standard and Professional layouts. Perfectly formatted for printing, digital sharing, and archiving.</p>
              </div>
              <div className="flex-1 flex w-full justify-center relative pdf-stack">
                <div className="pdf-card pdf-card-front w-28 h-36 bg-white rounded-lg border-t-4 border-sky-400 shadow-xl flex flex-col p-2">
                  <div className="w-1/2 h-2 bg-slate-200 rounded mb-2" />
                  <div className="w-full h-1 bg-slate-100 rounded mb-1" />
                  <div className="w-full h-1 bg-slate-100 rounded mb-1" />
                  <div className="w-3/4 h-1 bg-slate-100 rounded" />
                </div>
                <div className="pdf-card pdf-card-back w-28 h-36 bg-white rounded-lg border-t-4 border-indigo-400 shadow-xl flex flex-col p-2">
                  <div className="w-1/3 h-2 bg-slate-200 rounded mb-2" />
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    <div className="h-8 bg-slate-100 rounded" />
                    <div className="h-8 bg-slate-100 rounded" />
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Instant Export (Small) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-start-1 md:row-start-2 group relative rounded-3xl bg-white border border-slate-200 overflow-hidden hover:shadow-xl shadow-sm transition-all min-h-[280px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-8 h-full flex flex-col">
              <Download className="w-8 h-8 text-emerald-500 mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Instant Export</h3>
              <p className="text-slate-600 text-sm">Download as high-res PDF or PNG instantly.</p>
              
              <div className="mt-auto flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 group-hover:border-emerald-200 transition-colors">
                <div className="w-10 h-10 rounded bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:border-emerald-100 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <div className="h-2 w-16 bg-slate-200 rounded mb-1.5" />
                  <div className="h-1.5 w-24 bg-slate-100 rounded" />
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Download className="w-3 h-3 text-emerald-600" />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="relative z-10 py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4">See the Magic Happen</h2>
          <p className="text-slate-600 text-lg">Watch how raw text transforms into a beautifully formatted document.</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8 justify-center">
          {/* Input Side */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="group flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="w-3 h-3 rounded-full bg-red-400 group-hover:bg-red-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-amber-400 group-hover:bg-amber-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 group-hover:bg-emerald-500 transition-colors" />
              <span className="ml-2 text-xs text-slate-500 group-hover:text-slate-700 transition-colors font-mono font-medium">note.txt</span>
            </div>
            <div className="p-6 font-mono text-sm text-slate-700 bg-white">
              <p className="text-sky-600 mb-2 font-semibold">ZPPP {'>'} ZSSS</p>
              <p>Flight Number: <span className="text-slate-900 font-semibold">8L9887</span></p>
              <p>Date: <span className="text-slate-900 font-semibold">Feb 25th</span></p>
              <p>Type: <span className="text-slate-900 font-semibold">A330-343</span></p>
              <p>Reg.: <span className="text-slate-900 font-semibold">B-1004</span></p>
              <p>Dept Airport: <span className="text-slate-900 font-semibold">KMG/ZPPP</span></p>
              <p>Dest Airport: <span className="text-slate-900 font-semibold">SHA/ZSSS</span></p>
              <p className="text-slate-400 mt-2">METAR: ZPPP 250100Z 22007MPS CAVOK...</p>
            </div>
          </motion.div>

          {/* Connection Line */}
          <div className="hidden lg:flex flex-col items-center justify-center">
            <div className="w-16 h-[2px] bg-gradient-to-r from-sky-300 to-indigo-300 relative">
              <div className="absolute inset-0 bg-sky-200 blur-sm" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
            </div>
          </div>

          {/* Output Side (3D Tilt) */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 w-full max-w-lg perspective-[2000px]"
          >
            <motion.div 
              whileHover={{ rotateX: 5, rotateY: -10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white rounded-xl shadow-2xl p-6 transform-style-3d border border-slate-100"
            >
              <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
                <div>
                  <h4 className="text-2xl font-black text-slate-900">8L9887</h4>
                  <p className="text-slate-500 text-sm font-medium">KMG/ZPPP → SHA/ZSSS</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-900 font-bold">Feb 25th</p>
                  <p className="text-slate-500 text-sm">A330-343</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-10 bg-slate-50 rounded-lg border border-slate-100 flex items-center px-4">
                  <span className="text-xs text-slate-400 w-24">REGISTRATION</span>
                  <span className="text-sm font-bold text-slate-900">B-1004</span>
                </div>
                <div className="h-10 bg-slate-50 rounded-lg border border-slate-100 flex items-center px-4">
                  <span className="text-xs text-slate-400 w-24">CRUISING ALT</span>
                  <span className="text-sm font-bold text-slate-900">39,100 ft</span>
                </div>
                <div className="h-10 bg-slate-50 rounded-lg border border-slate-100 flex items-center px-4">
                  <span className="text-xs text-slate-400 w-24">DURATION</span>
                  <span className="text-sm font-bold text-slate-900">2h 16m</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer & CTA */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready for Takeoff?</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Stop wasting time formatting logs manually. Generate your first professional flight log in seconds.
          </p>
          <Link href="/app" className="inline-flex items-center justify-center gap-2 bg-sky-500 text-white hover:bg-sky-400 px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-sky-500/20">
            <PlaneTakeoff className="w-5 h-5" />
            Get Started Now
          </Link>
          
          <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Flight Log Generator. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(120px); }
          100% { transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes vertical-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes dashScroll {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -200; }
        }
        @keyframes cloudFloat {
          0%, 100% { transform: translateX(0) translateY(0); opacity: 0.5; }
          25% { transform: translateX(15px) translateY(-8px); opacity: 0.6; }
          50% { transform: translateX(30px) translateY(-3px); opacity: 0.45; }
          75% { transform: translateX(15px) translateY(5px); opacity: 0.55; }
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .pdf-stack {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
        }
        .pdf-card {
          transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }
        .pdf-card-front {
          transform: rotate(-4deg);
          margin-right: -20px;
          z-index: 2;
        }
        .pdf-card-back {
          transform: rotate(4deg);
          margin-left: -20px;
          z-index: 1;
        }
        .group:hover .pdf-card-front {
          transform: rotate(0deg);
          margin-right: 6px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
        }
        .group:hover .pdf-card-back {
          transform: rotate(0deg);
          margin-left: 6px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
