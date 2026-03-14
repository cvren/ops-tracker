"use client";

import type { CommitmentRiskMetadata } from "@/lib/commitment-policies";
import { commitmentPolicyKindLabels } from "@/lib/constants";
import { CommitmentSeverityBadge } from "@/components/status-badges";

export function CommitmentRiskSummary({
  risk,
  limit = 3
}: {
  risk: CommitmentRiskMetadata;
  limit?: number;
}) {
  if (risk.hits.length === 0) {
    return null;
  }

  const visibleHits = risk.hits.slice(0, limit);
  const hiddenHitCount = risk.hits.length - visibleHits.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleHits.map((hit) => (
          <CommitmentSeverityBadge
            key={`${hit.policyId}-${hit.kind}`}
            severity={hit.severity}
          >
            {commitmentPolicyKindLabels[hit.kind]} · {hit.thresholdLabel}
          </CommitmentSeverityBadge>
        ))}
        {hiddenHitCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70 ring-1 ring-black/10">
            +{hiddenHitCount} more
          </span>
        ) : null}
      </div>
      {risk.summary ? (
        <p className="text-xs leading-5 text-ink/65">
          {risk.summary} Source: {risk.hits[0]?.policyName}
        </p>
      ) : null}
    </div>
  );
}
