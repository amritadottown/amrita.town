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
	toRfc822,
	truncate,
} from "@/lib/feeds";

let cache: FeedCache = {};
try {
	cache = (await import("@/feed-cache.json")).default as unknown as FeedCache;
} catch {
	// not generated yet
}

const MAX_ITEMS = 100;
const MAX_DESCRIPTION = 400;

function buildRss(feedCache: FeedCache): string {
	const items = selectRecentPosts(feedCache, MAX_ITEMS);
	const lastBuildDate = items[0]?.date ?? fallbackDate();

	const lines: string[] = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
		"\t<channel>",
		`\t\t<title>${escapeXml(FEED_TITLE)}</title>`,
		`\t\t<link>${SITE}/blogroll</link>`,
		`\t\t<description>${escapeXml(FEED_DESCRIPTION)}</description>`,
		"\t\t<language>en</language>",
		`\t\t<lastBuildDate>${toRfc822(lastBuildDate)}</lastBuildDate>`,
		`\t\t<atom:link rel="self" type="application/rss+xml" href="${SITE}/rss.xml" />`,
		"\t\t<generator>astro</generator>",
	];

	for (const { post, member, date } of items) {
		const title = cleanTitle(post.title);
		const description = post.description
			? truncate(stripHtml(post.description), MAX_DESCRIPTION)
			: "";

		lines.push("\t\t<item>");
		lines.push(`\t\t\t<title>${escapeXml(title)}</title>`);
		lines.push(`\t\t\t<link>${escapeXml(post.link)}</link>`);
		lines.push(
			`\t\t\t<guid isPermaLink="true">${escapeXml(post.link)}</guid>`,
		);
		lines.push(`\t\t\t<pubDate>${toRfc822(date)}</pubDate>`);
		lines.push(`\t\t\t<dc:creator>${escapeXml(member.name)}</dc:creator>`);
		if (description) {
			lines.push(`\t\t\t<description>${escapeXml(description)}</description>`);
		}
		lines.push("\t\t</item>");
	}

	lines.push("\t</channel>");
	lines.push("</rss>");

	return `${lines.join("\n")}\n`;
}

export const prerender = true;

export const GET = (async () =>
	new Response(buildRss(cache), {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
		},
	})) satisfies APIRoute;
