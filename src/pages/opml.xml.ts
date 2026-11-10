import type { APIRoute } from "astro";
import type { FeedCache, FeedFormat, FeedSource } from "@/types";
import members from "@/members.json";
import {
	FEED_TITLE,
	escapeXml,
	isAbsoluteHttpUrl,
	toRfc822Ist,
} from "@/lib/feeds";

let cache: FeedCache = {};
try {
	cache = (await import("@/feed-cache.json")).default as unknown as FeedCache;
} catch {
	// not generated yet
}

interface Outline {
	name: string;
	website: string;
	source: FeedSource;
}

function hostOf(website: string): string {
	try {
		const url = new URL(
			website.includes("://") ? website : `https://${website}`,
		);
		return url.hostname;
	} catch {
		return "";
	}
}

/**
 * Prefer the feed's own origin when it lives on the member's host, so an
 * http-only site is not advertised as https.
 */
function siteUrl(website: string, feedUrl: string): string {
	const websiteHost = hostOf(website);

	try {
		const feed = new URL(feedUrl);
		if (websiteHost && feed.hostname === websiteHost) {
			return feed.origin;
		}
	} catch {
		// fall through to the website URL
	}

	return `https://${website.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}

/** Explicit feeds carry no parsed format; infer it from the URL. */
function inferFormat(url: string): FeedFormat {
	try {
		const path = new URL(url).pathname.toLowerCase();
		if (path.includes("atom")) return "atom";
	} catch {
		// keep the rss default
	}
	return "rss";
}

function explicitSources(feeds: string[] | undefined): FeedSource[] {
	return (feeds ?? [])
		.filter(isAbsoluteHttpUrl)
		.filter((url) => {
			// A bare origin in members.json is almost always the site homepage,
			// not a feed. Skip it so OPML never advertises an HTML page when it
			// has to fall back to explicitly configured URLs.
			try {
				const { pathname } = new URL(url);
				return pathname !== "/" && pathname !== "";
			} catch {
				return false;
			}
		})
		.map((url) => ({ url, format: inferFormat(url) }));
}

function collectOutlines(feedCache: FeedCache): Outline[] {
	const outlines: Outline[] = [];

	// Index 0 is amrita.town itself, which has no feed of its own.
	for (const member of members.slice(1)) {
		const cached = feedCache[member.website];
		const sources =
			cached?.feeds && cached.feeds.length > 0
				? cached.feeds
				: explicitSources(member.feeds);

		if (sources.length === 0) continue;

		outlines.push({
			name: member.name,
			website: member.website,
			// fetch-feeds orders feeds that yielded posts first
			source: sources[0],
		});
	}

	return outlines;
}

function buildOpml(feedCache: FeedCache): string {
	const outlines = collectOutlines(feedCache).sort((a, b) =>
		a.name.localeCompare(b.name, "en"),
	);
	const now = toRfc822Ist(new Date());

	const lines: string[] = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>',
		'<opml version="2.0">',
		"\t<head>",
		`\t\t<title>${FEED_TITLE}</title>`,
		"\t\t<ownerName>amrita.town</ownerName>",
		`\t\t<dateCreated>${now}</dateCreated>`,
		`\t\t<dateModified>${now}</dateModified>`,
		"\t</head>",
		"\t<body>",
	];

	for (const outline of outlines) {
		const name = escapeXml(outline.name);
		lines.push(
			`\t\t<outline type="${outline.source.format}" text="${name}" title="${name}" xmlUrl="${escapeXml(outline.source.url)}" htmlUrl="${escapeXml(siteUrl(outline.website, outline.source.url))}" />`,
		);
	}

	lines.push("\t</body>");
	lines.push("</opml>");

	return `${lines.join("\n")}\n`;
}

export const prerender = true;

export const GET = (async () =>
	new Response(buildOpml(cache), {
		headers: {
			"Content-Type": "text/xml; charset=utf-8",
		},
	})) satisfies APIRoute;
