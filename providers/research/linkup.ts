import type {
  AnalysisInput,
  ResearchFinding,
  ResearchRound,
} from "@/lib/types";
import {
  canonicalizeEventUrl,
  classifyEvidence,
  type EventIdentity,
  type EvidenceClass,
} from "@/lib/event-url";
import type { ResearchProvider } from "./types";

type LinkupResult = { name?: string; url?: string; content?: string };
type EventTopic = "prizes" | "sponsors" | "tracks" | "judging" | "rules";

const TOPICS: Record<EventTopic, RegExp> = {
  prizes: /\bprizes?|bount(?:y|ies)|awards?\b/i,
  sponsors: /\bsponsors?|partners?\b/i,
  tracks: /\btracks?|challenges?\b/i,
  judging: /\bjudg(?:e|es|ing)|criteria|scoring\b/i,
  rules:
    /\brules?|eligibility|submission|deadlines?|requirements?|info(?:rmation)?\b/i,
};

const CLASS_META: Record<
  EvidenceClass,
  { relationship: string; confidence: number; claim: string }
> = {
  TARGET_EVENT_FIRST_PARTY: {
    relationship: "Target event · first-party",
    confidence: 96,
    claim: "Directly fetched first-party evidence from the target event",
  },
  ORGANIZER_GENERAL: {
    relationship: "Organizer · general (not event-specific)",
    confidence: 55,
    claim: "Organizer-level context; not confirmed for this specific event",
  },
  OTHER_EVENT: {
    relationship: "Other event by the same organizer",
    confidence: 30,
    claim:
      "A different event by the same organizer; cannot confirm target-event facts",
  },
  THIRD_PARTY_RELEVANT: {
    relationship: "Idea landscape",
    confidence: 72,
    claim: "Evidence about the submitted idea landscape",
  },
  UNRELATED: {
    relationship: "Unrelated source",
    confidence: 40,
    claim: "Unrelated source",
  },
};

function pageTitle(markdown: string, url: string) {
  return (
    markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
    new URL(url).pathname.split("/").filter(Boolean).at(-1) ||
    "Official event page"
  );
}

function eventExcerpt(markdown: string) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const relevant = lines.filter(
    (line, index) =>
      Object.values(TOPICS).some((pattern) => pattern.test(line)) ||
      Object.values(TOPICS).some((pattern) =>
        pattern.test(lines[index - 1] ?? ""),
      ),
  );
  return [...lines.slice(0, 24), ...relevant]
    .filter((line, index, all) => all.indexOf(line) === index)
    .join("\n")
    .slice(0, 5000);
}

function discoveredEventLinks(
  markdown: string,
  sourceUrl: string,
  identity: EventIdentity,
) {
  const candidates: string[] = [];
  const add = (raw: string) => {
    try {
      const url = new URL(raw.replace(/&amp;/g, "&"), sourceUrl);
      url.hash = "";
      if (
        classifyEvidence(url.href, identity) === "TARGET_EVENT_FIRST_PARTY" &&
        Object.values(TOPICS).some((pattern) =>
          pattern.test(`${url.pathname} ${url.search}`),
        )
      )
        candidates.push(url.href);
    } catch {}
  };
  for (const match of markdown.matchAll(
    /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
  ))
    add(match[1]);
  for (const match of markdown.matchAll(/https?:\/\/[^\s<>)"']+/g))
    add(match[0]);
  return [...new Set(candidates)];
}

function coveredTopics(content: string) {
  return new Set(
    (Object.keys(TOPICS) as EventTopic[]).filter((topic) =>
      TOPICS[topic].test(content),
    ),
  );
}

export class LinkupResearchProvider implements ResearchProvider {
  constructor(private apiKey: string) {}

  private async search(
    query: string,
    includeDomains?: string[],
  ): Promise<LinkupResult[]> {
    const response = await fetch("https://api.linkup.so/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        depth: "standard",
        outputType: "searchResults",
        ...(includeDomains?.length ? { includeDomains } : {}),
      }),
    });
    if (!response.ok)
      throw new Error(`Linkup research failed (${response.status})`);
    const data = (await response.json()) as { results?: LinkupResult[] };
    return data.results ?? [];
  }

  private async fetchPage(url: string): Promise<LinkupResult | null> {
    const response = await fetch("https://api.linkup.so/v1/fetch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        extractImages: false,
        includeRawHtml: false,
        renderJs: true,
      }),
    });
    if (!response.ok) {
      console.warn("[linkup:event-fetch]", { url, status: response.status });
      return null;
    }
    const data = (await response.json()) as { markdown?: string };
    if (!data.markdown?.trim()) return null;
    return { name: pageTitle(data.markdown, url), url, content: data.markdown };
  }

  private identity(input: AnalysisInput) {
    return canonicalizeEventUrl(input.hackathonUrl);
  }

  private normalize(
    results: LinkupResult[],
    query: string,
    round: number,
    landscapeRelationship: string,
    identity: EventIdentity | null,
    eventScoped: boolean,
    direct = false,
  ): ResearchFinding[] {
    return results
      .filter((result) => result.url)
      .map((result, index) => {
        const evidenceClass: EvidenceClass = eventScoped
          ? classifyEvidence(result.url!, identity)
          : "THIRD_PARTY_RELEVANT";
        const meta = CLASS_META[evidenceClass];
        const directlyFetched =
          direct && evidenceClass === "TARGET_EVENT_FIRST_PARTY";
        return {
          id: `r${round}-${index}-${encodeURIComponent(result.url!).slice(-18)}`,
          title: result.name ?? "Untitled source",
          url: result.url!,
          retrievedAt: new Date().toISOString(),
          query,
          summary: eventScoped
            ? eventExcerpt(result.content ?? "")
            : (result.content ?? "").slice(0, 700),
          claimSupported: directlyFetched
            ? CLASS_META.TARGET_EVENT_FIRST_PARTY.claim
            : eventScoped
              ? meta.claim
              : CLASS_META.THIRD_PARTY_RELEVANT.claim,
          confidence: directlyFetched
            ? 96
            : eventScoped
              ? meta.confidence
              : CLASS_META.THIRD_PARTY_RELEVANT.confidence,
          relationship: eventScoped ? meta.relationship : landscapeRelationship,
          demo: false,
        };
      });
  }

  private dedupe(findings: ResearchFinding[]) {
    const urls = new Set<string>();
    return findings.filter((finding) => {
      const key = finding.url.replace(/\/$/, "");
      if (urls.has(key)) return false;
      urls.add(key);
      return true;
    });
  }

  private hasTargetFirstParty(findings: ResearchFinding[]) {
    return findings.some(
      (finding) => finding.relationship === "Target event · first-party",
    );
  }

  private derivedEventUrls(identity: EventIdentity, missing: Set<EventTopic>) {
    if (!identity.slug) return [];
    const base = identity.baseEventUrl.replace(/\/$/, "");
    const paths: Record<EventTopic, string> = {
      prizes: "prizes",
      sponsors: "sponsors",
      tracks: "tracks",
      judging: "judging",
      rules: "rules",
    };
    return [...missing].map((topic) => `${base}/${paths[topic]}`);
  }

  async researchHackathon(input: AnalysisInput): Promise<ResearchRound> {
    const identity = this.identity(input);
    const eventFindings: ResearchFinding[] = [];
    const eventQueries: string[] = [];
    const directPages: LinkupResult[] = [];

    // FETCH KNOWN URLs: always attempt the exact user-supplied event URL before search.
    if (input.hackathonUrl && identity) {
      eventQueries.push(`FETCH ${input.hackathonUrl}`);
      const root = await this.fetchPage(input.hackathonUrl);
      if (root) {
        directPages.push(root);
        const discovered = discoveredEventLinks(
          root.content ?? "",
          input.hackathonUrl,
          identity,
        ).slice(0, 6);
        for (const url of discovered) {
          eventQueries.push(`FETCH ${url}`);
          const page = await this.fetchPage(url);
          if (page) directPages.push(page);
        }
      }

      const directText = directPages
        .map((page) => page.content ?? "")
        .join("\n");
      const covered = coveredTopics(directText);
      const missing = new Set(
        (Object.keys(TOPICS) as EventTopic[]).filter(
          (topic) => !covered.has(topic),
        ),
      );
      for (const url of this.derivedEventUrls(identity, missing)
        .filter((url) => !directPages.some((page) => page.url === url))
        .slice(0, 5)) {
        eventQueries.push(`FETCH ${url}`);
        const page = await this.fetchPage(url);
        if (page) directPages.push(page);
      }
      eventFindings.push(
        ...this.normalize(
          directPages,
          "Direct target-event fetch",
          1,
          "Idea landscape",
          identity,
          true,
          true,
        ),
      );
    }

    // SEARCH UNKNOWN INFORMATION: official domain only, after direct retrieval.
    const directText = directPages.map((page) => page.content ?? "").join("\n");
    const covered = coveredTopics(directText);
    const missingTopics = (Object.keys(TOPICS) as EventTopic[]).filter(
      (topic) => !covered.has(topic),
    );
    if (identity && missingTopics.length) {
      const eventQuery = `${identity.label || "Target event"} ${missingTopics.join(", ")} official event details`;
      eventQueries.push(eventQuery);
      const results = await this.search(eventQuery, [identity.host]);
      const accepted = results.filter(
        (result) =>
          result.url &&
          classifyEvidence(result.url, identity) === "TARGET_EVENT_FIRST_PARTY",
      );
      eventFindings.push(
        ...this.normalize(
          accepted,
          eventQuery,
          1,
          "Idea landscape",
          identity,
          true,
        ),
      );
    } else if (!identity) {
      const eventQuery =
        "hackathon tracks sponsors judging criteria for the submitted project context";
      eventQueries.push(eventQuery);
      eventFindings.push(
        ...this.normalize(
          await this.search(eventQuery),
          eventQuery,
          1,
          "Idea landscape",
          identity,
          false,
        ),
      );
    }

    // The general landscape query remains unchanged and runs after event resolution.
    const landscapeQuery = `${input.idea} competitors alternatives technical precedent user problem evidence adoption willingness to pay`;
    const landscapeFindings = this.normalize(
      await this.search(landscapeQuery),
      landscapeQuery,
      1,
      "Idea landscape",
      identity,
      false,
    );
    return {
      round: 1,
      focus: "Target event resolution + idea landscape",
      queries: [...eventQueries, landscapeQuery],
      findings: this.dedupe([...eventFindings, ...landscapeFindings]),
      gaps: [],
    };
  }

  async identifyEvidenceGaps(
    round: ResearchRound,
    input: AnalysisInput,
  ): Promise<string[]> {
    const identity = this.identity(input);
    const eventFindings = round.findings.filter(
      (finding) =>
        finding.relationship.startsWith("Target event") ||
        finding.relationship.startsWith("Organizer") ||
        finding.relationship.startsWith("Other event"),
    );
    const firstPartyFindings = round.findings.filter(
      (finding) => finding.relationship === "Target event · first-party",
    );
    const landscape = round.findings.filter(
      (finding) => finding.relationship === "Idea landscape",
    );
    const eventText = firstPartyFindings
      .map((finding) => `${finding.title} ${finding.summary}`)
      .join(" ");
    const landscapeText = landscape
      .map((finding) => `${finding.title} ${finding.summary}`)
      .join(" ");
    const gaps: string[] = [];
    const eventName = identity?.label || "the supplied hackathon";
    if (input.hackathonUrl && !this.hasTargetFirstParty(round.findings)) {
      const seenOtherEvent = eventFindings.some((finding) =>
        finding.relationship.startsWith("Other event"),
      );
      gaps.push(
        seenOtherEvent
          ? `Confirm ${eventName} on its own event page${identity?.eventPath ? ` (${identity.host}${identity.eventPath})` : ""} — other events by the same organizer do not confirm its sponsors`
          : `Verify ${eventName} on first-party sources${identity?.host ? ` from ${identity.host}${identity.eventPath}` : ""}`,
      );
    }
    if (!/tracks?|challenges?|judg(?:e|ing)|criteria/i.test(eventText))
      gaps.push(
        `Verify ${eventName} tracks and judging criteria from its own event page`,
      );
    if (!/sponsors?|partners?/i.test(eventText))
      gaps.push(
        `Verify ${eventName} sponsors and sponsor challenges from its own event page`,
      );
    if (!/competitor|alternative|similar|versus|market/i.test(landscapeText))
      gaps.push(
        "Find direct competitors and explain the submitted idea’s differentiation",
      );
    if (
      !/pricing|pay|purchase|adoption|usage|retention|demand/i.test(
        landscapeText,
      )
    )
      gaps.push(
        "Find adoption, repeated-use, or willingness-to-pay evidence for the target user",
      );
    return gaps.slice(0, 4).length
      ? gaps.slice(0, 4)
      : ["Validate the most important claims with direct target-user evidence"];
  }

  async followUpSearch(
    gaps: string[],
    input: AnalysisInput,
  ): Promise<ResearchRound> {
    const identity = this.identity(input);
    const eventScoped = (gap: string) =>
      Boolean(identity) &&
      /hackathon|event|track|sponsor|partner|judg|prize|deadline|submission|criteria/i.test(
        gap,
      );
    const queries = gaps
      .slice(0, 3)
      .map((gap) =>
        eventScoped(gap)
          ? `${identity!.label || "Target event"} ${gap}`
          : `${gap}. Target project: ${input.idea}`,
      );
    const batches = await Promise.all(
      queries.map((query, index) =>
        this.search(
          query,
          eventScoped(gaps[index]) ? [identity!.host] : undefined,
        ),
      ),
    );
    const findings = this.dedupe(
      batches.flatMap((results, index) => {
        const scoped = eventScoped(gaps[index]);
        const accepted = scoped
          ? results.filter(
              (result) =>
                result.url &&
                classifyEvidence(result.url, identity) ===
                  "TARGET_EVENT_FIRST_PARTY",
            )
          : results;
        return this.normalize(
          accepted,
          queries[index],
          2,
          "Gap-directed follow-up",
          identity,
          scoped,
        );
      }),
    ).slice(0, 9);
    return {
      round: 2,
      focus: "Gap-directed follow-up research",
      queries,
      findings,
      gaps: findings.length
        ? ["Direct interviews or usage data remain unverified by desk research"]
        : [
            "Research provider returned no follow-up results; the identified gaps remain UNKNOWN",
          ],
    };
  }
}
