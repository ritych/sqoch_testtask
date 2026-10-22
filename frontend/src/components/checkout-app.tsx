"use client";

import { useEffect, useRef, useState } from "react";

import { MAX_PARTICIPANTS, normalizeOrder } from "@/lib/rules";
import type { EventAvailability, OrderResponse, PreviewResponse, SessionId, SoldOutResponse } from "@/lib/types";

import { DetailsStep, type DraftPerson } from "./details-step";
import { EventAside } from "./event-aside";
import { EventStep } from "./event-step";
import { SoldOutStep, SuccessStep } from "./result-step";
import { ReviewStep } from "./review-step";

type Step = "event" | "details" | "review" | "success" | "soldout";

const titles: Record<Step, string> = {
  event: "Сеанс",
  details: "Данные участников",
  review: "Проверка заказа",
  success: "Заказ оформлен",
  soldout: "Места закончились",
};

function nextPerson(): DraftPerson {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p-${Date.now()}`;
  return { id, name: "", age: "" };
}

export function CheckoutApp() {
  const [step, setStep] = useState<Step>("event");
  const [sessionId, setSessionId] = useState<SessionId>("main");
  const [participants, setParticipants] = useState<DraftPerson[]>([{ id: "p1", name: "", age: "" }]);
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [soldOut, setSoldOut] = useState<SoldOutResponse | null>(null);
  const [seats, setSeats] = useState<EventAvailability | null>(null);
  const [seatsFailed, setSeatsFailed] = useState(false);
  const [seatVersion, setSeatVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    document.title = `${titles[step]} — Тихая вода`;
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/event", { cache: "no-store" });
        const body: unknown = await response.json();
        if (cancelled) return;
        if (response.ok && isAvailability(body)) {
          setSeats(body);
          setSeatsFailed(false);
        } else {
          setSeatsFailed(true);
        }
      } catch {
        if (!cancelled) setSeatsFailed(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [seatVersion]);

  function payload(nextSession: SessionId) {
    const normalized = normalizeOrder({
      email,
      participants: participants.map((person) => ({ name: person.name, age: person.age })),
    });
    if (!normalized.ok) return null;
    return { sessionId: nextSession, email: normalized.value.email, participants: normalized.value.participants };
  }

  async function openReview(nextSession: SessionId) {
    if (pendingRef.current) return;
    const body = payload(nextSession);
    if (!body) {
      setFormError("Проверьте имена, возраст и email.");
      setStep("details");
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setFormError(null);
    try {
      const response = await fetch("/api/orders/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isPreview(data)) {
        setFormError("Касса не приняла данные. Проверьте участников и email.");
        setStep("details");
        return;
      }
      setSessionId(nextSession);
      setPreview(data);
      setStep("review");
      window.scrollTo(0, 0);
    } catch {
      setFormError("Нет связи с кассой. Попробуйте ещё раз.");
      setStep("details");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function confirm() {
    if (pendingRef.current) return;
    const body = payload(sessionId);
    if (!body) {
      setFormError("Проверьте имена, возраст и email.");
      setStep("details");
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setFormError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const data: unknown = await response.json().catch(() => null);
      if (response.status === 409 && isSoldOut(data)) {
        setSoldOut(data);
        setStep("soldout");
        setSeatVersion((version) => version + 1);
        window.scrollTo(0, 0);
        return;
      }
      if (response.status === 201 && isOrder(data)) {
        setOrder(data);
        setStep("success");
        setSeatVersion((version) => version + 1);
        window.scrollTo(0, 0);
        return;
      }
      setFormError("Касса не подтвердила заказ. Проверьте данные и попробуйте ещё раз.");
    } catch {
      setFormError("Нет связи с кассой. Заказ не создан — можно подтвердить ещё раз.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function resetCashier() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setFormError(null);
    try {
      const response = await fetch("/api/event/reset", { method: "POST" });
      if (!response.ok) throw new Error("reset");
      setParticipants([{ id: "p1", name: "", age: "" }]);
      setEmail("");
      setSessionId("main");
      setPreview(null);
      setOrder(null);
      setSoldOut(null);
      setStep("event");
      setSeatVersion((version) => version + 1);
      window.scrollTo(0, 0);
    } catch {
      setFormError("Не удалось сбросить кассу.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function startAgain() {
    setParticipants([{ id: "p1", name: "", age: "" }]);
    setEmail("");
    setPreview(null);
    setOrder(null);
    setSoldOut(null);
    setFormError(null);
    setStep("event");
    window.scrollTo(0, 0);
  }

  const showResult = step === "success" || step === "soldout";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-8">
          <p className="font-serif text-lg tracking-wide">
            Лен <span className="font-sans text-sm text-muted">касса</span>
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Билеты</p>
        </div>
      </header>

      <p className="sr-only" aria-live="polite">
        {titles[step]}
      </p>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:grid md:grid-cols-[17rem_minmax(0,1fr)] md:px-8 md:py-10">
        <div className={showResult ? "order-2 min-w-0 md:order-1" : "order-1 min-w-0"}>
          <EventAside
            seats={seats}
            sessionId={sessionId}
            showChosenSession={step !== "event"}
            showStandNote={step === "event"}
            onReset={() => void resetCashier()}
            pending={pending}
          />
        </div>
        <div className={showResult ? "order-1 min-w-0 md:order-2" : "order-2 min-w-0"}>
          {step === "event" ? (
            <EventStep
              sessionId={sessionId}
              seats={seats}
              seatsFailed={seatsFailed}
              onSession={setSessionId}
              onContinue={() => {
                setFormError(null);
                setStep("details");
                window.scrollTo(0, 0);
              }}
            />
          ) : null}

          {step === "details" ? (
            <DetailsStep
              sessionId={sessionId}
              participants={participants}
              email={email}
              pending={pending}
              formError={formError}
              onEmail={setEmail}
              onPerson={(id, patch) => {
                setFormError(null);
                setParticipants((current) => current.map((person) => (person.id === id ? { ...person, ...patch } : person)));
              }}
              onAdd={() => {
                if (participants.length >= MAX_PARTICIPANTS) return;
                setParticipants((current) => [...current, nextPerson()]);
              }}
              onRemove={(id) => setParticipants((current) => current.filter((person) => person.id !== id))}
              onBack={() => {
                setFormError(null);
                setStep("event");
                window.scrollTo(0, 0);
              }}
              onContinue={() => void openReview(sessionId)}
            />
          ) : null}

          {step === "review" && preview ? (
            <ReviewStep
              preview={preview}
              pending={pending}
              formError={formError}
              onEdit={() => {
                setFormError(null);
                setStep("details");
                window.scrollTo(0, 0);
              }}
              onConfirm={() => void confirm()}
            />
          ) : null}

          {step === "success" && order ? <SuccessStep order={order} onAgain={startAgain} /> : null}

          {step === "soldout" && soldOut ? (
            <SoldOutStep
              soldOut={soldOut}
              pending={pending}
              onEdit={() => {
                setFormError(null);
                setStep("details");
                window.scrollTo(0, 0);
              }}
              onMainHall={() => void openReview("main")}
              onStart={startAgain}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAvailability(value: unknown): value is EventAvailability {
  if (!isRecord(value)) return false;
  return typeof value.mainSeatsLeft === "number" && typeof value.mainCapacity === "number" && typeof value.lateSeatsShown === "number";
}

function isPreview(value: unknown): value is PreviewResponse {
  if (!isRecord(value) || !isRecord(value.quote)) return false;
  return typeof value.seatsLeft === "number" && typeof value.email === "string" && Array.isArray(value.quote.lines);
}

function isOrder(value: unknown): value is OrderResponse {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.email === "string" && Array.isArray(value.lines);
}

function isSoldOut(value: unknown): value is SoldOutResponse {
  if (!isRecord(value) || !isRecord(value.quote)) return false;
  return value.code === "SOLD_OUT" && typeof value.sessionLabel === "string" && Array.isArray(value.quote.lines);
}
