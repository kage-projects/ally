import type {
  AdaptationPlan,
  AllyBusEvent,
  DecisionGuardrails,
  DecisionSource,
  DecisionStatus,
  EvaluationResults,
  FrictionSummary,
  Preset,
  Profile,
} from "../../../../mocks/dashboard/contracts";

export type {
  AdaptationPlan,
  AllyBusEvent,
  DecisionGuardrails,
  DecisionSource,
  DecisionStatus,
  EvaluationResults,
  FrictionSummary,
  Preset,
  Profile,
};

export type DashboardDecision = {
  id: string;
  at: number;
  source: DecisionSource;
  preset: Preset;
  latencyMs: number;
  confidence: number;
  previousPlan: AdaptationPlan | null;
  plan: AdaptationPlan;
  explanation: string;
  guardrails: DecisionGuardrails;
  status: DecisionStatus;
};

export type MetricSnapshot = {
  misTapRate: number | null;
  avgTimeToTarget: number;
  errorLoops: number;
};

export type SessionComparison = {
  before: MetricSnapshot | null;
  after: MetricSnapshot | null;
  beforeWindowCount: number;
  afterWindowCount: number;
};

export type DashboardViewModel = {
  currentSummary: FrictionSummary | null;
  summaryHistory: FrictionSummary[];
  profile: Profile;
  preset: Preset;
  confidence: number;
  decisions: DashboardDecision[];
  activeDecision: DashboardDecision | null;
  comparison: SessionComparison;
  lastEventAt: number | null;
};