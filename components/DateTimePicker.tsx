"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const TIME_ITEM_HEIGHT = 36;
const TIME_PICKER_VISIBLE_ITEMS = 5;
const TIME_PICKER_HEIGHT = TIME_ITEM_HEIGHT * TIME_PICKER_VISIBLE_ITEMS;
const TIME_PICKER_PADDING = TIME_ITEM_HEIGHT * Math.floor(TIME_PICKER_VISIBLE_ITEMS / 2);
const HOURS_LIST = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

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
  suffix?: ReactNode;
}

export function TimePicker({ label, value, onChange, readOnly, className, icon, suffix }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hours, setHours] = useState(() => value ? value.split(":")[0] : "");
  const [minutes, setMinutes] = useState(() => value ? value.split(":")[1] : "");
  const scrollFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const minutesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      if (h) setHours(h);
      if (m) setMinutes(m);
    } else {
      setHours("");
      setMinutes("");
    }
  }, [value]);

  const scrollColumnToValue = (
    ref: React.RefObject<HTMLDivElement | null>,
    list: string[],
    nextValue: string,
    behavior: ScrollBehavior = "auto"
  ) => {
    const index = Math.max(0, list.indexOf(nextValue));
    ref.current?.scrollTo({
      top: index * TIME_ITEM_HEIGHT,
      behavior,
    });
  };

  const setTime = (h: string, m: string) => {
    setHours(h);
    setMinutes(m);
    onChange(`${h}:${m}`);
  };

  const handleHourSelect = (nextHour: string, behavior: ScrollBehavior = "smooth") => {
    const nextMinute = minutes || "00";
    scrollColumnToValue(hoursScrollRef, HOURS_LIST, nextHour, behavior);
    setTime(nextHour, nextMinute);
  };

  const handleMinuteSelect = (nextMinute: string, behavior: ScrollBehavior = "smooth") => {
    const nextHour = hours || "00";
    scrollColumnToValue(minutesScrollRef, MINUTES_LIST, nextMinute, behavior);
    setTime(nextHour, nextMinute);
  };

  const handleColumnScroll = (
    event: React.UIEvent<HTMLDivElement>,
    list: string[],
    currentValue: string,
    updateValue: (value: string) => void
  ) => {
    const scrollTop = event.currentTarget.scrollTop;
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      const index = Math.min(
        list.length - 1,
        Math.max(0, Math.round(scrollTop / TIME_ITEM_HEIGHT))
      );
      const nextValue = list[index];
      if (nextValue && nextValue !== currentValue) {
        updateValue(nextValue);
      }
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const h = hours || "00";
    const m = minutes || "00";
    const frame = requestAnimationFrame(() => {
      scrollColumnToValue(hoursScrollRef, HOURS_LIST, h);
      scrollColumnToValue(minutesScrollRef, MINUTES_LIST, m);
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  const displayHours = hours || "--";
  const displayMinutes = minutes || "--";
  const activeHour = hours || "00";
  const activeMinute = minutes || "00";

  return (
    <div className={className} ref={containerRef}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
        {label}
      </label>
      <div className="relative">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 flex items-center justify-center text-slate-400">
            {icon || <Clock className="w-4 h-4" />}
          </div>
          <input
            type="text"
            readOnly
            value={value || ""}
            placeholder="Select time"
            onClick={() => !readOnly && setIsOpen(!isOpen)}
            className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 sm:py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] pl-10 ${
              suffix ? "pr-28" : "pr-3"
            } ${readOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "cursor-pointer"}`}
          />
          {suffix && (
            <div
              className="absolute right-2 flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {suffix}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isOpen && !readOnly && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute z-50 mt-2 w-60 origin-top overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_16px_40px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <div className="flex items-center justify-center gap-1 font-mono text-lg font-semibold tabular-nums text-slate-950">
                  <span className="w-9 text-center">{displayHours}</span>
                  <span className="text-slate-300">:</span>
                  <span className="w-9 text-center">{displayMinutes}</span>
                </div>
                <div className="mt-1 flex items-center justify-center gap-8 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <span>Hour</span>
                  <span>Minute</span>
                </div>
              </div>

              <div className="relative flex px-2 py-2">
                <div className="pointer-events-none absolute left-2 right-2 top-1/2 z-0 h-9 -translate-y-1/2 rounded-xl bg-sky-50 ring-1 ring-sky-100" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-6 w-px -translate-y-1/2 bg-slate-200" />

                <div
                  ref={hoursScrollRef}
                  onScroll={(event) =>
                    handleColumnScroll(event, HOURS_LIST, activeHour, (nextHour) =>
                      setTime(nextHour, minutes || "00")
                    )
                  }
                  className="relative z-10 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain px-1 scrollbar-hide custom-scrollbar"
                  style={{
                    height: TIME_PICKER_HEIGHT,
                    paddingTop: TIME_PICKER_PADDING,
                    paddingBottom: TIME_PICKER_PADDING,
                    scrollPaddingTop: TIME_PICKER_PADDING,
                    scrollPaddingBottom: TIME_PICKER_PADDING,
                  }}
                >
                  {HOURS_LIST.map((h) => (
                    <button
                      key={h}
                      data-value={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      className={`flex h-9 w-full snap-center items-center justify-center rounded-lg font-mono text-sm tabular-nums transition-all ${
                        h === activeHour
                          ? "font-semibold text-sky-700"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>

                <div
                  ref={minutesScrollRef}
                  onScroll={(event) =>
                    handleColumnScroll(event, MINUTES_LIST, activeMinute, (nextMinute) =>
                      setTime(hours || "00", nextMinute)
                    )
                  }
                  className="relative z-10 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain px-1 scrollbar-hide custom-scrollbar"
                  style={{
                    height: TIME_PICKER_HEIGHT,
                    paddingTop: TIME_PICKER_PADDING,
                    paddingBottom: TIME_PICKER_PADDING,
                    scrollPaddingTop: TIME_PICKER_PADDING,
                    scrollPaddingBottom: TIME_PICKER_PADDING,
                  }}
                >
                  {MINUTES_LIST.map((m) => (
                    <button
                      key={m}
                      data-value={m}
                      type="button"
                      onClick={() => handleMinuteSelect(m)}
                      className={`flex h-9 w-full snap-center items-center justify-center rounded-lg font-mono text-sm tabular-nums transition-all ${
                        m === activeMinute
                          ? "font-semibold text-sky-700"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
