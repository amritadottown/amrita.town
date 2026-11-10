import type { FeedCache, FeedPost } from "@/types";

export const SITE = "https://amrita.town";
export const FEED_TITLE = "amrita.town blogroll";
export const FEED_DESCRIPTION = "Recent posts from the amrita.town webring.";

export interface PostWithMember {
	post: FeedPost;
	member: { name: string; website: string };
}

export interface DatedPost extends PostWithMember {
	/** Parsed publication date, guaranteed valid. */
	date: Date;
}

/** Deterministic fallback for feeds with no usable post dates. */
export function fallbackDate(): Date {
	return new Date("2026-01-01T00:00:00.000Z");
}

/** Absolute http(s) URLs only. */
export function isAbsoluteHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

/** Flatten every member's posts and sort them newest first. */
export function aggregatePosts(cache: FeedCache): PostWithMember[] {
	const allPosts: PostWithMember[] = [];

	for (const memberData of Object.values(cache)) {
		for (const post of memberData.posts) {
			allPosts.push({
				post,
				member: { name: memberData.name, website: memberData.website },
			});
		}
	}

	allPosts.sort(
		(a, b) =>
			new Date(b.post.published).getTime() -
			new Date(a.post.published).getTime(),
	);

	return allPosts;
}

/**
 * Parse a cache timestamp. Returns null when the value is missing, unparseable
 * or outside the range a feed date can represent.
 */
export function parsePostDate(value: string | undefined): Date | null {
	if (!value) return null;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	const year = date.getUTCFullYear();
	if (year < 1970 || year > 9999) return null;

	return date;
}

/** Select the newest posts, dropping entries without a usable date and link. */
export function selectRecentPosts(cache: FeedCache, max = 100): DatedPost[] {
	const seen = new Set<string>();
	const selected: DatedPost[] = [];

	for (const entry of aggregatePosts(cache)) {
		const link = entry.post.link;
		if (typeof link !== "string" || !isAbsoluteHttpUrl(link)) continue;
		if (seen.has(link)) continue;

		const date = parsePostDate(entry.post.published);
		if (!date) continue;

		seen.add(link);
		selected.push({ ...entry, date });

		if (selected.length >= max) break;
	}

	return selected;
}

/** Decode a numeric character reference, ignoring unusable values. */
function fromCodePointSafe(code: number): string {
	if (
		!Number.isFinite(code) ||
		code <= 0 ||
		code > 0x10ffff ||
		(code >= 0xd800 && code <= 0xdfff)
	) {
		return "";
	}
	return String.fromCodePoint(code);
}

/** Decode HTML entities (&#xxx; &amp; &lt; etc.) */
function decodeEntities(text: string): string {
	// Map of named entities to their character
	const named: Record<string, string> = {
		amp: "&",
		lt: "<",
		gt: ">",
		quot: '"',
		apos: "'",
		nbsp: " ",
		ndash: "\u2013",
		mdash: "\u2014",
		lsquo: "\u2018",
		rsquo: "\u2019",
		ldquo: "\u201c",
		rdquo: "\u201d",
		hellip: "\u2026",
		laquo: "\u00ab",
		raquo: "\u00bb",
	};
	// Iterate to handle double-encoded entities (e.g. &amp;rsquo; -> &rsquo; -> ')
	let prev: string;
	let result = text;
	do {
		prev = result;
		result = result
			.replace(/&#(\d+);/g, (_m, code) =>
				fromCodePointSafe(Number(code)),
			)
			.replace(/&#x([0-9a-f]+);/gi, (_m, code) =>
				fromCodePointSafe(parseInt(code, 16)),
			)
			.replace(/&([a-zA-Z]+);/g, (_m, name) => named[name] ?? _m);
	} while (result !== prev);
	return result;
}

/** Strip HTML tags for plain-text excerpt */
export function stripHtml(html: string): string {
	return (
		decodeEntities(html) // decode first so &#xA; -> \n, &lt; -> <
			.replace(/<[^>]*>/g, "") // then strip any HTML (including decoded &lt;...&gt;)
			.replace(/\s+/g, " ") // then collapse whitespace (catches decoded \n)
			.trim()
	);
}

/** Truncate to ~N characters on word boundary, never inside a surrogate pair. */
export function truncate(text: string, max = 280): string {
	const chars = Array.from(text);
	if (chars.length <= max) return text;
	const truncated = chars.slice(0, max).join("");
	const lastSpace = truncated.lastIndexOf(" ");
	return lastSpace > 0 ? truncated.slice(0, lastSpace) + "…" : truncated + "…";
}

/**
 * Remove characters that XML 1.0 cannot represent: C0 controls other than
 * tab/LF/CR, the two non-characters, and unpaired surrogates.
 */
export function sanitizeXml(text: string): string {
	return text
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
		.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
		.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

/** Normalise a post title, falling back when nothing usable remains. */
export function cleanTitle(title: string | undefined): string {
	const cleaned = sanitizeXml(title ?? "").trim();
	return cleaned || "(untitled)";
}

/** Escape text for use in XML element content or attribute values. */
export function escapeXml(text: string): string {
	return sanitizeXml(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** India Standard Time is a fixed +05:30 offset and has no daylight saving. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

/** Shift an instant so its UTC getters read as IST wall-clock parts. */
function istWallClock(date: Date): Date {
	return new Date(date.getTime() + IST_OFFSET_MS);
}

/** RFC 822 / RFC 1123 date in IST (+0530), as used by RSS 2.0. */
export function toRfc822Ist(date: Date): string {
	const d = istWallClock(date);
	return `${DAY_NAMES[d.getUTCDay()]}, ${pad2(d.getUTCDate())} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} +0530`;
}

/** RFC 3339 date with a fixed +05:30 offset, as used by Atom 1.0. */
export function toRfc3339Ist(date: Date): string {
	const d = istWallClock(date);
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}+05:30`;
}
