import type { APIRoute } from "astro";
import type { FeedCache } from "@/types";
import {
	FEED_DESCRIPTION,
	FEED_TITLE,
	SITE,
	cleanTitle,
	escapeXml,
	fallbackDate,
	selectRecentPosts,
	stripHtml,
	toRfc3339,
	truncate,
} from "@/lib/feeds";

let cache: FeedCache = {};
try {
	cache = (await import("@/feed-cache.json")).default as unknown as FeedCache;
} catch {
	// not generated yet
}

const FEED_ID = "tag:amrita.town,2026:blogroll";
const MAX_ITEMS = 100;
const MAX_SUMMARY = 400;

/** Stable, unique entry id derived from the post link. */
function entryId(link: string): string {
	return `tag:amrita.town,2026:${encodeURIComponent(link)}`;
}

function buildAtom(feedCache: FeedCache): string {
	const items = selectRecentPosts(feedCache, MAX_ITEMS);
	const updated = items[0]?.date ?? fallbackDate();

	const lines: string[] = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">',
		`\t<id>${escapeXml(FEED_ID)}</id>`,
		`\t<title>${escapeXml(FEED_TITLE)}</title>`,
		`\t<subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>`,
		`\t<updated>${toRfc3339(updated)}</updated>`,
		"\t<author>",
		"\t\t<name>amrita.town</name>",
		"\t</author>",
		`\t<link rel="self" type="application/atom+xml" href="${SITE}/atom.xml" />`,
		`\t<link rel="alternate" type="text/html" href="${SITE}/blogroll" />`,
		"\t<generator>astro</generator>",
	];

	for (const { post, member, date } of items) {
		const title = cleanTitle(post.title);
		const summary = post.description
			? truncate(stripHtml(post.description), MAX_SUMMARY)
			: "";
		const timestamp = toRfc3339(date);

		lines.push("\t<entry>");
		lines.push(`\t\t<id>${escapeXml(entryId(post.link))}</id>`);
		lines.push(`\t\t<title>${escapeXml(title)}</title>`);
		lines.push(`\t\t<link rel="alternate" href="${escapeXml(post.link)}" />`);
		lines.push(`\t\t<updated>${timestamp}</updated>`);
		lines.push(`\t\t<published>${timestamp}</published>`);
		lines.push("\t\t<author>");
		lines.push(`\t\t\t<name>${escapeXml(member.name)}</name>`);
		lines.push("\t\t</author>");
		if (summary) {
			lines.push(`\t\t<summary type="text">${escapeXml(summary)}</summary>`);
		}
		lines.push("\t</entry>");
	}

	lines.push("</feed>");

	return `${lines.join("\n")}\n`;
}

export const prerender = true;

export const GET = (async () =>
	new Response(buildAtom(cache), {
		headers: {
			"Content-Type": "application/atom+xml; charset=utf-8",
		},
	})) satisfies APIRoute;
