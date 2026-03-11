import { type ActionState } from "@/lib/forms";

export function ActionFeedback({ state }: { state: ActionState }) {
  if (state.status === "idle") {
    return null;
  }

  return (
    <div
      className={
        state.status === "success"
          ? "rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          : "rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
      }
    >
      <p>{state.message}</p>
      {state.fieldErrors ? (
        <ul className="mt-2 space-y-1">
          {Object.entries(state.fieldErrors).map(([field, messages]) => (
            <li key={field}>
              <span className="font-semibold capitalize">
                {field.replace(/([A-Z])/g, " $1")}:
              </span>{" "}
              {messages?.join(", ") ?? "Invalid value"}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
