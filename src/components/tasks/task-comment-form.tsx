"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { addTaskCommentAction } from "@/app/actions/task-actions";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SubmitButton } from "@/components/forms/submit-button";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INITIAL_ACTION_STATE } from "@/lib/forms";

type TaskCommentFormProps = {
  taskId: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

export function TaskCommentForm({ taskId, users }: TaskCommentFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    addTaskCommentAction,
    INITIAL_ACTION_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <Panel className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Comment
        </p>
        <h2 className="text-2xl font-semibold text-ink">
          Leave context on the task
        </h2>
      </div>
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="taskId" value={taskId} />
        <div className="space-y-2">
          <label htmlFor="comment-body" className="text-sm font-medium text-ink">
            Comment
          </label>
          <Textarea
            id="comment-body"
            name="body"
            placeholder="What changed, what is at risk, and who needs to look next?"
            className="min-h-28"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="comment-mentions"
            className="text-sm font-medium text-ink"
          >
            Mention members
          </label>
          <Select
            id="comment-mentions"
            name="mentionedUserIds"
            multiple
            className="min-h-32"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {user.email}
              </option>
            ))}
          </Select>
          <p className="text-xs text-ink/60">
            Hold Command or Control to select multiple members.
          </p>
        </div>
        <ActionFeedback state={state} />
        <SubmitButton label="Add comment" pendingLabel="Posting..." />
      </form>
    </Panel>
  );
}
