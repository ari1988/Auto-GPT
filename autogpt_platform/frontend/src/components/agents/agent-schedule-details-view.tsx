"use client";
import React, { useCallback, useMemo } from "react";

import {
  GraphExecutionID,
  GraphMeta,
  Schedule,
  ScheduleID,
} from "@/lib/autogpt-server-api";
import { useBackendAPI } from "@/lib/autogpt-server-api/context";

import { AgentRunStatus } from "@/components/agents/agent-run-status-chip";
import ActionButtonGroup from "@/components/agptui/action-button-group";
import type { ButtonAction } from "@/components/agptui/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconCross } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import LoadingBox from "@/components/ui/loading";
import { useToastOnFail } from "@/components/molecules/Toast/use-toast";
import { humanizeCronExpression } from "@/lib/cron-expression-utils";
import { PlayIcon } from "lucide-react";

export default function AgentScheduleDetailsView({
  graph,
  schedule,
  agentActions,
  onForcedRun,
  doDeleteSchedule,
}: {
  graph: GraphMeta;
  schedule: Schedule;
  agentActions: ButtonAction[];
  onForcedRun: (runID: GraphExecutionID) => void;
  doDeleteSchedule: (scheduleID: ScheduleID) => void;
}): React.ReactNode {
  const api = useBackendAPI();

  const selectedRunStatus: AgentRunStatus = "scheduled";

  const toastOnFail = useToastOnFail();

  const infoStats: { label: string; value: React.ReactNode }[] = useMemo(() => {
    return [
      {
        label: "Status",
        value:
          selectedRunStatus.charAt(0).toUpperCase() +
          selectedRunStatus.slice(1),
      },
      {
        label: "Schedule",
        value: humanizeCronExpression(schedule.cron),
      },
      {
        label: "Next run",
        value: schedule.next_run_time.toLocaleString(),
      },
    ];
  }, [schedule, selectedRunStatus]);

  const agentRunInputs: Record<
    string,
    { title?: string; /* type: BlockIOSubType; */ value: any }
  > = useMemo(() => {
    // TODO: show (link to) preset - https://github.com/Significant-Gravitas/AutoGPT/issues/9168

    // Add type info from agent input schema
    return Object.fromEntries(
      Object.entries(schedule.input_data).map(([k, v]) => [
        k,
        {
          title: graph.input_schema.properties[k].title,
          /* TODO: type: agent.input_schema.properties[k].type */
          value: v,
        },
      ]),
    );
  }, [graph, schedule]);

  const runNow = useCallback(
    () =>
      api
        .executeGraph(
          graph.id,
          graph.version,
          schedule.input_data,
          schedule.input_credentials,
        )
        .then((run) => onForcedRun(run.graph_exec_id))
        .catch(toastOnFail("execute agent")),
    [api, graph, schedule, onForcedRun, toastOnFail],
  );

  const runActions: ButtonAction[] = useMemo(
    () => [
      {
        label: (
          <>
            <PlayIcon className="mr-2 size-4" />
            Run now
          </>
        ),
        callback: runNow,
      },
      {
        label: (
          <>
            <IconCross className="mr-2 size-4 px-0.5" />
            Delete schedule
          </>
        ),
        callback: () => doDeleteSchedule(schedule.id),
        variant: "destructive",
      },
    ],
    [runNow],
  );

  return (
    <div className="agpt-div flex gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <Card className="agpt-box">
          <CardHeader>
            <CardTitle className="font-poppins text-lg">Info</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex justify-stretch gap-4">
              {infoStats.map(({ label, value }) => (
                <div key={label} className="flex-1">
                  <p className="text-sm font-medium text-black">{label}</p>
                  <p className="text-sm text-neutral-600">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="agpt-box">
          <CardHeader>
            <CardTitle className="font-poppins text-lg">Input</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {agentRunInputs !== undefined ? (
              Object.entries(agentRunInputs).map(([key, { title, value }]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{title || key}</label>
                  <Input value={value} className="rounded-full" disabled />
                </div>
              ))
            ) : (
              <LoadingBox spinnerSize={12} className="h-24" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Run / Agent Actions */}
      <aside className="w-48 xl:w-56">
        <div className="flex flex-col gap-8">
          <ActionButtonGroup title="Run actions" actions={runActions} />

          <ActionButtonGroup title="Agent actions" actions={agentActions} />
        </div>
      </aside>
    </div>
  );
}
