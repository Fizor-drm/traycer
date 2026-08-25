import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { UserSessionListItem } from "@traycer/protocol/auth/devices-sessions";
import {
  Clock,
  Globe,
  HelpCircle,
  LogOut,
  Monitor,
  Server,
  ShieldAlert,
  Smartphone,
  Terminal,
} from "lucide-react";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { AgentSpinningDots } from "@/components/ui/agent-spinning-dots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type RevokeUserSessionInput,
  useAuthRevokeUserSession,
} from "@/hooks/auth/use-revoke-user-session-mutation";
import { useAuthRevokeAllSessions } from "@/hooks/auth/use-revoke-all-sessions-mutation";
import { useAuthFetchUserSessions } from "@/hooks/auth/use-user-sessions-query";
import {
  isStepUpRequiredError,
  runStepUpProtectedAction,
  type StepUpCredential,
} from "@/lib/auth/step-up-flow";
import { StepUpChallengeDialog } from "@/components/auth/step-up-challenge-dialog";
import {
  actionErrorFromStepUpError,
  StepUpCanceledError,
  type StepUpPromptPurpose,
  type StepUpPromptRequest,
} from "@/lib/auth/step-up-prompt";
import { useHostBinding } from "@/lib/host";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth/auth-store";

const SESSION_ABSOLUTE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

interface SessionMutation {
  readonly isPending: boolean;
  readonly mutateAsync: (input: RevokeUserSessionInput) => Promise<unknown>;
}

function sessionClientLabel(
  session: UserSessionListItem,
  t: TFunction<"panels">,
): string {
  switch (session.clientKind) {
    case "web":
      return t("Web");
    case "desktop":
      return t("Desktop");
    case "cli":
      return t("CLI");
    case "extension":
      return t("Extension");
    case "host":
      return t("Host");
    default:
      return t("Unknown client");
  }
}

function sessionDisplayLine(
  session: UserSessionListItem,
  t: TFunction<"panels">,
): string {
  const parts = [
    session.displayLabel,
    session.platform,
    session.appVersion === null ? null : t("App {{version}}", { version: session.appVersion }),
    // Coarse (city/region-level) and the strongest "is this me?" signal on the
    // row - a session in the wrong place is what a user actually scans for.
    session.location,
  ].filter((part): part is string => part !== null && part.trim().length > 0);
  return parts.length === 0
    ? t("Session details unavailable")
    : parts.join(" / ");
}

function formatRelativeTime(value: string, t: TFunction<"panels">): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return t("unknown");
  }
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1_000));
  if (seconds < 60) {
    return t("just now");
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return minutes === 1
      ? t("1 minute ago")
      : t("{{count}} minutes ago", { count: minutes });
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? t("1 hour ago") : t("{{count}} hours ago", { count: hours });
  }
  const days = Math.round(hours / 24);
  if (days < 30) {
    return days === 1 ? t("1 day ago") : t("{{count}} days ago", { count: days });
  }
  return SESSION_ABSOLUTE_TIME_FORMATTER.format(new Date(timestamp));
}

function sessionStatusLine(
  session: UserSessionListItem,
  t: TFunction<"panels">,
): string {
  if (session.revoked) {
    return session.revokedAt === null
      ? t("Signed out")
      : t("Signed out {{time}}", {
          time: formatRelativeTime(session.revokedAt, t),
        });
  }
  return t("Last seen {{time}}", {
    time: formatRelativeTime(session.lastSeenAt, t),
  });
}

function sessionTimelineLine(
  session: UserSessionListItem,
  t: TFunction<"panels">,
): string {
  return t("Created {{created}} · {{status}}", {
    created: formatRelativeTime(session.createdAt, t),
    status: sessionStatusLine(session, t),
  });
}

function sortSessions(
  sessions: readonly UserSessionListItem[],
): readonly UserSessionListItem[] {
  return [...sessions].sort((left, right) => {
    if (left.current !== right.current) {
      return left.current ? -1 : 1;
    }
    return Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt);
  });
}

function sessionIcon(session: UserSessionListItem): ReactNode {
  const className = "size-4";
  switch (session.clientKind) {
    case "web":
      return <Globe className={className} />;
    case "desktop":
      return <Monitor className={className} />;
    case "cli":
      return <Terminal className={className} />;
    case "extension":
      return <Smartphone className={className} />;
    case "host":
      return <Server className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}

export function DevicesSessionsPanel() {
  const { t } = useTranslation("panels");
  const signedIn = useAuthStore((s) => s.status === "signed-in");
  const binding = useHostBinding();
  const query = useAuthFetchUserSessions();
  const revokeAllSessions = useAuthRevokeAllSessions();
  const [actionError, setActionError] = useState<string | null>(null);
  const [stepUpPrompt, setStepUpPrompt] = useState<StepUpPromptRequest | null>(
    null,
  );
  const [activeSessionFamilyId, setActiveSessionFamilyId] = useState<
    string | null
  >(null);
  const stepUpPromptIdRef = useRef(0);
  const stepUpCredentialRef = useRef<StepUpCredential | null>(null);
  const sessions = useMemo(
    () => sortSessions(query.data?.sessions ?? []),
    [query.data?.sessions],
  );
  const loading = query.isPending && query.fetchStatus !== "idle";
  const actionBusy =
    activeSessionFamilyId !== null ||
    revokeAllSessions.isPending ||
    stepUpPrompt !== null;

  const requestStepUpCredential = useCallback(
    (purpose: StepUpPromptPurpose): Promise<StepUpCredential> => {
      const id = stepUpPromptIdRef.current + 1;
      stepUpPromptIdRef.current = id;
      return new Promise((resolve, reject) => {
        setStepUpPrompt({ id, purpose, subjectLabel: null, resolve, reject });
      });
    },
    [],
  );

  const handleStepUpVerified = useCallback(
    (credential: StepUpCredential) => {
      if (stepUpPrompt === null) {
        return;
      }
      stepUpPrompt.resolve(credential);
      setStepUpPrompt(null);
    },
    [stepUpPrompt],
  );

  const handleStepUpCanceled = useCallback(() => {
    if (stepUpPrompt === null) {
      return;
    }
    stepUpPrompt.reject(new StepUpCanceledError());
    setStepUpPrompt(null);
  }, [stepUpPrompt]);

  const handleRevokeSession = useCallback(
    async (
      session: UserSessionListItem,
      mutation: SessionMutation,
    ): Promise<void> => {
      if (activeSessionFamilyId !== null) {
        return;
      }
      setActionError(null);
      setActiveSessionFamilyId(session.familyId);
      try {
        await runStepUpProtectedAction({
          getCredential: () => stepUpCredentialRef.current,
          setCredential: (credential) => {
            stepUpCredentialRef.current = credential;
          },
          requestCredential: () => requestStepUpCredential("session-revoke"),
          action: (useStepUpCredential) =>
            mutation.mutateAsync({
              familyId: session.familyId,
              useStepUpCredential,
            }),
          nowMs: () => Date.now(),
        });
        if (session.current && binding !== null) {
          await binding.auth.signOut();
        }
      } catch (error) {
        setActionError(actionErrorFromStepUpError(error));
      } finally {
        setActiveSessionFamilyId(null);
      }
    },
    [activeSessionFamilyId, binding, requestStepUpCredential],
  );

  const handleRevokeAll = useCallback(async (): Promise<void> => {
    if (binding === null || revokeAllSessions.isPending) {
      return;
    }
    setActionError(null);
    try {
      await requestStepUpCredential("global-revoke");
      try {
        await revokeAllSessions.mutateAsync(undefined);
      } catch (error) {
        if (!isStepUpRequiredError(error)) {
          throw error;
        }
        await requestStepUpCredential("global-revoke");
        await revokeAllSessions.mutateAsync(undefined);
      }
      await binding.auth.signOut();
    } catch (error) {
      setActionError(actionErrorFromStepUpError(error));
    }
  }, [binding, requestStepUpCredential, revokeAllSessions]);

  return (
    <>
      <SettingsPanelShell
        title={t("Sessions")}
        description={t(
          "Review where your account is signed in and remove access you no longer recognize.",
        )}
      >
        <div className="flex flex-col">
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h2 className="text-ui font-medium">{t("Signed-in sessions")}</h2>
              <p className="text-ui-xs text-muted-foreground">
                {t(
                  "Browser, desktop, CLI, extension, and host access for this account.",
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!signedIn || actionBusy}
              onClick={() => void handleRevokeAll()}
            >
              <LogOut className="size-3.5" />
              {t("Sign out everywhere")}
              {revokeAllSessions.isPending ? (
                <AgentSpinningDots
                  className="text-current"
                  testId={undefined}
                  variant="orbit"
                />
              ) : null}
            </Button>
          </div>

          <DevicesSessionsBody
            signedIn={signedIn}
            loading={loading}
            isError={query.isError}
            sessions={sessions}
            actionBusy={actionBusy}
            activeSessionFamilyId={activeSessionFamilyId}
            actionError={actionError}
            onRevokeSession={handleRevokeSession}
          />
        </div>
      </SettingsPanelShell>
      <StepUpChallengeDialog
        request={stepUpPrompt}
        onVerified={handleStepUpVerified}
        onCancel={handleStepUpCanceled}
      />
    </>
  );
}

function DevicesSessionsBody(props: {
  readonly signedIn: boolean;
  readonly loading: boolean;
  readonly isError: boolean;
  readonly sessions: readonly UserSessionListItem[];
  readonly actionBusy: boolean;
  readonly activeSessionFamilyId: string | null;
  readonly actionError: string | null;
  readonly onRevokeSession: (
    session: UserSessionListItem,
    mutation: SessionMutation,
  ) => Promise<void>;
}) {
  const { t } = useTranslation("panels");
  if (!props.signedIn) {
    return (
      <div className="px-5 py-6 text-ui-sm text-muted-foreground">
        {t("Sign in to see your sessions.")}
      </div>
    );
  }
  if (props.loading) {
    return <DevicesSessionsSkeleton />;
  }
  if (props.isError) {
    return (
      <div className="flex items-start gap-3 px-5 py-6 text-ui-sm text-destructive">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <span>{t("Couldn't load your sessions. Retrying...")}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {props.actionError === null ? null : (
        <div
          className="flex items-start gap-3 border-b border-amber-500/20 bg-amber-500/10 px-5 py-3 text-ui-sm text-amber-700 dark:text-amber-300"
          role="alert"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>{props.actionError}</span>
        </div>
      )}
      {props.sessions.length === 0 ? (
        <div className="px-5 py-6 text-ui-sm text-muted-foreground">
          {t("No signed-in sessions found.")}
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {props.sessions.map((session) => (
            <SessionRow
              key={session.familyId}
              session={session}
              actionBusy={props.actionBusy}
              activeSessionFamilyId={props.activeSessionFamilyId}
              onRevokeSession={props.onRevokeSession}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DevicesSessionsSkeleton() {
  return (
    <div className="space-y-3 px-5 py-5">
      <Skeleton className="h-6 w-full max-w-96" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function SessionRow(props: {
  readonly session: UserSessionListItem;
  readonly actionBusy: boolean;
  readonly activeSessionFamilyId: string | null;
  readonly onRevokeSession: (
    session: UserSessionListItem,
    mutation: SessionMutation,
  ) => Promise<void>;
}) {
  const { session } = props;
  const { t } = useTranslation("panels");
  const mutation = useAuthRevokeUserSession(session.familyId);
  const pending =
    mutation.isPending || props.activeSessionFamilyId === session.familyId;
  const disabled = session.revoked || (props.actionBusy && !pending);
  return (
    <li
      className={cn(
        "flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        session.revoked && "bg-foreground/3 text-muted-foreground",
      )}
    >
      <div className="flex min-w-0 gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground/8 text-muted-foreground">
          {sessionIcon(session)}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ui-sm font-medium text-foreground">
              {session.current ? t("This session") : t("Session")}
            </span>
            <Badge variant="outline">{sessionClientLabel(session, t)}</Badge>
            {session.revoked ? (
              <Badge variant="outline" className="text-muted-foreground">
                {t("Signed out")}
              </Badge>
            ) : null}
          </div>
          <p className="text-ui-sm text-muted-foreground wrap-anywhere">
            {sessionDisplayLine(session, t)}
          </p>
          <p className="flex items-center gap-1.5 text-ui-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {pending
              ? t("Signing out")
              : sessionTimelineLine(session, t)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => void props.onRevokeSession(session, mutation)}
      >
        <LogOut className="size-3.5" />
        {t("Sign out")}
        {pending ? (
          <AgentSpinningDots
            className="text-current"
            testId={undefined}
            variant="orbit"
          />
        ) : null}
      </Button>
    </li>
  );
}
