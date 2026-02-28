"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

interface DatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function DatePicker({ label, value, onChange, readOnly, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  useClickOutside(containerRef, () => setIsOpen(false));

  const selectedDate = value ? new Date(value) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDateClick = (day: Date) => {
    onChange(format(day, dateFormat));
    setIsOpen(false);
  };

  return (
    <div className={className} ref={containerRef}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
        {label}
      </label>
      <div className="relative">
        <div
          onClick={() => !readOnly && setIsOpen(!isOpen)}
          className="cursor-pointer"
        >
          <div className="relative flex items-center pointer-events-none">
            <div className="absolute left-3 text-slate-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              readOnly
              value={value || ""}
              placeholder="Select date"
              className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 sm:py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] pl-10 pr-3 ${
                readOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
          </div>
        </div>

        <AnimatePresence>
          {isOpen && !readOnly && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute z-50 mt-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-xl w-72 origin-top"
            >
              <div className="flex justify-between items-center mb-4">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="font-semibold text-slate-800">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-slate-400">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      className={`
                        h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors
                        ${!isCurrentMonth ? "text-slate-300" : "text-slate-700 hover:bg-slate-100"}
                        ${isSelected ? "bg-sky-500 text-white font-semibold hover:bg-sky-600 shadow-md" : ""}
                      `}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface TimePickerProps {
  label: string;
  value: string; // HH:mm
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function TimePicker({ label, value, onChange, readOnly, className, icon }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Default to current time if empty
  const defaultDate = new Date();
  const [hours, setHours] = useState(() => value ? value.split(":")[0] : format(defaultDate, "HH"));
  const [minutes, setMinutes] = useState(() => value ? value.split(":")[1] : format(defaultDate, "mm"));

  useClickOutside(containerRef, () => setIsOpen(false));

  const hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  // Create refs for scrolling into view
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const minutesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      if (h) setHours(h);
      if (m) setMinutes(m);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      // Scroll selected items into view when opened
      const hEl = hoursScrollRef.current?.querySelector(`[data-value="${hours}"]`);
      if (hEl) hEl.scrollIntoView({ block: "center" });
      const mEl = minutesScrollRef.current?.querySelector(`[data-value="${minutes}"]`);
      if (mEl) mEl.scrollIntoView({ block: "center" });
    }
  }, [isOpen, hours, minutes]); // added hours and minutes to dependencies

  const handleHourSelect = (h: string) => {
    setHours(h);
    onChange(`${h}:${minutes}`);
  };

  const handleMinuteSelect = (m: string) => {
    setMinutes(m);
    onChange(`${hours}:${m}`);
  };

  return (
    <div className={className} ref={containerRef}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
        {label}
      </label>
      <div className="relative">
        <div
          onClick={() => !readOnly && setIsOpen(!isOpen)}
          className="cursor-pointer"
        >
          <div className="relative flex items-center pointer-events-none">
            <div className="absolute left-3 text-slate-400 flex items-center justify-center">
              {icon || <Clock className="w-4 h-4" />}
            </div>
            <input
              type="text"
              readOnly
              value={value || ""}
              placeholder="HH:mm"
              className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 sm:py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] pl-10 pr-3 ${
                readOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "cursor-pointer"
              }`}
            />
          </div>
        </div>

        <AnimatePresence>
          {isOpen && !readOnly && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute z-50 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl w-48 flex overflow-hidden origin-top"
            >
              <div className="flex-1 flex flex-col items-center border-r border-slate-100">
                <div className="text-xs font-semibold text-slate-400 py-2 w-full text-center bg-slate-50 border-b border-slate-100">Hour</div>
                <div ref={hoursScrollRef} className="h-48 overflow-y-auto w-full scrollbar-hide py-2 px-1 custom-scrollbar">
                  {hoursList.map((h) => (
                    <button
                      key={h}
                      data-value={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      className={`w-full py-2 text-sm rounded-lg transition-colors ${
                        h === hours
                          ? "bg-sky-500 text-white font-semibold shadow-md"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <div className="text-xs font-semibold text-slate-400 py-2 w-full text-center bg-slate-50 border-b border-slate-100">Min</div>
                <div ref={minutesScrollRef} className="h-48 overflow-y-auto w-full scrollbar-hide py-2 px-1 custom-scrollbar">
                  {minutesList.map((m) => (
                    <button
                      key={m}
                      data-value={m}
                      type="button"
                      onClick={() => handleMinuteSelect(m)}
                      className={`w-full py-2 text-sm rounded-lg transition-colors ${
                        m === minutes
                          ? "bg-sky-500 text-white font-semibold shadow-md"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
