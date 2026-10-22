export type SessionId = "main" | "late";

export type TicketKind = "full" | "child";

export type ValidationError = {
  path: string;
  message: string;
};

export type QuoteLine = {
  name: string;
  age: number;
  kind: TicketKind;
  price: number;
};

export type Quote = {
  lines: QuoteLine[];
  total: number;
};

export type OrderLine = QuoteLine & {
  seat: string;
};

export type NormalizedOrder = {
  sessionId: SessionId;
  email: string;
  participants: { name: string; age: number }[];
};

export type PreviewResponse = {
  sessionId: SessionId;
  sessionLabel: string;
  time: string;
  dateLabel: string;
  seatsBefore: number;
  seatsLeft: number;
  availabilityChanged: boolean;
  enough: boolean;
  email: string;
  quote: Quote;
};

export type OrderResponse = {
  id: string;
  email: string;
  sessionId: SessionId;
  sessionLabel: string;
  time: string;
  dateLabel: string;
  lines: OrderLine[];
  total: number;
  seatsLeft: number;
};

export type SoldOutResponse = {
  code: "SOLD_OUT";
  sessionId: SessionId;
  sessionLabel: string;
  time: string;
  dateLabel: string;
  seatsBefore: number;
  seatsLeft: number;
  email: string;
  quote: Quote;
};

export type InvalidResponse = {
  code: "INVALID";
  errors: ValidationError[];
};

export type EventAvailability = {
  mainSeatsLeft: number;
  mainCapacity: number;
  lateSeatsShown: number;
};
